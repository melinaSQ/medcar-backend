import { BeforeInsert, Column, CreateDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Rol } from 'src/common/enums/rol.enum'; // <-- ¡Importa tu enum!
import { Company } from "src/companies/company.entity";
import { Shift } from "src/shifts/shift.entity";
import { ServiceRequest } from "src/service_requests/service_request.entity";
import { Rating } from "src/ratings/rating.entity";

@Entity({ name: 'users' })
export class User {
    @PrimaryGeneratedColumn() //autoicrementable
    id: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255 })
    lastname: string;

    @Column({ type: 'varchar', length: 255, unique: true }) //que solo haya un usuario con ese email
    email: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    phone: string;

    @Column({
        name: 'image_url',
        type: 'varchar',
        length: 255,
        nullable: true
    })
    imageUrl: string; // El nombre en tu código puede ser camelCase

    @Column({ type: 'varchar', length: 255 })
    password: string;

    @Column({
        type: 'simple-json',
        //type: 'set',
        //enum: Rol, // <-- Usa tu enum aquí
        //default: JSON.stringify([Rol.USER]), // <-- Establece un rol por defecto para los nuevos registros
        nullable: false, // Asegurémonos de que nunca sea nulo
    })
    roles: Rol[]; // <-- El tipo en TypeScript es un array de tu enum Rol


    @Column({
        name: 'notification_token', // Buena práctica: nombrar explícitamente
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    notificationToken: string;

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

    /* RELACIONES EXTERNAS*/
    @OneToOne(() => Company, (company) => company.user)
    company: Company[];

    @OneToMany(() => Shift, (shift) => shift.driver)
    shiftsAsDriver: Shift[]; 

    @OneToMany(() => ServiceRequest, (request) => request.client)
    requestsAsClient: ServiceRequest[];

    // Calificaciones que este usuario ha DADO a otros
    @OneToMany(() => Rating, (rating) => rating.rater)
    ratingsGiven: Rating[];

    // Calificaciones que este usuario ha RECIBIDO de otros
    @OneToMany(() => Rating, (rating) => rating.rated)
    ratingsReceived: Rating[];

    /* METODOS */
    //metodo que se ejecuta antes de insertar un nuevo usuario para que el rol sea asignado con reglas correctas de mysql
    @BeforeInsert()
    setDefaultRoles() {
        if (!this.roles || this.roles.length === 0) {
            this.roles = [Rol.USER];
        }
    }



}