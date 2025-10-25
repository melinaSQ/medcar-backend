import { Module } from '@nestjs/common';
import { ServiceRequestsService } from './service_requests.service';
import { ServiceRequestsController } from './service_requests.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRequest } from './service_request.entity';
import { AuthModule } from 'src/auth/auth.module';
import { User } from 'src/users/user.entity';
import { Shift } from 'src/shifts/shift.entity';
import { Company } from 'src/companies/company.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([ServiceRequest, User, Shift, Company]),
  ],
  providers: [ServiceRequestsService],
  controllers: [ServiceRequestsController]
})
export class ServiceRequestsModule {}
