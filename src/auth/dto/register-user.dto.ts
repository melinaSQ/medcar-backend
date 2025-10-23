// src/auth/dto/create-user.dto.ts
/*
import { Transform } from 'class-transformer';
import { IsString, IsEmail, MinLength, IsNotEmpty, IsPhoneNumber, MaxLength, Matches } from 'class-validator';

export class RegisterAuthDto {
@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
@IsString({ message: 'Name must be a string' })
@IsNotEmpty({ message: 'Name should not be empty' })
@MaxLength(50)
name: string;

@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
@IsString()
@IsNotEmpty({ message: 'Lastname should not be empty' })
@MaxLength(50)
lastname: string;

@Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value
)
@IsEmail({}, { message: 'Please provide a valid email address' })
email: string;

@Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value
)
// El decorador IsPhoneNumber es de una librería externa, 
// pero IsString es suficiente para empezar.
@IsString()
@IsNotEmpty()
@Matches(/^\+?[0-9]{7,15}$/, {
    message: 'Phone must be 7–15 digits (optional leading +)',
})
//@IsPhoneNumber('BO', { message: 'Invalid Bolivian phone number' })
phone: string;

@IsString()
@MinLength(8, { message: 'Password must be at least 8 characters long' })
@MaxLength(128)
password: string;
}*/