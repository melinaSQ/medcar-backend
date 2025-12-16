import { IsString, IsOptional, Length } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @Length(1, 255)
  name?: string;

  @IsString()
  @IsOptional()
  @Length(1, 255)
  lastname?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  phone?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}

