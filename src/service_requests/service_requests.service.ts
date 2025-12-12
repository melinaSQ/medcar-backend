// src/service-requests/service-requests.service.ts

import { ConflictException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ServiceRequest } from './service_request.entity';
import { Shift } from 'src/shifts/shift.entity';
import { Company } from 'src/companies/company.entity';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { ServiceRequestStatus } from 'src/common/enums/service-request-status.enum';
import { AssignRequestDto } from './dto/assign-request.dto';
import { Point } from 'geojson';
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
        @Inject(forwardRef(() => NotificationsGateway))
        private readonly notificationsGateway: NotificationsGateway,
    ) { }

    async create(createDto: CreateServiceRequestDto, clientId: number): Promise<ServiceRequest> {
        const activeRequest = await this.serviceRequestRepository.findOne({
            where: {
                client: { id: clientId },
                status: In([
                    ServiceRequestStatus.SEARCHING, ServiceRequestStatus.ASSIGNED,
                    ServiceRequestStatus.ON_THE_WAY, ServiceRequestStatus.ON_SITE,
                    ServiceRequestStatus.TRAVELLING,
                ]),
            },
        });

        if (activeRequest) {
            throw new ConflictException('Ya tienes una solicitud de emergencia activa.');
        }

        const originLocation: Point = {
            type: 'Point',
            coordinates: [createDto.longitude, createDto.latitude],
        };

        const newRequest = this.serviceRequestRepository.create({
            ...createDto,
            client: { id: clientId },
            originLocation: originLocation,
        });

        const savedRequest = await this.serviceRequestRepository.save(newRequest);
        
        // Notificamos a los admins
        this.notificationsGateway.emitNewServiceRequest(savedRequest);

        return savedRequest;
    }

    async findAllPending(): Promise<ServiceRequest[]> {
        return this.serviceRequestRepository.find({
            where: { status: ServiceRequestStatus.SEARCHING },
            relations: ['client'],
        });
    }

    async assign(assignDto: AssignRequestDto, adminUserId: number): Promise<ServiceRequest> {
        const { requestId, shiftId } = assignDto;

        const adminCompany = await this.companyRepository.findOneBy({ user: { id: adminUserId } });
        if (!adminCompany) throw new UnauthorizedException('No estás autorizado para asignar solicitudes.');

        const [request, shift] = await Promise.all([
            this.serviceRequestRepository.findOne({ where: { id: requestId }, relations: ['client'] }),
            this.shiftRepository.findOne({ where: { id: shiftId }, relations: ['ambulance.company', 'driver'] }),
        ]);

        if (!request) throw new NotFoundException(`Solicitud con ID ${requestId} no encontrada.`);
        if (!shift) throw new NotFoundException(`Turno con ID ${shiftId} no encontrado.`);
        if (request.status !== ServiceRequestStatus.SEARCHING) throw new ConflictException(`La solicitud ${requestId} ya no está pendiente.`);
        if (!shift.isActive) throw new ConflictException(`El turno ${shiftId} ya no está activo.`);
        if (shift.ambulance.company.id !== adminCompany.id) throw new UnauthorizedException(`El turno no pertenece a tu compañía.`);

        const isShiftAlreadyAssigned = await this.serviceRequestRepository.findOneBy({
            shift: { id: shiftId },
            status: In([ServiceRequestStatus.ASSIGNED, ServiceRequestStatus.ON_THE_WAY, ServiceRequestStatus.ON_SITE, ServiceRequestStatus.TRAVELLING]),
        });
        if (isShiftAlreadyAssigned) throw new ConflictException(`El turno ${shiftId} ya está en otra emergencia.`);

        request.shift = shift;
        request.status = ServiceRequestStatus.ASSIGNED;
        const updatedRequest = await this.serviceRequestRepository.save(request);

        if (shift.driver?.id) {
            this.notificationsGateway.emitNewMissionToDriver(shift.driver.id, updatedRequest);
        }
        if (request.client?.id) {
            this.notificationsGateway.emitRequestAssignedToClient(request.client.id, updatedRequest);
        }

        return updatedRequest;
    }

    async findActiveRequestByShift(shiftId: number): Promise<ServiceRequest | null> {
        return this.serviceRequestRepository.findOne({
            where: {
                shift: { id: shiftId },
                status: In([ServiceRequestStatus.ASSIGNED, ServiceRequestStatus.ON_THE_WAY, ServiceRequestStatus.ON_SITE, ServiceRequestStatus.TRAVELLING]),
            },
            relations: ['client'],
        });
    }

    async updateStatus(requestId: number, newStatus: ServiceRequestStatus, driverId: number): Promise<ServiceRequest> {
        const request = await this.serviceRequestRepository.findOne({
            where: { id: requestId, shift: { driver: { id: driverId } } },
            relations: ['client', 'shift', 'shift.driver'],
        });

        if (!request) throw new NotFoundException(`No se encontró una solicitud activa con ID ${requestId} para este conductor.`);

        request.status = newStatus;
        const updatedRequest = await this.serviceRequestRepository.save(request);

        if (updatedRequest.client) {
            this.notificationsGateway.emitRequestStatusUpdate(updatedRequest.client.id, updatedRequest);
        }

        return updatedRequest;
    }

    async cancel(requestId: number, clientId: number): Promise<ServiceRequest> {
        const request = await this.serviceRequestRepository.findOne({
            where: { id: requestId, client: { id: clientId } },
            relations: ['client', 'shift', 'shift.driver'],
        });

        if (!request) {
            throw new NotFoundException(`Solicitud con ID ${requestId} no encontrada.`);
        }

        // Solo permite cancelar si está en SEARCHING o ASSIGNED
        if (![ServiceRequestStatus.SEARCHING, ServiceRequestStatus.ASSIGNED].includes(request.status)) {
            throw new ConflictException('No se puede cancelar esta solicitud en su estado actual.');
        }

        request.status = ServiceRequestStatus.CANCELED;
        const updatedRequest = await this.serviceRequestRepository.save(request);

        // Notificar al conductor si estaba asignado
        if (request.shift?.driver?.id) {
            this.notificationsGateway.emitRequestCanceledToDriver(request.shift.driver.id, updatedRequest);
        }

        return updatedRequest;
    }
}