import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';


@Injectable()
export class AuthService {
    //contructor y metodos para manejar la autenticacion
    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>, //inyectamos el repositorio de User
        private readonly usersService: UsersService, // Inyecta el UsersService
    ) { }

    //**metodo para controlar el registro usuarios
    async register(registerDto: CreateUserDto): Promise<User> {
        // Simplemente delega la creación al servicio de usuarios.
        // Toda la lógica de validación, hasheo y guardado está ahora en un solo lugar.
        const user = await this.usersService.create(registerDto);
        return user;
    }

}
