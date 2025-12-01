//import { WebSocketGateway, SubscribeMessage, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/platform-socket.io';
import { Server, Socket } from 'socket.io';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/auth/jwt/jwt.strategy'; // Asegúrate de que este path sea correcto
import { WebSocketGateway, SubscribeMessage, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { ServiceRequestsService } from 'src/service_requests/service_requests.service';

// Este diccionario debe estar FUERA de la clase para que sea un estado global del servidor
const connectedClients: { [userId: number]: Socket } = {};

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()

  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly serviceRequestsService: ServiceRequestsService,
  ) { }

  /**
   * Se ejecuta cuando un cliente se conecta.
   */
  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  /**
   * Se ejecuta cuando un cliente se desconecta.
   */
  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);

    // Eliminamos el socket del diccionario de clientes conectados
    for (const userId in connectedClients) {
      if (connectedClients[userId].id === client.id) {
        delete connectedClients[userId];
        console.log(`Usuario ${userId} eliminado de la lista de clientes conectados.`);
        break; // Salimos del bucle una vez encontrado
      }
    }
  }

  /**
   * Endpoint de autenticación del socket. 
   * El cliente debe enviar su token JWT para identificarse.
   */
  @SubscribeMessage('authenticate')
  handleAuthenticate(client: Socket, ...args: any[]): void { // <-- CAMBIO #1: Usar '...args'
    try {
      // --- PUNTO DE DEPURACIÓN ---
      console.log('Argumentos recibidos en "authenticate":', args);

      // 1. Obtenemos el primer argumento, que sabemos que es el payload en formato string.
      const payloadAsString = args[0];

      // 2. Verificamos que no sea nulo o vacío ANTES de parsearlo.
      if (!payloadAsString) {
        throw new Error('Payload vacío recibido.');
      }

      // 3. Convertimos (parseamos) la cadena de texto a un objeto JavaScript.
      const payloadObject = JSON.parse(payloadAsString);

      // 4. AHORA SÍ, verificamos la propiedad .token en el OBJETO.
      if (!payloadObject.token) {
        throw new UnauthorizedException('Token no proporcionado en el payload.');
      }

      const decodedPayload: JwtPayload = this.jwtService.verify(payloadObject.token);
      const userId = decodedPayload.sub;
      const roles = decodedPayload.roles;

      if (!userId || !roles) {
        throw new UnauthorizedException('Token inválido');
      }

      // El resto de la lógica no cambia...
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


  /**
   * Endpoint que recibe la ubicación en tiempo real del conductor.
   */
  @SubscribeMessage('update_location')
  async handleLocationUpdate(client: Socket, payload: { shiftId: number; lat: number; lon: number }): Promise<void> {
    const { shiftId, lat, lon } = payload;

    // ¡LÓGICA REAL!
    // 1. Buscamos la solicitud activa para este turno.
    const request = await this.serviceRequestsService.findActiveRequestByShift(shiftId);

    // 2. Si existe una solicitud activa y tiene un cliente asociado...
    if (request && request.client) {
      const locationData = { shiftId, lat, lon, timestamp: new Date().toISOString() };

      // 3. ...retransmitimos la ubicación a ese cliente específico.
      this.emitAmbulanceLocation(request.client.id, locationData);
    }
  }


  // --- MÉTODOS PÚBLICOS PARA SER LLAMADOS DESDE OTROS SERVICIOS ---

  public emitNewServiceRequest(request: any) { // <-- Aceptamos el objeto completo
    console.log(`Emitting new_request for: ${request.id}`);
    this.server.to('room_company_admin').emit('new_service_request', {
      message: '¡Nueva solicitud de emergencia pendiente!',
      request: request, // <-- Enviamos el objeto completo al frontend
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
      message: '¡Tu ambulancia ha sido asignada y está en camino!',
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
}