// src/notifications/notifications.gateway.ts

import { WebSocketGateway, SubscribeMessage, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
  handleAuthenticate(client: Socket, ...args: any[]): void {
    try {
      const payloadAsString = args[0];
      if (!payloadAsString) throw new Error('Payload vacío recibido.');
      
      const payloadObject = JSON.parse(payloadAsString);
      if (!payloadObject.token) throw new UnauthorizedException('Token no proporcionado.');

      const decodedPayload: JwtPayload = this.jwtService.verify(payloadObject.token);
      const userId = decodedPayload.sub;
      const roles = decodedPayload.roles;

      if (!userId || !roles) throw new UnauthorizedException('Token inválido.');

      connectedClients[userId] = client;
      client.join(`user_${userId}`);
      if (roles.includes('COMPANY_ADMIN')) {
        client.join('room_company_admin');
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
    const request = await this.serviceRequestsService.findActiveRequestByShift(payload.shiftId);
    if (request && request.client) {
      const locationData = { ...payload, timestamp: new Date().toISOString() };
      this.emitAmbulanceLocation(request.client.id, locationData);
    }
  }

  public emitNewServiceRequest(request: any): void {
    this.server.to('room_company_admin').emit('new_service_request', {
      message: '¡Nueva solicitud de emergencia pendiente!',
      requestDetails: request,
    });
  }

  public emitNewMissionToDriver(driverId: number, request: any): void {
    this.server.to(`user_${driverId}`).emit('new_mission', {
      message: '¡Nueva emergencia asignada!',
      requestDetails: request,
    });
  }

  public emitRequestAssignedToClient(clientId: number, request: any): void {
    this.server.to(`user_${clientId}`).emit('request_assigned', {
      message: '¡Tu ambulancia ha sido asignada!',
      requestDetails: request,
    });
  }

  public emitAmbulanceLocation(clientId: number, location: any): void {
    this.server.to(`user_${clientId}`).emit('ambulance_location_updated', location);
  }

  public emitRequestStatusUpdate(clientId: number, request: any): void {
    this.server.to(`user_${clientId}`).emit('request_status_updated', {
      message: `El estado de tu solicitud ahora es: ${request.status}`,
      requestDetails: request,
    });
  }

  public emitRequestCanceledToDriver(driverId: number, request: any): void {
    this.server.to(`user_${driverId}`).emit('request_canceled', {
      message: 'La solicitud de emergencia ha sido cancelada por el cliente.',
      requestDetails: request,
    });
  }
}