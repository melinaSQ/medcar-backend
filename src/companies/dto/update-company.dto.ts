import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El nombre no puede estar vacío' })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(7, { message: 'El teléfono debe tener al menos 7 caracteres' })
  phone?: string;
}
