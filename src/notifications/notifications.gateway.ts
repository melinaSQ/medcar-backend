import { Injectable } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

//Esta clase contendrá el código para manejar conexiones y emitir eventos. Usaremos el concepto de "Salas" (Rooms) para dirigir los mensajes solo a quien debe recibirlos.

// Diccionario para rastrear qué usuario (por ID) está conectado en qué socket (para mensajes privados)
// { [userId: number]: Socket[] }
const connectedClients: { [userId: number]: Socket[] } = {};

// Gateway principal que maneja todas las conexiones WebSocket
@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*', // Permitir cualquier origen (ajustar en producción)
    credentials: false
  },
})

export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server; // Objeto de servidor Socket.io

  /**
   * Se ejecuta cuando un cliente (Flutter) se conecta por WebSocket.
   */
  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  /**
   * Se ejecuta cuando un cliente (Flutter) se desconecta.
   */
  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
    this.server.emit('driver_disconnected', { id_socket: client.id });

    // Eliminamos el socket de la lista de clientes conectados
    for (const userId in connectedClients) {
      connectedClients[userId] = connectedClients[userId].filter(c => c.id !== client.id);
      if (connectedClients[userId].length === 0) {
        delete connectedClients[userId];
      }
    }

  }

  /**
   * Endpoint de conexión/autenticación del cliente. 
   * El cliente debe llamar a esto después de conectarse con su JWT.
   */
  @SubscribeMessage('authenticate_user')
  //handleAuthenticate(client: Socket, payload: { userId: number, roles: string
  handleAuthenticate(client: Socket, payload: any) {
    // --- PUNTO DE DEPURACIÓN (para entender el problema) ---
    console.log('Payload recibido:', payload);
    console.log('Tipo de payload:', typeof payload);

    let data: { userId: number, roles: string[] };

    // --- ¡AQUÍ ESTÁ LA SOLUCIÓN! ---
    // Comprobamos si el payload es un string y lo parseamos si es necesario.
    if (typeof payload === 'string') {
      try {
        data = JSON.parse(payload);
      } catch (error) {
        console.error('Error al parsear el payload JSON:', error);
        return; // Detenemos la ejecución si el JSON es inválido
      }
    } else {
      data = payload; // Si ya es un objeto, lo usamos directamente
    }

    const { userId, roles } = data;

    // Verificación de seguridad: Asegurarse de que los datos existen después de parsear
    if (!userId || !roles) {
      console.error('Payload inválido después de parsear. Faltan userId o roles.');
      return;
    }
    // 1. Asignar el socket al ID de usuario para mensajes privados
    if (!connectedClients[userId]) {
      connectedClients[userId] = [];
    }
    connectedClients[userId].push(client);

    // 2. Unir el socket a las 'salas' de notificaciones
    client.join(`user_${userId}`); // Sala privada para el usuario (para notificaciones directas)

    // 3. Unir a salas basadas en roles (para notificaciones masivas)
    if (roles.includes('ADMIN')) {
      client.join('room_admin');
    }
    if (roles.includes('COMPANY_ADMIN')) {
      client.join('room_company_admin');
    }
    // Podrías tener una lógica aquí para unir a salas por companyId si fuera necesario

    console.log(`Usuario ${userId} autenticado en WebSocket. Roles: ${roles.join(', ')}`);
  }

  // ----------------------------------------------------------------------
  // MÉTODOS DE EMISIÓN DE EVENTOS (Llamados desde los servicios)
  // ----------------------------------------------------------------------

  /**
   * Emite una notificación de nueva solicitud a todos los COMPANY_ADMIN.
   * @param requestId ID de la nueva solicitud.
   */
  public emitNewServiceRequest(requestId: number) {
    console.log(`Emitting new_request for: ${requestId}`);
    // Envía el evento a todos los sockets que están en la sala 'room_company_admin'
    this.server.to('room_company_admin').emit('new_service_request', {
      message: '¡Nueva solicitud de emergencia pendiente!',
      requestId: requestId,
    });
  }

  /**
   * Emite las coordenadas de la ambulancia al cliente.
   * @param clientId ID del cliente que debe recibir la actualización.
   * @param location Datos de la ubicación.
   */
  public emitAmbulanceLocation(clientId: number, location: any) {
    // Envía el evento a la sala privada del usuario cliente
    this.server.to(`user_${clientId}`).emit('ambulance_location_updated', location);
  }

  /**
   * Endpoint que recibe la ubicación en tiempo real del conductor.
   */
  @SubscribeMessage('update_location')
  handleLocationUpdate(client: Socket, payload: { shiftId: number, lat: number, lon: number }) {
    const { shiftId, lat, lon } = payload;

    // 1. Simular la lógica para saber a qué cliente enviársela.
    //    En un sistema real, este código haría una consulta rápida a la BD para 
    //    ver a qué ServiceRequest (y por lo tanto a qué Cliente) está asignado este shiftId.

    // LÓGICA SIMULADA (La lógica real iría en un servicio inyectado)
    // Supongamos que la lógica dice que el cliente 14 está esperando.
    const hardcodedClientId = 14;

    const locationData = {
      shiftId,
      lat,
      lon,
      timestamp: new Date().toISOString(),
    };

    // 2. Retransmitir al cliente que está esperando
    this.emitAmbulanceLocation(hardcodedClientId, locationData);

    // En un sistema real, el código sería:
    // const request = await this.serviceRequestsService.findActiveRequestByShift(shiftId);
    // if (request) { this.emitAmbulanceLocation(request.client.id, locationData); }
  }

  /**
   * Notifica a un conductor específico que se le ha asignado una nueva misión.
   * @param driverId - El ID del usuario conductor.
   * @param request - El objeto completo de la solicitud de servicio.
   */
  public emitNewMissionToDriver(driverId: number, request: any) {
    this.server.to(`user_${driverId}`).emit('new_mission', {
      message: '¡Nueva emergencia asignada!',
      requestDetails: request,
    });
    console.log(`Notificación 'new_mission' enviada al conductor ${driverId}`);
  }

  /**
   * Notifica a un cliente específico que su solicitud ha sido aceptada.
   * @param clientId - El ID del usuario cliente.
   * @param request - El objeto completo de la solicitud de servicio (con datos del turno).
   */
  public emitRequestAssignedToClient(clientId: number, request: any) {
    this.server.to(`user_${clientId}`).emit('request_assigned', {
      message: '¡Tu ambulancia ha sido asignada y está en camino!',
      requestDetails: request,
    });
    console.log(`Notificación 'request_assigned' enviada al cliente ${clientId}`);
  }


}
