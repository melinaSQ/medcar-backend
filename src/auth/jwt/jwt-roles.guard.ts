import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from 'src/common/enums/rol.enum';
import { ROLES_KEY } from './jwt-roles.decorator';

@Injectable()
export class JwtRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    // Obtenemos los roles requeridos para la ruta desde el decorador @HasRoles
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si la ruta no tiene el decorador @HasRoles, permitimos el acceso
    if (!requiredRoles) {
      return true;
    }

    // Obtenemos el usuario del objeto request (que JwtAuthGuard ya puso ahí)
    const { user } = context.switchToHttp().getRequest();

    // Si no hay usuario, denegamos (aunque JwtAuthGuard ya debería haberlo hecho)
    if (!user || !user.roles) {
      return false;
    }

    // Comprobamos si el array de roles del usuario incluye AL MENOS UNO de los roles requeridos
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}