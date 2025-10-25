import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';
import { CompaniesModule } from './companies/companies.module';
import { AmbulancesModule } from './ambulances/ambulances.module';
import { ShiftCodesModule } from './shift_codes/shift_codes.module';
import { ShiftsModule } from './shifts/shifts.module';
import { ServiceRequestsModule } from './service_requests/service_requests.module';
import { RatingsModule } from './ratings/ratings.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'adme5416',
      database: 'medcar_db',
      //entities: [User], //para la entidad/es que voy a usar por nombre
      //entities: [__dirname + '/**/*.entity{.ts,.js}'],  //para que tome todas las entidades por archivos
      autoLoadEntities: true, //carga automaticamente las entidades registradas en los modulos
      synchronize: true,
      legacySpatialSupport: false,   // ⬅️ usa ST_AsText/ST_GeomFromText en vez de AsText
    }),
    UsersModule,
    CompaniesModule,
    AmbulancesModule,
    ShiftCodesModule,
    ShiftsModule,
    ServiceRequestsModule,
    RatingsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
