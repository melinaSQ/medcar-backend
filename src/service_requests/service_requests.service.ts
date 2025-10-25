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

@Injectable()
export class ServiceRequestsService {
    constructor(
        @InjectRepository(ServiceRequest)
        private readonly serviceRequestRepository: Repository<ServiceRequest>,
        @InjectRepository(Shift)
        private readonly shiftRepository: Repository<Shift>,
        @InjectRepository(Company)
        private readonly companyRepository: Repository<Company>,
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

            console.log('--- 6. ¡GUARDADO CON ÉXITO! ---');
            console.log('TODO: Notificar a los admins por WebSocket sobre la nueva solicitud:', savedRequest.id);

            return savedRequest;

        } catch (error) {
            console.error('--- ERROR DURANTE LA CREACIÓN O GUARDADO DE LA ENTIDAD ---', error);
            // Este es el error que probablemente estás viendo en tu consola
            throw new InternalServerErrorException('Error al guardar la solicitud.');
        }
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
        if (!adminCompany) {
            throw new UnauthorizedException('No estás autorizado para asignar solicitudes.');
        }

        const [request, shift] = await Promise.all([
            this.serviceRequestRepository.findOneBy({ id: requestId }),
            this.shiftRepository.findOne({ where: { id: shiftId }, relations: ['ambulance.company'] }),
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

        request.shift = shift;
        request.status = ServiceRequestStatus.ASSIGNED;
        const updatedRequest = await this.serviceRequestRepository.save(request);

        console.log(`TODO: Notificar al cliente y al conductor sobre la asignación.`);

        return updatedRequest;
    }
}