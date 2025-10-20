import { Ambulance } from "src/ambulances/ambulance.entity";
import { ServiceRequest } from "src/service_requests/service_request.entity";
import { User } from "src/users/user.entity";
import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: 'shifts' })
export class Shift {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'start_time',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    })
    startTime: Date;

    @Column({
        name: 'end_time',
        type: 'timestamp',
        nullable: true, // Es nulo mientras el turno esté activo
    })
    endTime: Date | null;

    @Column({
        name: 'is_active',
        type: 'boolean',
        default: true,
    })
    isActive: boolean;

    // --- Timestamps de Auditoría ---
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
    @ManyToOne(() => User, (user) => user.shiftsAsDriver)
    @JoinColumn({ name: 'driver_user_id' })
    driver: User;

    @ManyToOne(() => Ambulance, (ambulance) => ambulance.shifts)
    @JoinColumn({ name: 'ambulance_id' })
    ambulance: Ambulance;
    
    /* RELACIONES EXTERNAS*/
    @OneToMany(() => ServiceRequest, (request) => request.shift)
    serviceRequests: ServiceRequest[];

}