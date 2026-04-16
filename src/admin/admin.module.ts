import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Company } from 'src/companies/company.entity';
import { User } from 'src/users/user.entity';
import { ServiceRequest } from 'src/service_requests/service_request.entity';
import { Shift } from 'src/shifts/shift.entity';
import { Rating } from 'src/ratings/rating.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      User,
      ServiceRequest,
      Shift,
      Rating,
    ]),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
