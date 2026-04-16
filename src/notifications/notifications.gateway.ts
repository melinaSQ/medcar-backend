// src/notifications/notifications.gateway.ts

import { WebSocketGateway, SubscribeMessage, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { JwtPayload } from 'src/auth/jwt/jwt.strategy';
import { ServiceRequestsService } from 'src/service_requests/service_requests.service';

const connectedClients: { [userId: number]: Socket } = {};

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => ServiceRequestsService))
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
    for (const userId in connectedClients) {
      if (connectedClients[userId].id === client.id) {
        delete connectedClients[userId];
        console.log(`Usuario ${userId} desconectado.`);
        break;
      }
    }
  }

  @SubscribeMessage('authenticate')
  async handleAuthenticate(client: Socket, ...args: any[]): Promise<void> {
    try {
      const payloadAsString = args[0];
      if (!payloadAsString) throw new Error('Payload vacío recibido.');
      
      const payloadObject = JSON.parse(payloadAsString);
      if (!payloadObject.token) throw new UnauthorizedException('Token no proporcionado.');

      const decodedPayload: JwtPayload = this.jwtService.verify(payloadObject.token);
      const userId = decodedPayload.sub;
      const roles = decodedPayload.roles;

      if (!userId || !roles) throw new UnauthorizedException('Token inválido.');

      const user = await this.userRepository.findOneBy({ id: userId });
      if (!user) {
        client.emit('unauthorized', { message: 'Usuario no encontrado.' });
        client.disconnect();
        return;
      }
      if (user.isBlocked) {
        client.emit('unauthorized', {
          message: 'Tu cuenta ha sido suspendida. Contacta al administrador.',
        });
        client.disconnect();
        return;
      }

      connectedClients[userId] = client;
      client.join(`user_${userId}`);
      if (roles.includes('COMPANY_ADMIN')) {
        client.join('room_company_admin');
      }
      if (roles.includes('ADMIN') || roles.includes('SYSTEM_ADMIN')) {
        client.join('room_system_admin');
      }

      console.log(`Usuario ${userId} autenticado en WebSocket. Roles: ${roles.join(', ')}`);
      client.emit('authenticated', { message: 'Autenticación exitosa.' });
    } catch (error) {
      console.error('Error de autenticación en WebSocket:', error.message);
      client.emit('unauthorized', { message: 'Token inválido o expirado.' });
      client.disconnect();
    }
  }

  @SubscribeMessage('update_location')
  async handleLocationUpdate(client: Socket, payload: { shiftId: number; lat: number; lon: number }): Promise<void> {
    console.log(`📍 Ubicación recibida: shiftId=${payload.shiftId}, lat=${payload.lat}, lon=${payload.lon}`);
    
    const request = await this.serviceRequestsService.findActiveRequestByShift(payload.shiftId);
    console.log(`📍 Solicitud activa para shift ${payload.shiftId}:`, request ? `ID ${request.id}, clientId ${request.client?.id}` : 'No encontrada');
    
    if (request && request.client) {
      const locationData = { ...payload, timestamp: new Date().toISOString() };
      console.log(`📍 Enviando ubicación a cliente ${request.client.id}`);
      this.emitAmbulanceLocation(request.client.id, locationData);
    }
  }

  public emitNewServiceRequest(request: any): void {
    this.server.to('room_company_admin').emit('new_service_request', {
      message: '¡Nueva solicitud de emergencia pendiente!',
      requestDetails: request,
    });
  }

  /**
   * Notifica a administradores del sistema para refrescar colas (empresas pendientes, cambios de contacto).
   */
  public emitSystemAdminQueuesUpdated(reason: string): void {
    this.server.to('room_system_admin').emit('admin_queues_updated', {
      reason,
      at: new Date().toISOString(),
    });
  }

  /**
   * El cliente debe refrescar perfil (p. ej. tras aprobar/rechazar cambio de contacto).
   */
  public emitUserProfileUpdated(userId: number, reason: string): void {
    this.server.to(`user_${userId}`).emit('user_profile_updated', {
      reason,
      at: new Date().toISOString(),
    });
  }

  /** Cierra sockets del usuario (p. ej. tras bloqueo). */
  public disconnectUserSockets(userId: number): void {
    try {
      this.server.in(`user_${userId}`).disconnectSockets(true);
    } catch (e) {
      console.error('disconnectUserSockets', e);
    }
  }

  public emitNewMissionToDriver(driverId: number, request: any): void {
    this.server.to(`user_${driverId}`).emit('new_mission', {
      message: '¡Nueva emergencia asignada!',
      requestDetails: request,
    });
  }

  public emitRequestAssignedToClient(clientId: number, request: any): void {
    // Notificar al cliente
    this.server.to(`user_${clientId}`).emit('request_assigned', {
      message: '¡Tu ambulancia ha sido asignada!',
      requestDetails: request,
    });
    
    // Notificar también a los admins para actualización en tiempo real
    this.server.to('room_company_admin').emit('request_assigned', {
      message: 'Solicitud asignada',
      requestDetails: request,
    });
  }

  public emitAmbulanceLocation(clientId: number, location: any): void {
    this.server.to(`user_${clientId}`).emit('ambulance_location_updated', location);
  }

  public emitRequestStatusUpdate(clientId: number, request: any): void {
    // Notificar al cliente
    this.server.to(`user_${clientId}`).emit('request_status_updated', {
      message: `El estado de tu solicitud ahora es: ${request.status}`,
      requestDetails: request,
    });
    
    // Notificar también a los admins para actualización en tiempo real
    this.server.to('room_company_admin').emit('request_status_updated', {
      message: `Estado actualizado: ${request.status}`,
      requestDetails: request,
    });
  }

  public emitRequestCanceledToDriver(driverId: number, request: any): void {
    // Notificar al conductor
    this.server.to(`user_${driverId}`).emit('request_canceled', {
      message: 'La solicitud de emergencia ha sido cancelada por el cliente.',
      requestDetails: request,
    });
    
    // Notificar también a los admins para actualización en tiempo real
    this.server.to('room_company_admin').emit('request_canceled', {
      message: 'Solicitud cancelada',
      requestDetails: request,
    });
  }

  /**
   * Emite un evento cuando se crea una nueva calificación
   * Notifica al conductor calificado y al admin de la empresa
   */
  public emitRatingCreated(rating: any): void {
    console.log('⭐ Emitiendo evento rating_created:', JSON.stringify(rating, null, 2));
    const ratedUserId = rating.rated?.id || rating.rated_user_id;
    const companyUserId = rating.serviceRequest?.shift?.ambulance?.company?.user?.id;

    console.log(`⭐ ratedUserId: ${ratedUserId}, companyUserId: ${companyUserId}`);

    // Notificar al usuario calificado (conductor)
    if (ratedUserId) {
      console.log(`⭐ Enviando rating_created a user_${ratedUserId}`);
      this.server.to(`user_${ratedUserId}`).emit('rating_created', {
        message: 'Has recibido una nueva calificación',
        rating: rating,
      });
    }

    // Notificar al admin de la empresa para actualizar promedios
    if (companyUserId) {
      console.log(`⭐ Enviando rating_created a user_${companyUserId} y room_company_admin`);
      this.server.to(`user_${companyUserId}`).emit('rating_created', {
        message: 'Nueva calificación recibida',
        rating: rating,
      });
      // También emitir a la sala de admins
      this.server.to('room_company_admin').emit('rating_created', {
        message: 'Nueva calificación recibida',
        rating: rating,
      });
    } else {
      console.log('⚠️ companyUserId es null o undefined');
    }
  }
}