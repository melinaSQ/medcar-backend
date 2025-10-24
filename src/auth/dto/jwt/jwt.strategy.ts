import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './jwt.constants';

//esta clase define la estrategia JWT para la autenticación

// Interfaz para definir la forma del payload del JWT. ¡Muy buena práctica!
export interface JwtPayload {
    sub: number; // El ID del usuario
    roles: string[]; // El array de roles
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
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
        // Lo que retornes aquí será inyectado en el objeto 'request' de cualquier ruta protegida.
        // Por ejemplo, podrás acceder a él en un controlador como 'req.user'.
        return {
            id: payload.sub,
            roles: payload.roles
        };
    }
}