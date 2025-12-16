import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { HasRoles } from 'src/auth/jwt/jwt-roles.decorator';
import { Rol } from 'src/common/enums/rol.enum';

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

    /**
     * Buscar usuario por email (para asignarlo como conductor)
     */
    @Get('search')
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @HasRoles(Rol.COMPANY_ADMIN)
    findByEmail(@Query('email') email: string, @Request() req) {
        const adminUserId = req.user.id;
        return this.usersService.findUserByEmailForAdmin(email, adminUserId);
    }

    /**
     * Obtener todos los conductores
     */
    @Get('drivers')
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @HasRoles(Rol.COMPANY_ADMIN)
    findAllDrivers(@Request() req) {
        const adminUserId = req.user.id;
        return this.usersService.findAllDrivers(adminUserId);
    }

    /**
     * Asignar rol de conductor a un usuario
     */
    @Post(':id/assign-driver')
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @HasRoles(Rol.COMPANY_ADMIN)
    assignDriverRole(@Param('id') userId: number, @Request() req) {
        const adminUserId = req.user.id;
        return this.usersService.assignDriverRole(userId, adminUserId);
    }

    /**
     * Quitar rol de conductor a un usuario
     */
    @Post(':id/remove-driver')
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @HasRoles(Rol.COMPANY_ADMIN)
    removeDriverRole(@Param('id') userId: number, @Request() req) {
        const adminUserId = req.user.id;
        return this.usersService.removeDriverRole(userId, adminUserId);
    }

    /**
     * Actualizar perfil del usuario autenticado
     */
    @Patch('me')
    @UseGuards(JwtAuthGuard)
    updateProfile(@Body() updateUserDto: UpdateUserDto, @Request() req) {
        const userId = req.user.id;
        return this.usersService.updateProfile(userId, updateUserDto);
    }
}
