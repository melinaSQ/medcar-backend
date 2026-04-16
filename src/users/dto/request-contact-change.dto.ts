import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class RequestContactChangeDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(6, 50)
  phone?: string;
}
