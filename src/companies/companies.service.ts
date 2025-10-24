import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CompanyStatus } from 'src/common/enums/company-status.enum';
import { User } from 'src/users/user.entity';
import { Rol } from 'src/common/enums/rol.enum';


@Injectable()
export class CompaniesService {

    constructor(
        @InjectRepository(Company) private readonly companyRepository: Repository<Company>,

        @InjectRepository(User)
        private readonly userRepository: Repository<User>, // ¡IMPORTANTE! Inyectamos el UserRepository para poder modificar usuarios

    ) { }

    async create(company: CreateCompanyDto, userId: number): Promise<Company> {

        // --- ¡AÑADE ESTOS CONSOLE.LOG PARA DEPURAR! ---
        console.log('--- Datos recibidos en el servicio ---');
        console.log('DTO recibido:', company);
        console.log('Tipo de DTO:', typeof company);
        console.log('¿Es una instancia de la clase DTO?', company instanceof CreateCompanyDto);
        console.log('ID de usuario:', userId);
        // 1. Validar si el usuario ya tiene una compañía.
        //    Hacemos una consulta simple y eficiente para ver si ya existe una compañía
        //    asociada a este userId.
        const existingCompany = await this.companyRepository.findOne({
            where: { user: { id: userId } }
        });

        if (existingCompany) {
            throw new ConflictException(`El usuario con ID ${userId} ya administra una empresa.`);
        }

        // 2. Crear la nueva entidad Company.
        const newCompany = this.companyRepository.create({
            ...company,
            status: CompanyStatus.PENDING, // El estado por defecto es PENDIENTE
            user: { id: userId } // Asociamos la compañía al usuario autenticado.
        });

        // --- AÑADE OTRO CONSOLE.LOG ANTES DE GUARDAR ---
        console.log('--- Objeto a punto de ser guardado ---');
        console.log(newCompany);

        // 3. Guardar en la base de datos.
        return this.companyRepository.save(newCompany);
    }

    /**
     * Aprueba una solicitud de compañía, cambiando su estado y otorgando
     * el rol de COMPANY_ADMIN al usuario asociado.
     * @param companyId El ID de la compañía a aprobar.
     * @returns La entidad de la compañía actualizada.
     */
    async approve(companyId: number): Promise<Company> {
        // 1. Buscamos la compañía Y cargamos su relación con el usuario
        const company = await this.companyRepository.findOne({
            where: { id: companyId },
            relations: ['user'], // <-- ¡Crucial! para tener acceso a company.user
        });

        if (!company) {
            throw new NotFoundException(`La compañía con el ID ${companyId} no fue encontrada.`);
        }

        if (!company.user) {
            throw new NotFoundException(`La compañía con ID ${companyId} no tiene un usuario asociado.`);
        }

        // 2. Actualizamos el estado de la compañía
        company.status = CompanyStatus.APPROVED;

        // 3. Obtenemos el usuario y actualizamos sus roles
        const userToUpdate = company.user;

        // Añadimos el rol solo si no lo tiene ya, para evitar duplicados
        if (!userToUpdate.roles.includes(Rol.COMPANY_ADMIN)) {
            userToUpdate.roles.push(Rol.COMPANY_ADMIN);
            // Guardamos la entidad User actualizada
            await this.userRepository.save(userToUpdate);
        }

        // 4. Guardamos la entidad Company actualizada
        const updatedCompany = await this.companyRepository.save(company);

        return updatedCompany;
    }
}
