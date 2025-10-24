import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CompanyStatus } from 'src/common/enums/company-status.enum';


@Injectable()
export class CompaniesService {

    constructor(
        @InjectRepository(Company) private readonly companyRepository: Repository<Company>,

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
}
