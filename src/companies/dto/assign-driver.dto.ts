import { IsEmail, IsNotEmpty } from 'class-validator';

export class AssignDriverDto {
    @IsEmail()
    @IsNotEmpty()
    driverEmail: string;
}