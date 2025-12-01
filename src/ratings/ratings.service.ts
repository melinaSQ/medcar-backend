import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Rating } from './rating.entity';
import { Repository } from 'typeorm';
import { ServiceRequest } from 'src/service_requests/service_request.entity';
import { CreateRatingDto } from './dto/create-rating.dto';
import { ServiceRequestStatus } from 'src/common/enums/service-request-status.enum';

@Injectable()
export class RatingsService {
    constructor(
        @InjectRepository(Rating) private readonly ratingRepository: Repository<Rating>,
        @InjectRepository(ServiceRequest) private readonly requestRepository: Repository<ServiceRequest>,

    ) { }

    async create(createRatingDto: CreateRatingDto, raterId: number): Promise<Rating> {
        const { serviceRequestId, score, comment } = createRatingDto;

        const request = await this.requestRepository.findOne({
            where: { id: serviceRequestId },
            relations: ['client', 'shift.driver', 'shift.ambulance.company.user']
        });

        if (!request) throw new NotFoundException('Solicitud no encontrada.');
        if (request.status !== ServiceRequestStatus.COMPLETED) throw new ConflictException('Solo se pueden calificar servicios completados.');

        // --- ¡AÑADE ESTA VALIDACIÓN AQUÍ! ---
        if (!request.shift || !request.shift.driver || !request.shift.ambulance?.company?.user) {
            throw new ConflictException('Este servicio no tiene un conductor o empresa asignada y no puede ser calificado.');
        }


        // Lógica para determinar quién es el calificado (rated)
        let ratedId: number;
        if (raterId === request.client.id) { // Si el cliente califica...
            ratedId = request.shift.ambulance.company.user.id; // ...califica al admin de la empresa.
        } else if (raterId === request.shift.ambulance.company.user.id) { // Si la empresa califica...
            ratedId = request.client.id; // ...califica al cliente.
        } else {
            throw new UnauthorizedException('No puedes calificar este servicio.');
        }

        const newRating = this.ratingRepository.create({
            score, comment, serviceRequest: { id: serviceRequestId },
            rater: { id: raterId }, rated: { id: ratedId },
        });

        return this.ratingRepository.save(newRating);
    }
}