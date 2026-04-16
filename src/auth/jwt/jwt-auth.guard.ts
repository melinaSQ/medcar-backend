import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Un guardián que se puede usar en los controladores para proteger rutas.
 * Activa automáticamente la JwtStrategy que definimos.
 * Si el token es válido, permite el acceso.
 * Si el token falta o es inválido, devuelve un error 401 Unauthorized.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}