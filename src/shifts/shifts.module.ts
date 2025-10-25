import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from './shift.entity';
import { ShiftCode } from 'src/shift_codes/shift_code.entity';
import { Ambulance } from 'src/ambulances/ambulance.entity';
import { Company } from 'src/companies/company.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Shift, ShiftCode, Ambulance, Company])
  ],
  providers: [ShiftsService],
  controllers: [ShiftsController]
})
export class ShiftsModule { }
