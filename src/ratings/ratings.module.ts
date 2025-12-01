// src/ratings/ratings.module.ts

import { Module } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rating } from './rating.entity';
import { AuthModule } from 'src/auth/auth.module';
import { ServiceRequest } from 'src/service_requests/service_request.entity';

@Module({
  imports: [
    AuthModule,
    // ¡AQUÍ ESTÁ LA CORRECCIÓN!
    // Le decimos a TypeORM que este módulo necesita acceso
    // tanto al Repositorio de Rating como al de ServiceRequest.
    TypeOrmModule.forFeature([Rating, ServiceRequest]),
  ],
  controllers: [RatingsController],
  providers: [RatingsService],
})
export class RatingsModule {}