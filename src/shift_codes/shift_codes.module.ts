import { Module } from '@nestjs/common';
import { ShiftCodesService } from './shift_codes.service';
import { ShiftCodesController } from './shift_codes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftCode } from './shift_code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftCode])],
  providers: [ShiftCodesService],
  controllers: [ShiftCodesController]
})
export class ShiftCodesModule {}
