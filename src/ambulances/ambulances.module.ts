import { Module } from '@nestjs/common';
import { AmbulancesService } from './ambulances.service';
import { AmbulancesController } from './ambulances.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ambulance } from './ambulance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ambulance])],
  providers: [AmbulancesService],
  controllers: [AmbulancesController]
})
export class AmbulancesModule {}
