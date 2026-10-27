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
import { Company } from 'src/companies/company.entity';
import { ShiftsService } from 'src/shifts/shifts.service';
import { Rol } from 'src/common/enums/rol.enum';

const connectedClients: { [userId: number]: Socket } = {};

const privateSocketFields = new Set([
  'password',
  'notificationToken',
  'pendingEmail',
  'pendingPhone',
  'contactChangeRequestedAt',
]);

function sanitizeSocketPayload<T>(payload: T): T {
  return JSON.parse(
    JSON.stringify(payload, (key, value) =>
      privateSocketFields.has(key) ? undefined : value,
    ),
  ) as T;
}

/** Roles desde TypeORM simple-json: a veces llegan como string JSON o null; evita fallar en .join / .includes. */
function normalizeUserRoles(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((r) => String(r));
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((r) => String(r));
      }
    } catch {
      /* continuar */
    }
    const t = raw.trim();
    if (!t) return [];
    return t.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

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
    @InjectRepository(Company) private readonly companyRepository: Repository<Company>,
    @Inject(forwardRef(() => ServiceRequestsService))
    private readonly serviceRequestsService: ServiceRequestsService,
    private readonly shiftsService: ShiftsService,
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
      const raw = args[0];
      if (raw == null) throw new Error('Payload vacío recibido.');

      let token: string;
      if (typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        token = parsed?.token;
      } else if (typeof raw === 'object' && raw !== null && 'token' in raw) {
        token = String((raw as { token?: unknown }).token ?? '');
      } else {
        throw new Error('Formato authenticate no reconocido (use { token } o JSON string).');
      }

      if (!token) throw new UnauthorizedException('Token no proporcionado.');

      const decodedPayload: JwtPayload = this.jwtService.verify(token);
      const userId = Number(decodedPayload.sub);

      if (!Number.isFinite(userId) || userId <= 0) {
        throw new UnauthorizedException('Token inválido.');
      }

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

      const roles = normalizeUserRoles(user.roles);

      connectedClients[userId] = client;
      client.join(`user_${userId}`);
      if (roles.includes(Rol.COMPANY_ADMIN)) {
        client.join('room_company_admin');
        const company = await this.companyRepository.findOneBy({
          user: { id: userId },
        });
        if (company) {
          client.join(`room_company_${company.id}`);
        }
      }
      if (
        roles.includes(Rol.ADMIN) ||
        roles.some((r) => String(r).toUpperCase() === 'SYSTEM_ADMIN')
      ) {
        client.join('room_system_admin');
      }

      console.log(
        `Usuario ${userId} autenticado en WebSocket. Roles: ${roles.length ? roles.join(', ') : '(ninguno)'}`,
      );
      client.emit('authenticated', { message: 'Autenticación exitosa.' });
    } catch (error) {
      console.error('Error de autenticación en WebSocket:', error.message);
      client.emit('unauthorized', { message: 'Token inválido o expirado.' });
      client.disconnect();
    }
  }

  @SubscribeMessage('update_location')
  async handleLocationUpdate(client: Socket, payload: unknown): Promise<void> {
    const raw = Array.isArray(payload) ? (payload as unknown[])[0] : payload;
    const p = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const shiftId = Number(p['shiftId']);
    const lat = Number(p['lat']);
    const lon = Number(p['lon'] ?? p['lng']);

    if (!Number.isFinite(shiftId) || shiftId <= 0 || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      console.warn('📍 update_location: payload inválido', raw);
      return;
    }

    console.log(`📍 Ubicación recibida: shiftId=${shiftId}, lat=${lat}, lon=${lon}`);

    const locationData = {
      shiftId,
      lat,
      lon,
      timestamp: new Date().toISOString(),
    };

    await this.shiftsService.updateLastKnownLocation(shiftId, lat, lon);

    const ctx = await this.shiftsService.getShiftBroadcastContext(shiftId);
    if (ctx) {
      this.server.to(`room_company_${ctx.companyId}`).emit('company_ambulance_location', {
        ...locationData,
        plate: ctx.plate,
      });
    }

    const request = await this.serviceRequestsService.findActiveRequestByShift(shiftId);
    console.log(`📍 Solicitud activa para shift ${shiftId}:`, request ? `ID ${request.id}, clientId ${request.client?.id}` : 'No encontrada');

    if (request && request.client) {
      console.log(`📍 Enviando ubicación a cliente ${request.client.id}`);
      this.emitAmbulanceLocation(request.client.id, locationData);
    }
  }

  public emitNewServiceRequest(request: any): void {
    const safeRequest = sanitizeSocketPayload(request);
    this.server.to('room_company_admin').emit('new_service_request', {
      message: '¡Nueva solicitud de emergencia pendiente!',
      requestDetails: safeRequest,
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
    const safeRequest = sanitizeSocketPayload(request);
    this.server.to(`user_${driverId}`).emit('new_mission', {
      message: '¡Nueva emergencia asignada!',
      requestDetails: safeRequest,
    });
  }

  public emitRequestAssignedToClient(clientId: number, request: any): void {
    const safeRequest = sanitizeSocketPayload(request);
    // Notificar al cliente
    this.server.to(`user_${clientId}`).emit('request_assigned', {
      message: '¡Tu ambulancia ha sido asignada!',
      requestDetails: safeRequest,
    });
    
    // Notificar también a los admins para actualización en tiempo real
    this.server.to('room_company_admin').emit('request_assigned', {
      message: 'Solicitud asignada',
      requestDetails: safeRequest,
    });
  }

  public emitAmbulanceLocation(clientId: number, location: any): void {
    const room = `user_${Number(clientId)}`;
    console.log(`📡 ambulance_location_updated → ${room}`, location);
    this.server.to(room).emit('ambulance_location_updated', location);
  }

  public emitRequestStatusUpdate(clientId: number, request: any): void {
    const safeRequest = sanitizeSocketPayload(request);
    // Notificar al cliente
    this.server.to(`user_${clientId}`).emit('request_status_updated', {
      message: `El estado de tu solicitud ahora es: ${request.status}`,
      requestDetails: safeRequest,
    });
    
    // Notificar también a los admins para actualización en tiempo real
    this.server.to('room_company_admin').emit('request_status_updated', {
      message: `Estado actualizado: ${request.status}`,
      requestDetails: safeRequest,
    });
  }

  public emitRequestCanceledToDriver(driverId: number, request: any): void {
    const safeRequest = sanitizeSocketPayload(request);
    // Notificar al conductor
    this.server.to(`user_${driverId}`).emit('request_canceled', {
      message: 'La solicitud de emergencia ha sido cancelada por el cliente.',
      requestDetails: safeRequest,
    });
    
    // Notificar también a los admins para actualización en tiempo real
    this.server.to('room_company_admin').emit('request_canceled', {
      message: 'Solicitud cancelada',
      requestDetails: safeRequest,
    });
  }

  /**
   * Emite un evento cuando se crea una nueva calificación
   * Notifica al conductor calificado y al admin de la empresa
   */
  public emitRatingCreated(rating: any): void {
    const safeRating = sanitizeSocketPayload(rating);
    const ratedUserId = rating.rated?.id || rating.rated_user_id;
    const companyUserId = rating.serviceRequest?.shift?.ambulance?.company?.user?.id;

    console.log(`⭐ ratedUserId: ${ratedUserId}, companyUserId: ${companyUserId}`);

    // Notificar al usuario calificado (conductor)
    if (ratedUserId) {
      console.log(`⭐ Enviando rating_created a user_${ratedUserId}`);
      this.server.to(`user_${ratedUserId}`).emit('rating_created', {
        message: 'Has recibido una nueva calificación',
        rating: safeRating,
      });
    }

    // Notificar al admin de la empresa para actualizar promedios
    if (companyUserId) {
      console.log(`⭐ Enviando rating_created a user_${companyUserId} y room_company_admin`);
      this.server.to(`user_${companyUserId}`).emit('rating_created', {
        message: 'Nueva calificación recibida',
        rating: safeRating,
      });
      // También emitir a la sala de admins
      this.server.to('room_company_admin').emit('rating_created', {
        message: 'Nueva calificación recibida',
        rating: safeRating,
      });
    } else {
      console.log('⚠️ companyUserId es null o undefined');
    }
  }
}
