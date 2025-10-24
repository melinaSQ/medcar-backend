import { IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { AmbulanceType } from 'src/common/enums/ambulance-type.enums';

export class CreateAmbulanceDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 10)
  plate: string;

  @IsString()
  @IsNotEmpty()
  sedesCode: string;

  @IsEnum(AmbulanceType)
  @IsNotEmpty()
  type: AmbulanceType;
}