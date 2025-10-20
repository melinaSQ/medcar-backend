import { Ambulance } from "src/ambulances/ambulance.entity";
import { CompanyStatus } from "src/common/enums/company-status.enum";
import { ShiftCode } from "src/shift_codes/shift_code.entity";
import { User } from "src/users/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: 'companies' })
export class Company {
    @PrimaryGeneratedColumn() //autoicrementable
    id: number; 

    @Column({ type: 'varchar', length: 255 })
    name: string;

    // numero de ruc de la empresa
    @Column({ type: 'varchar', length: 20, unique: true })
    ruc: string;

    @Column({ type: 'varchar', length: 50 })
    phone: string;

    @Column({
        type: 'enum',
        enum: CompanyStatus,
        default: CompanyStatus.PENDING,
    })
    status: CompanyStatus;

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
    @OneToOne(() => User, { eager: true }) // eager: true carga automáticamente el usuario al buscar una compañía
    @JoinColumn({ name: 'user_id' }) // Esto crea la columna 'user_id' en la base de datos
    user: User; // Esta propiedad nos permitirá acceder al objeto User completo desde una instancia de Company

    /* RELACIONES EXTERNAS*/
    @OneToMany(() => Ambulance, (ambulance) => ambulance.company)
    ambulances: Ambulance[]; // Esta propiedad contendrá un array de objetos Ambulance
    @OneToMany(() => ShiftCode, (shiftCode) => shiftCode.company)
    shiftCodes: ShiftCode[];

}