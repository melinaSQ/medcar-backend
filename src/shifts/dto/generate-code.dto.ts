import { IsInt, IsNotEmpty } from 'class-validator';

export class GenerateCodeDto {
    @IsInt()
    @IsNotEmpty()
    ambulanceId: number;
}