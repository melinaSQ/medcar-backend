import { ServiceRequest } from "src/service_requests/service_request.entity";
import { User } from "src/users/user.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: 'ratings' })
export class Rating {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'tinyint' }) // Eficiente para números pequeños como 1-5
    score: number;

    @Column({ type: 'text', nullable: true })
    comment: string | null;

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

    // La solicitud de servicio a la que pertenece esta calificación.
    // Muchas calificaciones (dos por servicio) pueden pertenecer a una solicitud.
    @ManyToOne(() => ServiceRequest, (request) => request.ratings)
    @JoinColumn({ name: 'service_request_id' })
    serviceRequest: ServiceRequest;

    // El usuario que está EMITIENDO la calificación.
    @ManyToOne(() => User, (user) => user.ratingsGiven)
    @JoinColumn({ name: 'rater_user_id' })
    rater: User; // "Rater" = Calificador

    // El usuario que está RECIBIENDO la calificación.
    @ManyToOne(() => User, (user) => user.ratingsReceived)
    @JoinColumn({ name: 'rated_user_id' })
    rated: User; // "Rated" = Calificado

}