import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './dto/jwt/jwt.constants';
import { JwtStrategy } from './dto/jwt/jwt.strategy';
import { JwtAuthGuard } from './dto/jwt/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UsersModule,
    JwtModule.register({
      secret: jwtConstants.secret, // ¡MUY IMPORTANTE! Mueve esto a variables de entorno (.env) más adelante
      signOptions: { expiresIn: '2d' }, // El token expirará en 2 días
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy, // <-- Añade la estrategia aquí
    JwtAuthGuard // <-- Y el guardián
  ],
  controllers: [AuthController],
  exports: [JwtAuthGuard] // Exporta el guardián para que otros módulos puedan usarlo
})
export class AuthModule { }
