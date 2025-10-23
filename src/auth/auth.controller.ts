import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    //http://localhost:3000/auth

    @Post('register') //http://localhost:3000/auth/register   
    // POST ->  registrar un nuevo usuario
    register(@Body() user: CreateUserDto) {
        return this.authService.register(user);
    }
}
