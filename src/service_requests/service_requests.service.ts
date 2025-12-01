import { ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ServiceRequest } from './service_request.entity';
import { Shift } from 'src/shifts/shift.entity';
import { Company } from 'src/companies/company.entity';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { ServiceRequestStatus } from 'src/common/enums/service-request-status.enum';
import { AssignRequestDto } from './dto/assign-request.dto';
import type { Point } from 'geojson';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';


@Injectable()
export class ServiceRequestsService {
    constructor(
        @InjectRepository(ServiceRequest)
        private readonly serviceRequestRepository: Repository<ServiceRequest>,
        @InjectRepository(Shift)
        private readonly shiftRepository: Repository<Shift>,
        @InjectRepository(Company)
        private readonly companyRepository: Repository<Company>,
        private readonly notificationsGateway: NotificationsGateway,
    ) { }

    async create(createDto: CreateServiceRequestDto, clientId: number): Promise<ServiceRequest> {
        console.log('--- 1. INICIANDO MÉTODO CREATE ---');
        console.log('Datos recibidos (DTO):', createDto);
        console.log('ID del Cliente:', clientId);



        // Validar si el cliente ya tiene una solicitud activa
        try {
            console.log('--- 2. BUSCANDO SOLICITUDES ACTIVAS ---');
            const activeRequest = await this.serviceRequestRepository.findOne({
                where: {
                    client: { id: clientId },
                    status: In([
                        ServiceRequestStatus.SEARCHING,
                        ServiceRequestStatus.ASSIGNED,
                        ServiceRequestStatus.ON_THE_WAY,
                        ServiceRequestStatus.ON_SITE,
                        ServiceRequestStatus.TRAVELLING,
                    ]),
                },
            });

            if (activeRequest) {
                console.log('--- ERROR: Solicitud activa encontrada ---');
                throw new ConflictException('Ya tienes una solicitud de emergencia activa.');
            }
        } catch (error) {
            console.error('--- ERROR DURANTE LA BÚSQUEDA DE SOLICITUDES ACTIVAS ---', error);
            throw error; // Vuelve a lanzar el error para que NestJS lo maneje
        }

        console.log('--- 3. TRANSFORMANDO COORDENADAS ---');
        // Transformar coordenadas para el tipo Point
        const originLocation: Point = {
            type: 'Point',
            coordinates: [createDto.longitude, createDto.latitude],
        };

        try {
            console.log('--- 4. CREANDO LA ENTIDAD (ANTES DE GUARDAR) ---');
            const newRequest = this.serviceRequestRepository.create({
                emergencyType: createDto.emergencyType,
                originDescription: createDto.originDescription,
                client: { id: clientId },
                originLocation: originLocation,
                // No pasamos el ...createDto completo por si acaso
            });

            console.log('--- 5. A PUNTO DE GUARDAR EN LA BD ---');
            console.log('Objeto a guardar:', newRequest);

            const savedRequest = await this.serviceRequestRepository.save(newRequest);
            this.notificationsGateway.emitNewServiceRequest(savedRequest.id);

            console.log('--- 6. ¡GUARDADO CON ÉXITO! ---');
            console.log('TODO: Notificar a los admins por WebSocket sobre la nueva solicitud:', savedRequest.id);

            // REEMPLAZA EL CONSOLE.LOG CON ESTO:
            this.notificationsGateway.emitNewServiceRequest(savedRequest); // Envía el objeto completo, es más útil

            return savedRequest;

        } catch (error) {
            console.error('--- ERROR DURANTE LA CREACIÓN O GUARDADO DE LA ENTIDAD ---', error);
            // Este es el error que probablemente estás viendo en tu consola
            throw new InternalServerErrorException('Error al guardar la solicitud.');
        }
    }

    /**
   * Encuentra todas las solicitudes de servicio que están pendientes de asignación.
   * @returns Un array de entidades ServiceRequest.
   */
    async findAllPending(): Promise<ServiceRequest[]> {
        return this.serviceRequestRepository.find({
            where: { status: ServiceRequestStatus.SEARCHING },
            // Cargamos la relación con el cliente para mostrar sus datos en el frontend
            relations: ['client'],
        });
    }

    /**
   * Asigna un turno (conductor + ambulancia) a una solicitud de servicio pendiente.
   * @param assignDto - Contiene el requestId y el shiftId.
   * @param adminUserId - El ID del COMPANY_ADMIN que realiza la acción.
   * @returns La solicitud de servicio actualizada.
   */
    async assign(assignDto: AssignRequestDto, adminUserId: number): Promise<ServiceRequest> {
        const { requestId, shiftId } = assignDto;

        const adminCompany = await this.companyRepository.findOneBy({ user: { id: adminUserId } });
        if (!adminCompany) {
            throw new UnauthorizedException('No estás autorizado para asignar solicitudes.');
        }

        const [request, shift] = await Promise.all([
            //socket ¡IMPORTANTE! Al buscar la solicitud, ahora también cargamos el cliente.
            this.serviceRequestRepository.findOne({ where: { id: requestId }, relations: ['client'] }),
            //socket ¡IMPORTANTE! Al buscar el turno, ahora también cargamos el conductor.
            this.shiftRepository.findOne({ where: { id: shiftId }, relations: ['ambulance.company', 'driver'] }),
        ]);

        if (!request) throw new NotFoundException(`Solicitud con ID ${requestId} no encontrada.`);
        if (!shift) throw new NotFoundException(`Turno con ID ${shiftId} no encontrado.`);
        if (request.status !== ServiceRequestStatus.SEARCHING) {
            throw new ConflictException(`La solicitud ${requestId} ya no está pendiente de asignación.`);
        }
        if (!shift.isActive) {
            throw new ConflictException(`El turno ${shiftId} ya no está activo.`);
        }
        if (shift.ambulance.company.id !== adminCompany.id) {
            throw new UnauthorizedException(`El turno ${shiftId} no pertenece a tu compañía.`);
        }

        // --- ¡NUEVA VALIDACIÓN DE CONCURRENCIA! ---
        const isShiftAlreadyAssigned = await this.serviceRequestRepository.findOneBy({
            shift: { id: shiftId },
            status: In([
                ServiceRequestStatus.ASSIGNED,
                ServiceRequestStatus.ON_THE_WAY,
                ServiceRequestStatus.ON_SITE,
                ServiceRequestStatus.TRAVELLING
            ]),
        });

        if (isShiftAlreadyAssigned) {
            throw new ConflictException(`El turno ${shiftId} ya está atendiendo otra emergencia.`);
        }

        request.shift = shift;
        request.status = ServiceRequestStatus.ASSIGNED;
        const updatedRequest = await this.serviceRequestRepository.save(request);

        // --- ¡AQUÍ ESTÁ LA NUEVA LÓGICA DE NOTIFICACIÓN! ---

        // 1. Notificar al CONDUCTOR
        //    Verificamos que el turno tenga un conductor asociado antes de notificar.
        if (shift && shift.driver && shift.driver.id) {
            // Le enviamos la notificación de 'nueva misión' a su sala privada.
            this.notificationsGateway.emitNewMissionToDriver(shift.driver.id, updatedRequest);
        }

        // 2. Notificar al CLIENTE
        //    Verificamos que la solicitud tenga un cliente asociado.
        if (request && request.client && request.client.id) {
            // Le enviamos la notificación de 'solicitud asignada' a su sala privada.
            this.notificationsGateway.emitRequestAssignedToClient(request.client.id, updatedRequest);

            console.log(`TODO: Notificar al cliente y al conductor sobre la asignación.`);
        }

        return updatedRequest;
    }

    /**
   * Encuentra la solicitud activa asociada a un turno específico.
   * @param shiftId El ID del turno.
   * @returns La entidad ServiceRequest con la relación de cliente cargada.
   */
    async findActiveRequestByShift(shiftId: number): Promise<ServiceRequest | null> {
        return this.serviceRequestRepository.findOne({
            where: {
                shift: { id: shiftId },
                status: In([
                    ServiceRequestStatus.ASSIGNED,
                    ServiceRequestStatus.ON_THE_WAY,
                    ServiceRequestStatus.ON_SITE,
                    ServiceRequestStatus.TRAVELLING,
                ]),
            },
            relations: ['client'], // ¡Crucial para obtener el ID del cliente!
        });
    }

    /**
   * Actualiza el estado de una solicitud de servicio.
   * Utilizado por el conductor para notificar su progreso.
   * @param requestId - ID de la solicitud a actualizar.
   * @param newStatus - El nuevo estado.
   * @param driverId - ID del conductor que realiza la acción (para seguridad).
   * @returns La solicitud actualizada.
   */
    async updateStatus(requestId: number, newStatus: ServiceRequestStatus, driverId: number): Promise<ServiceRequest> {
        // 1. Busca la solicitud, asegurándose de que le pertenece al conductor que hace la petición.
        const request = await this.serviceRequestRepository.findOne({
            where: {
                id: requestId,
                shift: { driver: { id: driverId } },
            },
            relations: ['client', 'shift', 'shift.driver'],
        });

        if (!request) {
            throw new NotFoundException(`No se encontró una solicitud activa con ID ${requestId} para este conductor.`);
        }

        // 2. Actualiza el estado y guarda.
        request.status = newStatus;
        const updatedRequest = await this.serviceRequestRepository.save(request);

        // 3. Notifica al cliente sobre el cambio de estado.
        if (updatedRequest.client) {
            this.notificationsGateway.emitRequestStatusUpdate(updatedRequest.client.id, updatedRequest);
        }

        return updatedRequest;
    }
}