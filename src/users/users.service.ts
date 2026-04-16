import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestContactChangeDto } from './dto/request-contact-change.dto';
import * as bcrypt from 'bcrypt'; // <-- ¡Importa bcrypt!
import { Rol } from 'src/common/enums/rol.enum';
import { Company } from 'src/companies/company.entity';

//es para implementar la logica de negocio, metodos, consultas sql, etc
@Injectable()
export class UsersService {

    //todos deben tener un constructor
    //le estamos pasando el repositorio de User para poder hacer consultas a la base de datos
    constructor(
        @InjectRepository(User) private usersRepository: Repository<User>,
        @InjectRepository(Company) private companyRepository: Repository<Company>,
        @Inject(forwardRef(() => NotificationsGateway))
        private readonly notificationsGateway: NotificationsGateway,
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

    /**
     * Comprueba existencia y bloqueo en cada request JWT (y evita usar tokens válidos tras bloqueo).
     */
    async assertUserActiveForJwt(userId: number): Promise<void> {
        const user = await this.usersRepository.findOneBy({ id: userId });
        if (!user) {
            throw new UnauthorizedException('Usuario no encontrado.');
        }
        if (user.isBlocked) {
            throw new UnauthorizedException(
                'Tu cuenta ha sido suspendida. Contacta al administrador.',
            );
        }
    }

    /**
     * Perfil público del usuario autenticado (sin contraseña). Sirve para refrescar datos en la app.
     */
    async getPublicProfile(userId: number): Promise<Omit<User, 'password'>> {
        const user = await this.usersRepository.findOneBy({ id: userId });
        if (!user) {
            throw new NotFoundException('Usuario no encontrado.');
        }
        const { password, ...rest } = user;
        return rest as Omit<User, 'password'>;
    }

    //findOne(id): Busca un usuario por su ID.

    

    /**
   * Obtiene una lista de todos los usuarios registrados en el sistema.
   * Este método se asegura de eliminar las contraseñas antes de devolver los datos.
   * @returns Una promesa que resuelve a un array de entidades User (sin la contraseña).
   */
    async findAll(): Promise<User[]> {
        // 1. Obtenemos todos los usuarios de la base de datos.
        //    Por defecto, 'find()' trae todas las columnas.
        const users = await this.usersRepository.find();

        // 2. Iteramos sobre cada usuario para eliminar la propiedad 'password'.
        //    Aunque 'forEach' funciona, 'map' es una forma más funcional y limpia de transformar un array en otro.
        const usersWithoutPasswords = users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        return usersWithoutPasswords as User[];
    }

    /**
     * Busca un usuario por email (para asignar como conductor)
     */
    async findUserByEmailForAdmin(email: string, adminUserId: number): Promise<User | null> {
        // Verificar que el admin tiene una empresa
        const company = await this.companyRepository.findOneBy({ user: { id: adminUserId } });
        if (!company) {
            throw new UnauthorizedException('No tienes permisos para realizar esta acción.');
        }

        const user = await this.usersRepository.findOne({
            where: { email },
        });

        if (!user) {
            return null;
        }

        // No devolver la contraseña
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
    }

    /**
     * Asigna el rol de DRIVER a un usuario existente
     */
    async assignDriverRole(userId: number, adminUserId: number): Promise<User> {
        // Verificar que el admin tiene una empresa
        const company = await this.companyRepository.findOneBy({ user: { id: adminUserId } });
        if (!company) {
            throw new UnauthorizedException('No tienes permisos para realizar esta acción.');
        }

        const user = await this.usersRepository.findOneBy({ id: userId });
        if (!user) {
            throw new NotFoundException('Usuario no encontrado.');
        }

        // Verificar si ya tiene el rol
        if (user.roles.includes(Rol.DRIVER)) {
            throw new ConflictException('El usuario ya tiene el rol de conductor.');
        }

        // Agregar el rol DRIVER
        user.roles = [...user.roles, Rol.DRIVER];
        const savedUser = await this.usersRepository.save(user);

        const { password, ...userWithoutPassword } = savedUser;
        return userWithoutPassword as User;
    }

    /**
     * Quita el rol de DRIVER a un usuario
     */
    async removeDriverRole(userId: number, adminUserId: number): Promise<User> {
        // Verificar que el admin tiene una empresa
        const company = await this.companyRepository.findOneBy({ user: { id: adminUserId } });
        if (!company) {
            throw new UnauthorizedException('No tienes permisos para realizar esta acción.');
        }

        const user = await this.usersRepository.findOneBy({ id: userId });
        if (!user) {
            throw new NotFoundException('Usuario no encontrado.');
        }

        // Verificar si tiene el rol
        if (!user.roles.includes(Rol.DRIVER)) {
            throw new ConflictException('El usuario no tiene el rol de conductor.');
        }

        // Quitar el rol DRIVER
        user.roles = user.roles.filter(role => role !== Rol.DRIVER);
        const savedUser = await this.usersRepository.save(user);

        const { password, ...userWithoutPassword } = savedUser;
        return userWithoutPassword as User;
    }

    /**
     * Obtiene todos los conductores (usuarios con rol DRIVER)
     */
    async findAllDrivers(adminUserId: number): Promise<User[]> {
        // Verificar que el admin tiene una empresa
        const company = await this.companyRepository.findOneBy({ user: { id: adminUserId } });
        if (!company) {
            throw new UnauthorizedException('No tienes permisos para realizar esta acción.');
        }

        const users = await this.usersRepository.find();
        
        // Filtrar solo los que tienen rol DRIVER
        const drivers = users.filter(user => user.roles.includes(Rol.DRIVER));
        
        // Eliminar contraseñas
        return drivers.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword as User;
        });
    }

    /**
     * Actualiza el perfil del usuario autenticado
     */
    async updateProfile(userId: number, updateData: UpdateUserDto): Promise<User> {
        const user = await this.usersRepository.findOneBy({ id: userId });
        if (!user) {
            throw new NotFoundException('Usuario no encontrado.');
        }

        // Cambiar teléfono es una operación crítica que debe aprobar ADMIN.
        if (updateData.phone && updateData.phone !== user.phone) {
            throw new ForbiddenException(
                'El cambio de celular requiere validación del administrador.',
            );
        }

        // Actualizar solo los campos proporcionados
        if (updateData.name !== undefined) user.name = updateData.name;
        if (updateData.lastname !== undefined) user.lastname = updateData.lastname;
        if (updateData.phone !== undefined) user.phone = updateData.phone;
        if (updateData.imageUrl !== undefined) user.imageUrl = updateData.imageUrl;

        const savedUser = await this.usersRepository.save(user);
        const { password, ...userWithoutPassword } = savedUser;
        return userWithoutPassword as User;
    }

    /**
     * Solicita cambio de correo y/o teléfono.
     * El cambio NO se aplica hasta aprobación del ADMIN.
     */
    async requestContactChange(
        userId: number,
        dto: RequestContactChangeDto,
    ): Promise<{ message: string; pendingEmail: string | null; pendingPhone: string | null; requestedAt: Date | null }> {
        const user = await this.usersRepository.findOneBy({ id: userId });
        if (!user) {
            throw new NotFoundException('Usuario no encontrado.');
        }

        const normalizedEmail = dto.email?.trim().toLowerCase();
        const normalizedPhone = dto.phone?.trim();

        if (!normalizedEmail && !normalizedPhone) {
            throw new BadRequestException('Debes enviar email o teléfono para solicitar cambio.');
        }

        if (normalizedEmail && normalizedEmail !== user.email) {
            const existingEmail = await this.usersRepository.findOne({
                where: { email: normalizedEmail },
            });
            if (existingEmail && existingEmail.id !== user.id) {
                throw new ConflictException('El correo solicitado ya está en uso.');
            }
        }

        if (normalizedPhone && normalizedPhone !== user.phone) {
            const existingPhone = await this.usersRepository.findOne({
                where: { phone: normalizedPhone },
            });
            if (existingPhone && existingPhone.id !== user.id) {
                throw new ConflictException('El teléfono solicitado ya está en uso.');
            }
        }

        const emailChanged = normalizedEmail && normalizedEmail !== user.email;
        const phoneChanged = normalizedPhone && normalizedPhone !== user.phone;

        if (!emailChanged && !phoneChanged) {
            throw new ConflictException(
                'Los datos solicitados son iguales a los actuales.',
            );
        }

        if (emailChanged) {
            user.pendingEmail = normalizedEmail ?? null;
        }
        if (phoneChanged) {
            user.pendingPhone = normalizedPhone ?? null;
        }
        user.contactChangeRequestedAt = new Date();

        const saved = await this.usersRepository.save(user);
        this.notificationsGateway.emitSystemAdminQueuesUpdated('contact_change_requested');
        return {
            message:
                'Solicitud enviada. Un administrador debe aprobar el cambio de contacto.',
            pendingEmail: saved.pendingEmail ?? null,
            pendingPhone: saved.pendingPhone ?? null,
            requestedAt: saved.contactChangeRequestedAt ?? null,
        };
    }

}
