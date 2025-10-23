import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

//Aqui van los endpoints para manejar las solicitudes HTTP relacionadas con los usuarios
//definimos rutas y metodos para manejar las solicitudes
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {} //inyectamos el servicio de usuarios

    //http://localhost:3000/users

    @Post() //POST ->  crear un nuevo usuario
    create(@Body() user: CreateUserDto) {
        return this.usersService.create(user);
    }
}
