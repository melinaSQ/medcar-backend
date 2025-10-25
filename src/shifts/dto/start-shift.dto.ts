import { IsNotEmpty, IsString } from 'class-validator';

export class StartShiftDto {
    @IsString()
    @IsNotEmpty()
    plate: string;

    @IsString()
    @IsNotEmpty()
    code: string;
}