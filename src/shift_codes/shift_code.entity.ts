import { Ambulance } from "src/ambulances/ambulance.entity";
import { Company } from "src/companies/company.entity";
import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: 'shift_codes' })
export class ShiftCode {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 10, unique: true }) // Hacemos el código único
    code: string;

    @Column({ 
        name: 'expires_at',
        type: 'timestamp',
    })
    expiresAt: Date;

    @Column({
        name: 'is_used',
        type: 'boolean',
        default: false,
    })
    isUsed: boolean;

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
    @ManyToOne(() => Company, (company) => company.shiftCodes)
    @JoinColumn({ name: 'company_id' })
    company: Company;

    @ManyToOne(() => Ambulance, (ambulance) => ambulance.shiftCodes)
    @JoinColumn({ name: 'ambulance_id' })
    ambulance: Ambulance;

    /* RELACIONES EXTERNAS*/

    /* METODOS */
    @BeforeInsert()
    generateCodeAndSetExpiry() {
        // 1. Generar un código aleatorio de 6 dígitos
        this.code = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Establecer la fecha de expiración para 5 minutos en el futuro
        const now = new Date();
        this.expiresAt = new Date(now.getTime() + 5 * 60000); // 5 minutos * 60000 milisegundos
    }
}