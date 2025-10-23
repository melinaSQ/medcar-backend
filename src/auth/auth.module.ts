import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './jwt.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UsersModule,
    JwtModule.register({
      secret: jwtConstants.secret, // ¡MUY IMPORTANTE! Mueve esto a variables de entorno (.env) más adelante
      signOptions: { expiresIn: '2d' }, // El token expirará en 2 días
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule {}
