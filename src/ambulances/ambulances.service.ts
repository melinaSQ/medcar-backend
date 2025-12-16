import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ambulance } from './ambulance.entity';
import { Company } from 'src/companies/company.entity';
import { CreateAmbulanceDto } from './dto/create-ambulance.dto';
import { AmbulanceStatus } from 'src/common/enums/ambulance-status.enum';

@Injectable()
export class AmbulancesService {
    constructor(
        @InjectRepository(Ambulance)
        private readonly ambulanceRepository: Repository<Ambulance>,

        @InjectRepository(Company)
        private readonly companyRepository: Repository<Company>,
    ) { }

    /**
     * Crea una nueva ambulancia y la asocia a la compañía del usuario autenticado.
     * @param createAmbulanceDto - Datos de la nueva ambulancia.
     * @param userId - ID del usuario (COMPANY_ADMIN) que realiza la acción.
     * @returns La nueva entidad de ambulancia creada.
     */
    async create(createAmbulanceDto: CreateAmbulanceDto, userId: number): Promise<Ambulance> {
        // 1. Encontrar la compañía que este usuario administra.
        const company = await this.companyRepository.findOne({
            where: { user: { id: userId } },
        }); //resulta true o false

        // Verificación de seguridad: si el usuario no administra ninguna compañía.
        if (!company) {
            throw new UnauthorizedException('Este usuario no administra ninguna compañía.');
        }

        // 2. Crear la nueva instancia de la ambulancia.
        const newAmbulance = this.ambulanceRepository.create({
            ...createAmbulanceDto,
            company: company, // Asocia la ambulancia con la compañía encontrada.
        });

        // 3. Guardar en la base de datos.
        return this.ambulanceRepository.save(newAmbulance);
    }

    /**
     * Encuentra todas las ambulancias que pertenecen a la compañía de un usuario específico.
     * @param userId - ID del usuario (COMPANY_ADMIN).
     * @returns Un array de entidades de ambulancia.
     */
    async findAllByCompany(userId: number): Promise<Ambulance[]> {
        // 1. Encontrar la compañía del usuario (similar al método create).
        const company = await this.companyRepository.findOne({
            where: { user: { id: userId } },
        });

        if (!company) {
            throw new UnauthorizedException('Este usuario no administra ninguna compañía.');
        }

        // 2. Buscar todas las ambulancias que tengan ese company_id.
        return this.ambulanceRepository.find({
            where: {
                company: { id: company.id },
            },
        });
    }

    /**
     * Actualiza una ambulancia existente.
     * Solo el admin de la compañía propietaria puede actualizarla.
     */
    async update(ambulanceId: number, updateData: Partial<CreateAmbulanceDto>, userId: number): Promise<Ambulance> {
        const company = await this.companyRepository.findOne({
            where: { user: { id: userId } },
        });

        if (!company) {
            throw new UnauthorizedException('Este usuario no administra ninguna compañía.');
        }

        const ambulance = await this.ambulanceRepository.findOne({
            where: { id: ambulanceId, company: { id: company.id } },
        });

        if (!ambulance) {
            throw new NotFoundException('Ambulancia no encontrada o no pertenece a tu compañía.');
        }

        // Actualizar los campos
        Object.assign(ambulance, updateData);
        return this.ambulanceRepository.save(ambulance);
    }

    /**
     * Actualiza el estado de una ambulancia.
     */
    async updateStatus(ambulanceId: number, status: AmbulanceStatus, userId: number): Promise<Ambulance> {
        const company = await this.companyRepository.findOne({
            where: { user: { id: userId } },
        });

        if (!company) {
            throw new UnauthorizedException('Este usuario no administra ninguna compañía.');
        }

        const ambulance = await this.ambulanceRepository.findOne({
            where: { id: ambulanceId, company: { id: company.id } },
        });

        if (!ambulance) {
            throw new NotFoundException('Ambulancia no encontrada o no pertenece a tu compañía.');
        }

        ambulance.status = status;
        return this.ambulanceRepository.save(ambulance);
    }

    /**
     * Elimina una ambulancia.
     * Solo el admin de la compañía propietaria puede eliminarla.
     */
    async remove(ambulanceId: number, userId: number): Promise<void> {
        const company = await this.companyRepository.findOne({
            where: { user: { id: userId } },
        });

        if (!company) {
            throw new UnauthorizedException('Este usuario no administra ninguna compañía.');
        }

        const ambulance = await this.ambulanceRepository.findOne({
            where: { id: ambulanceId, company: { id: company.id } },
        });

        if (!ambulance) {
            throw new NotFoundException('Ambulancia no encontrada o no pertenece a tu compañía.');
        }

        await this.ambulanceRepository.remove(ambulance);
    }

}
