// src/companies/dto/create-company.dto.ts
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 13) // Ajusta la longitud según el formato de RUC/NIT de tu país
  ruc: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}