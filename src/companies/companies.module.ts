import { forwardRef, Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './company.entity';
import { User } from 'src/users/user.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, User]),
    forwardRef(() => NotificationsModule),
  ],
  providers: [CompaniesService],
  controllers: [CompaniesController]
})
export class CompaniesModule {}
