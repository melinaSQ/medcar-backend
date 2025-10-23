import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt'; // <-- ¡Importa bcrypt!

//es para implementar la logica de negocio, metodos, consultas sql, etc
@Injectable()
export class UsersService {

    //todos deben tener un constructor
    //le estamos pasando el repositorio de User para poder hacer consultas a la base de datos
    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>, //inyectamos el repositorio de User
    ) { }

    //METODOS PARA MANEJAR USUARIOS

    //metodo para crear un nuevo usuario
    async create(user: CreateUserDto): Promise<User> {
        const { email, phone, password, ...userData } = user;
        const existingUser = await this.usersRepository.findOne({
            where: [{ email }, { phone }] // Busca un usuario DONDE email sea igual O phone sea igual
        });

        if (existingUser) {
            if (existingUser.email === email) {
                throw new ConflictException('El email ya está registrado.');
            }
            if (existingUser.phone === phone) {
                throw new ConflictException('El teléfono ya está registrado.');
            }
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10); // Hashea la contraseña con un salt de 10 rondas

            // 3. Crea una nueva instancia de User con los datos proporcionados
            //const newUser = this.usersRepository.create(user);
            const userToSave = this.usersRepository.create({
                ...userData,
                email,
                phone,
                password: hashedPassword,
            });

            const savedUser = await this.usersRepository.save(userToSave);

            const { password: _, ...userWithoutPassword } = savedUser;
            return userWithoutPassword as User;


        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException('Algo salió mal, por favor intente de nuevo.');
        }
    }

    /**
   * Busca un usuario por su dirección de email.
   * Este método es utilizado principalmente por el AuthService para el proceso de login.
   * Es crucial que DEVUELVA el hash de la contraseña para su posterior comparación.
   * @param email - El email del usuario a buscar.
   * @returns El objeto completo del usuario si se encuentra, incluyendo la contraseña hasheada.
   */
    async findByEmail(email: string): Promise<User | null> {
        const user = await this.usersRepository.findOne({
            where: { email },
        });

        // No es necesario lanzar un 'NotFoundException' aquí.
        // El AuthService se encargará de manejar el caso en que el usuario sea 'null'.
        // Simplemente devolvemos lo que encontramos (el usuario o null).

        return user;
    }

    //findOne(id): Busca un usuario por su ID.



}
