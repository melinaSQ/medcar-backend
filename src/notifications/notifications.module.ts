import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/auth/jwt/jwt.constants';

@Module({
  imports: [
    // Registramos JwtModule para que el JwtService esté disponible para inyección
    JwtModule.register({
      secret: jwtConstants.secret,// Debe ser EL MISMO secreto que en AuthModule
      signOptions: { expiresIn: '2d' },
    }),
  ],
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
