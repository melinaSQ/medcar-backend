import { IsEnum, IsLatitude, IsLongitude, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { EmergencyType } from 'src/common/enums/emergency-type.enum';

export class CreateServiceRequestDto {
    @IsEnum(EmergencyType)
    @IsNotEmpty()
    emergencyType: EmergencyType;

    @IsString()
    @IsOptional() // La descripción es opcional
    originDescription?: string;

    @IsLatitude()
    //@IsNumber({}, { message: 'Latitude must be a number' })
    @IsNotEmpty()
    latitude: number;

    @IsLongitude()
    //@IsNumber({}, { message: 'Longitude must be a number' })
    @IsNotEmpty()
    longitude: number;
}