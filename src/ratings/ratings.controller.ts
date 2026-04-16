// src/ratings/ratings.controller.ts

import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { CreateRatingDto } from './dto/create-rating.dto';
import { RatingsService } from './ratings.service';

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  create(@Body() createRatingDto: CreateRatingDto, @Request() req) {
    const raterId = req.user.id;
    return this.ratingsService.create(createRatingDto, raterId);
  }

  /**
   * Verifica si el usuario ya calificó un servicio específico
   */
  @Get('check/:serviceRequestId')
  checkIfRated(@Param('serviceRequestId') serviceRequestId: number, @Request() req) {
    const raterId = req.user.id;
    return this.ratingsService.checkIfUserRated(serviceRequestId, raterId);
  }

  /**
   * Obtiene el promedio de calificaciones de un usuario
   */
  @Get('average/:userId')
  getAverageRating(@Param('userId') userId: number) {
    return this.ratingsService.getAverageRating(userId);
  }

  /**
   * Obtiene las calificaciones recibidas por el usuario autenticado
   */
  @Get('my-ratings')
  getMyRatings(@Request() req) {
    const userId = req.user.id;
    return this.ratingsService.getRatingsReceived(userId);
  }

  /**
   * Obtiene el promedio de calificaciones de la empresa del usuario autenticado
   * Basado en las calificaciones de todos sus conductores
   */
  @Get('company-average')
  getCompanyAverageRating(@Request() req) {
    const companyUserId = req.user.id;
    return this.ratingsService.getCompanyAverageRating(companyUserId);
  }

  /**
   * Obtiene el promedio de calificaciones de una empresa específica por su userId
   * Puede ser llamado por cualquier usuario autenticado
   */
  @Get('company-average/:companyUserId')
  getCompanyAverageRatingByUserId(@Param('companyUserId') companyUserId: number) {
    return this.ratingsService.getCompanyAverageRating(companyUserId);
  }
}