import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Shift } from './shift.entity';
import { ShiftCode } from 'src/shift_codes/shift_code.entity';
import { Ambulance } from 'src/ambulances/ambulance.entity';
import { Company } from 'src/companies/company.entity';
import { AmbulanceStatus } from 'src/common/enums/ambulance-status.enum';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { StartShiftDto } from './dto/start-shift.dto';

@Injectable()
export class ShiftsService {
    constructor(
        @InjectRepository(Shift)
        private readonly shiftRepository: Repository<Shift>,
        @InjectRepository(ShiftCode)
        private readonly shiftCodeRepository: Repository<ShiftCode>,
        @InjectRepository(Ambulance)
        private readonly ambulanceRepository: Repository<Ambulance>,
        @InjectRepository(Company)
        private readonly companyRepository: Repository<Company>,
    ) { }

    /**
     * Genera un código de un solo uso para que un conductor inicie un turno con una ambulancia específica.
     */
    async generateShiftCode(generateCodeDto: GenerateCodeDto, adminUserId: number): Promise<ShiftCode> {
        const { ambulanceId } = generateCodeDto;

        // 1. Validar que la ambulancia existe y pertenece a la compañía del admin
        const company = await this.companyRepository.findOneBy({ user: { id: adminUserId } });
        if (!company) {
            throw new UnauthorizedException('Usuario no autorizado para gestionar esta compañía.');
        }

        // Buscar la ambulancia
        const ambulance = await this.ambulanceRepository.findOne({
            where: { id: ambulanceId, company: { id: company.id } },
        });
        if (!ambulance) {
            throw new NotFoundException(`Ambulancia con ID ${ambulanceId} no encontrada o no pertenece a esta compañía.`);
        }

        // 2. Validar que la ambulancia esté operacional
        if (ambulance.status !== AmbulanceStatus.OPERATIONAL) {
            throw new ConflictException(`La ambulancia ${ambulance.plate} no está operacional.`);
        }

        // 3. Crear y guardar el nuevo código (el hook @BeforeInsert en la entidad se encarga de la lógica)
        const newCode = this.shiftCodeRepository.create({
            ambulance: ambulance,
            company: company,
        });

        return this.shiftCodeRepository.save(newCode);
    }

    /**
     * Inicia un turno para un conductor validando un código y una placa.
     */
    async startShift(startShiftDto: StartShiftDto, driverId: number): Promise<Shift> {
        const { plate, code } = startShiftDto;

        // 1. Validar que el conductor no tenga ya un turno activo.
        const existingActiveShift = await this.shiftRepository.findOneBy({ driver: { id: driverId }, isActive: true });
        if (existingActiveShift) {
            throw new ConflictException('Ya tienes un turno activo.');
        }

        // 2. Buscar un código válido que coincida.
        const shiftCode = await this.shiftCodeRepository.findOne({
            where: {
                code: code,
                isUsed: false,
                expiresAt: MoreThan(new Date()), // ¡La fecha de expiración debe ser mayor que ahora!
                ambulance: { plate: plate }, // Asegurarse de que el código sea para esta placa
            },
            relations: ['ambulance', 'company'],
        });

        if (!shiftCode) {
            throw new BadRequestException('Código inválido, expirado o ya utilizado.');
        }

        // 3. Validar que la AMBULANCIA no esté ya en un turno activo.
        const ambulanceIsActive = await this.shiftRepository.findOneBy({
            ambulance: { id: shiftCode.ambulance.id },
            isActive: true,
        });

        if (ambulanceIsActive) {
            throw new ConflictException(`La ambulancia con placa ${plate} ya está siendo utilizada en otro turno.`);
        }

        // 3. Marcar el código como usado
        shiftCode.isUsed = true;
        await this.shiftCodeRepository.save(shiftCode);

        // 4. Crear el nuevo turno
        const newShift = this.shiftRepository.create({
            driver: { id: driverId },
            ambulance: shiftCode.ambulance,
            isActive: true,
        });

        return this.shiftRepository.save(newShift);
    }

    /**
   * Finaliza el turno activo de un conductor.
   * @param driverId - El ID del conductor que está finalizando su turno.
   * @returns El objeto del turno actualizado.
   */
    async endShift(driverId: number): Promise<Shift> {
        // 1. Buscar el turno ACTIVO para este conductor.
        //    Es crucial buscar por 'isActive: true' para no modificar turnos antiguos por error.
        const activeShift = await this.shiftRepository.findOne({
            where: {
                driver: { id: driverId },
                isActive: true,
            },
        });

        // 2. Validar si realmente existe un turno activo.
        if (!activeShift) {
            throw new NotFoundException('No se encontró un turno activo para este conductor.');
        }

        // 3. Actualizar los campos del turno para finalizarlo.
        activeShift.isActive = false;
        activeShift.endTime = new Date(); // Establece la hora de finalización al momento actual.

        // 4. Guardar los cambios en la base de datos.
        const updatedShift = await this.shiftRepository.save(activeShift);

        // En el futuro, podrías querer actualizar el estado de la ambulancia aquí si decides
        // añadir un estado 'IN_SHIFT' a la tabla de ambulancias, pero según nuestro
        // diseño actual, no es necesario. La disponibilidad se calcula a partir de los turnos activos.

        return updatedShift;
    }
}
