import { IsInt, IsNotEmpty } from 'class-validator';

export class AssignRequestDto {
    @IsInt()
    @IsNotEmpty()
    requestId: number;

    @IsInt()
    @IsNotEmpty()
    shiftId: number;
}