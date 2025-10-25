import { SetMetadata } from '@nestjs/common';
import { Rol } from 'src/common/enums/rol.enum';

export const ROLES_KEY = 'roles';
export const HasRoles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);