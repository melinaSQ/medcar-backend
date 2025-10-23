import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginAuthDto } from './dto/login-auth.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    //http://localhost:3000/auth

    @Post('register') //http://localhost:3000/auth/register   
    // POST ->  registrar un nuevo usuario
    register(@Body() user: CreateUserDto) {
        return this.authService.register(user);
    }

    @Post('login') //http://localhost:3000/auth/login  
    login(@Body() loginDto: LoginAuthDto) {
        // El controlador solo pasa los datos y devuelve lo que el servicio le dé.
        // Si el servicio lanza una excepción, NestJS la capturará y enviará la respuesta HTTP 401 automáticamente.
        return this.authService.login(loginDto);
    }
}
