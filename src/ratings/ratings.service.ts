// src/ratings/ratings.service.ts

import { ConflictException, forwardRef, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRatingDto } from './dto/create-rating.dto';
import { Rating } from './rating.entity';
import { ServiceRequest } from 'src/service_requests/service_request.entity';
import { ServiceRequestStatus } from 'src/common/enums/service-request-status.enum';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(ServiceRequest)
    private readonly requestRepository: Repository<ServiceRequest>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
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
      // Cliente califica al CONDUCTOR (individual)
      ratedId = request.shift.driver.id;
    } else if (raterId === request.shift.ambulance.company.user.id) {
      // Empresa califica al cliente
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

    const savedRating = await this.ratingRepository.save(newRating);

    // Cargar relaciones para el evento WebSocket
    const ratingWithRelations = await this.ratingRepository.findOne({
      where: { id: savedRating.id },
      relations: ['rater', 'rated', 'serviceRequest', 'serviceRequest.shift', 'serviceRequest.shift.driver', 'serviceRequest.shift.ambulance', 'serviceRequest.shift.ambulance.company', 'serviceRequest.shift.ambulance.company.user'],
    });

    console.log('⭐ Rating guardado, ratingWithRelations:', ratingWithRelations ? 'encontrado' : 'null');
    if (ratingWithRelations) {
      console.log('⭐ Emitiendo evento rating_created...');
      // Emitir evento WebSocket para actualización en tiempo real
      this.notificationsGateway.emitRatingCreated(ratingWithRelations);
    } else {
      console.log('⚠️ No se pudo cargar ratingWithRelations, no se emitirá evento');
    }

    return savedRating;
  }

  /**
   * Verifica si un usuario ya calificó un servicio específico
   */
  async checkIfUserRated(serviceRequestId: number, raterId: number): Promise<{ hasRated: boolean; rating?: Rating }> {
    const existingRating = await this.ratingRepository.findOne({
      where: {
        serviceRequest: { id: serviceRequestId },
        rater: { id: raterId },
      },
    });

    return {
      hasRated: !!existingRating,
      rating: existingRating || undefined,
    };
  }

  /**
   * Obtiene el promedio de calificaciones de un usuario
   */
  async getAverageRating(userId: number): Promise<{ average: number; count: number }> {
    const result = await this.ratingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.score)', 'average')
      .addSelect('COUNT(rating.id)', 'count')
      .where('rating.rated_user_id = :userId', { userId })
      .getRawOne();

    return {
      average: result.average ? parseFloat(result.average) : 0,
      count: parseInt(result.count) || 0,
    };
  }

  /**
   * Obtiene las calificaciones recibidas por un usuario
   */
  async getRatingsReceived(userId: number): Promise<Rating[]> {
    return this.ratingRepository.find({
      where: { rated: { id: userId } },
      relations: ['rater', 'serviceRequest'],
      order: { createdAt: 'DESC' },
      take: 20, // Últimas 20 calificaciones
    });
  }

  /**
   * Obtiene el promedio de calificaciones de una empresa
   * Basado en las calificaciones de todos sus conductores
   */
  async getCompanyAverageRating(companyUserId: number): Promise<{ average: number; count: number }> {
    // Buscar todas las calificaciones de conductores que han trabajado en ambulancias de la empresa
    // La query busca calificaciones donde:
    // 1. El rated_user_id es un conductor (tiene rol DRIVER)
    // 2. Ese conductor ha tenido turnos con ambulancias de la empresa
    const result = await this.ratingRepository
      .createQueryBuilder('rating')
      .innerJoin('rating.serviceRequest', 'serviceRequest')
      .innerJoin('serviceRequest.shift', 'shift')
      .innerJoin('shift.ambulance', 'ambulance')
      .innerJoin('ambulance.company', 'company')
      .where('company.user_id = :companyUserId', { companyUserId })
      .select('AVG(rating.score)', 'average')
      .addSelect('COUNT(rating.id)', 'count')
      .getRawOne();

    return {
      average: result?.average ? parseFloat(result.average) : 0,
      count: result?.count ? parseInt(result.count) : 0,
    };
  }
}