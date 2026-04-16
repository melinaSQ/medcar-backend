import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
export class CreateRatingDto {
    @IsInt() @IsNotEmpty()
    serviceRequestId: number;

    @IsInt() @Min(1) @Max(5)
    score: number;

    @IsString() @IsOptional()
    comment?: string;
}