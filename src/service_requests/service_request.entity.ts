import { EmergencyType } from "src/common/enums/emergency-type.enum";
import { ServiceRequestStatus } from "src/common/enums/service-request-status.enum";
import { Rating } from "src/ratings/rating.entity";
import { Shift } from "src/shifts/shift.entity";
import { User } from "src/users/user.entity";
import { BeforeInsert, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { Point } from 'geojson';
//import { Rating } from "../../ratings/entities/rating.entity"; // Importaremos esto en el futuro

@Entity({ name: 'service_requests' })
export class ServiceRequest {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'emergency_type',
        type: 'enum',
        enum: EmergencyType,
    })
    emergencyType: EmergencyType;

    @Column({ 
        name: 'origin_description', 
        type: 'text', 
        nullable: true 
    })
    originDescription: string;
    
    // --- ¡COLUMNA DE GEOLOCALIZACIÓN! ---
    @Index({ spatial: true }) // Crea un índice espacial para búsquedas rápidas por ubicación
    @Column({
        name: 'origin_location',
        type: 'point', // 'point' es un alias que ya implica spatialFeatureType: 'Point'
        //spatialFeatureType: 'Point', 
        srid: 4326, // Opcional: Standard GPS coordinates
        nullable: false,
    })
    originLocation: Point;

     @Column({
        name: 'origin_address_text',
        type: 'varchar',
        length: 255,
        nullable: true, // <-- Opcional, por si la geocodificación falla
    })
    originAddressText: string;

    @Column({
        type: 'enum',
        enum: ServiceRequestStatus,
        default: ServiceRequestStatus.SEARCHING,
    })
    status: ServiceRequestStatus;

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
    @ManyToOne(() => User, (user) => user.requestsAsClient)
    @JoinColumn({ name: 'client_user_id' })
    client: User;

    @ManyToOne(() => Shift, (shift) => shift.serviceRequests, { nullable: true }) // Es nulo al principio
    @JoinColumn({ name: 'shift_id' })
    shift: Shift | null;

    /* RELACIONES EXTERNAS*/
    //@OneToOne(() => Rating, (rating) => rating.serviceRequest)
    //rating: Rating;
    @OneToMany(() => Rating, (rating) => rating.serviceRequest)
    ratings: Rating[];

}