import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';

//Aqui van los endpoints para manejar las solicitudes HTTP relacionadas con los usuarios
//definimos rutas y metodos para manejar las solicitudes
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { } //inyectamos el servicio de usuarios

    //http://localhost:3000/users

    @Post() //POST ->  crear un nuevo usuario
    create(@Body() user: CreateUserDto) {
        return this.usersService.create(user);
    }

    /**
   * Endpoint para obtener una lista de todos los usuarios.
   * Protegido por dos guardianes:
   * 1. JwtAuthGuard: Asegura que el usuario esté autenticado (tenga un token válido).
   * 2. RolesGuard: Comprueba que el usuario autenticado tenga el rol requerido.
   * Solo los usuarios con el rol 'ADMIN' pueden acceder a esta ruta.
   */
    @Get()
    @UseGuards(JwtAuthGuard) // <-- Se aplican en orden
    //@HasRoles(Rol.ADMIN) // <-- Metadata que el RolesGuard leerá
    findAll() {
        // Llama al método del servicio, que ya se encarga de la lógica
        // y de eliminar las contraseñas.
        return this.usersService.findAll();
    }


}
