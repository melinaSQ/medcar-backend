import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { compare } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class AuthService {
    //contructor y metodos para manejar la autenticacion
    constructor(
        //@InjectRepository(User) private usersRepository: Repository<User>, // Inyecta el repositorio de User si es necesario
        private readonly usersService: UsersService, // Inyecta el UsersService
        private jwtService: JwtService /// Inyecta el JwtService
    ) { }

    /**
     * metodo que el controlador llamará para registrar un nuevo usuario.
     * @param registerDto - El DTO con los datos del nuevo usuario.
     * @returns el usuario creado
     */
    async register(registerDto: CreateUserDto): Promise<User> {
        // Simplemente delega la creación al servicio de usuarios.
        // Toda la lógica de validación, hasheo y guardado está ahora en un solo lugar.
        const user = await this.usersService.create(registerDto);
        return user;
    }

    //*metodo para controlar el login de usuarios
    /**
     * Genera un token de acceso JWT para un usuario.
     * Este es el método que el controlador llamará.
     * @param loginData - El DTO con email y password.
     * @returns Un objeto con el token de acceso.
     */
    async login(loginData: LoginAuthDto): Promise<{ accessToken: string }> {
        // Primero, validamos al usuario.
        const user = await this.validateUser(loginData.email, loginData.password);

        // Si validateUser devuelve null, significa que las credenciales son incorrectas.
        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas.'); // Mensaje genérico
        }

        // Si el usuario es válido, creamos el payload del JWT.
        // Guardamos solo la información necesaria para la autorización.
        const payload = { 
            sub: user.id,       // 'sub' (subject) es la convención estándar para el ID de usuario en JWT
            roles: user.roles   // El array de roles, ej: ['USER', 'DRIVER']
        };

        // Firmamos el token y lo devolvemos.
        const accessToken = this.jwtService.sign(payload);
        /*
        const data = {
            user: user,
            accessToken: accessToken,
        }
        return data;
        */
        return {
            accessToken: accessToken,
            //accessToken: 'Bearer ' + accessToken,
        };
    }

    /**
     * Valida si las credenciales de un usuario son correctas.
     * NO debe ser llamado directamente desde el controlador.
     * @param email - El email del usuario.
     * @param pass - La contraseña en texto plano.
     * @returns El objeto de usuario si es válido, de lo contrario null.
     */
    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);

        if (user) {
            const isMatch = await compare(pass, user.password);
            if (isMatch) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { password, ...result } = user;
                return result; // Devuelve el usuario sin la contraseña
            }
        }
        
        return null; // Si el usuario no existe o la contraseña no coincide
    }

}
