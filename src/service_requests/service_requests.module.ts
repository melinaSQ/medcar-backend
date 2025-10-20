import { Module } from '@nestjs/common';
import { ServiceRequestsService } from './service_requests.service';
import { ServiceRequestsController } from './service_requests.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequest } from './service_request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRequest])],
  providers: [ServiceRequestsService],
  controllers: [ServiceRequestsController]
})
export class ServiceRequestsModule {}
