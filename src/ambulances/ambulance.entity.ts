import { AmbulanceStatus } from "src/common/enums/ambulance-status.enum";
import { AmbulanceType } from "src/common/enums/ambulance-type.enums";
import { Company } from "src/companies/company.entity";
import { ShiftCode } from "src/shift_codes/shift_code.entity";
import { Shift } from "src/shifts/shift.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: 'ambulances' })
export class Ambulance {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 20, unique: true })
    plate: string;
    
    @Column({
        name: 'sedes_code',
        type: 'varchar',
        length: 100,
    })
    sedesCode: string;

    @Column({
        type: 'enum',
        enum: AmbulanceType,
    })
    type: AmbulanceType;

    @Column({
        name: 'status',
        type: 'enum',
        enum: AmbulanceStatus,
        default: AmbulanceStatus.OPERATIONAL,
    })
    status: AmbulanceStatus;

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)'  // Precisión de microsegundos
    })
    createdAt: Date;

    @UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)' // ¡Esta es la clave para las actualizaciones!
    })
    updatedAt: Date;

    /* RELACIONES INTERNAS*/
    @ManyToOne(() => Company, (company) => company.ambulances)
    @JoinColumn({ name: 'company_id' }) // Esto crea la columna 'company_id' en la base de datos
    company: Company; // Propiedad para acceder al objeto Company completo

    /* RELACIONES EXTERNAS*/
    @OneToMany(() => ShiftCode, (shiftCode) => shiftCode.ambulance)
    shiftCodes: ShiftCode[];

    @OneToMany(() => Shift, (shift) => shift.ambulance)
    shifts: Shift[];
    
}