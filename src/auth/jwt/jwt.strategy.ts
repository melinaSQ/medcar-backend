import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './jwt.constants';
import { UsersService } from 'src/users/users.service';

//esta clase define la estrategia JWT para la autenticación

// Interfaz para definir la forma del payload del JWT. ¡Muy buena práctica!
export interface JwtPayload {
    sub: number; // El ID del usuario
    roles: string[]; // El array de roles
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly usersService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
        });
    }

    /**
     * Este método se ejecuta AUTOMÁTICAMENTE después de que Passport verifica la firma del JWT
     * y comprueba que no ha expirado.
     * @param payload - El payload decodificado del JWT (lo que pusimos en el AuthService).
     * @returns El objeto que NestJS adjuntará a `request.user`.
     */
    async validate(payload: JwtPayload) {
        await this.usersService.assertUserActiveForJwt(payload.sub);
        return {
            id: payload.sub,
            roles: payload.roles
        };
    }
}