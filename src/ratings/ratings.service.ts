// src/ratings/ratings.service.ts

import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRatingDto } from './dto/create-rating.dto';
import { Rating } from './rating.entity';
import { ServiceRequest } from 'src/service_requests/service_request.entity';
import { ServiceRequestStatus } from 'src/common/enums/service-request-status.enum';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(ServiceRequest)
    private readonly requestRepository: Repository<ServiceRequest>,
  ) {}

  async create(createRatingDto: CreateRatingDto, raterId: number): Promise<Rating> {
    const { serviceRequestId, score, comment } = createRatingDto;

    const request = await this.requestRepository.findOne({
      where: { id: serviceRequestId },
      relations: ['client', 'shift', 'shift.driver', 'shift.ambulance.company.user'],
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada.');
    }
    if (request.status !== ServiceRequestStatus.COMPLETED) {
      throw new ConflictException('Solo se pueden calificar servicios completados.');
    }

    if (!request.shift || !request.shift.driver || !request.shift.ambulance?.company?.user) {
      throw new ConflictException('Este servicio no puede ser calificado (faltan datos de asignación).');
    }

    let ratedId: number;
    if (raterId === request.client.id) {
      ratedId = request.shift.ambulance.company.user.id;
    } else if (raterId === request.shift.ambulance.company.user.id) {
      ratedId = request.client.id;
    } else {
      throw new UnauthorizedException('No puedes calificar este servicio.');
    }

    const newRating = this.ratingRepository.create({
      score,
      comment,
      serviceRequest: { id: serviceRequestId },
      rater: { id: raterId },
      rated: { id: ratedId },
    });

    return this.ratingRepository.save(newRating);
  }
}