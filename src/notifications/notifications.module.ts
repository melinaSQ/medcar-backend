import { forwardRef, Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/auth/jwt/jwt.constants';
import { ServiceRequestsModule } from 'src/service_requests/service_requests.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // Registramos JwtModule para que el JwtService esté disponible para inyección
    JwtModule.register({
      secret: jwtConstants.secret,// Debe ser EL MISMO secreto que en AuthModule
      signOptions: { expiresIn: '2d' },
    }),
    forwardRef(() => ServiceRequestsModule),
  ],
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class NotificationsModule { }
