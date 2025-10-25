import { Body, Controller, Post, UseGuards, Request, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { HasRoles } from 'src/auth/jwt/jwt-roles.decorator';
import { Rol } from 'src/common/enums/rol.enum';
import { AssignDriverDto } from './dto/assign-driver.dto';


@Controller('companies')
export class CompaniesController {
    constructor(private readonly companiesService: CompaniesService) { }

    //http://localhost:3000/companies

    @Post()
    @UseGuards(JwtAuthGuard) // <-- ¡PROTEGEMOS LA RUTA!
    create(@Body() company: CreateCompanyDto, @Request() req) {
        // --- ¡AÑADE ESTE CONSOLE.LOG AQUÍ! ---
        console.log('--- DTO recibido en el Controlador ---');
        console.log(company);

        // Obtenemos el ID del usuario del token JWT que el guardián ya validó
        const userId = req.user.id;

        // Llamamos al servicio con los datos del formulario y el ID del usuario
        return this.companiesService.create(company, userId);
    }

    /**
   * Endpoint para que un Admin del Sistema apruebe una compañía.
   * @param id El ID de la compañía a aprobar.
   */
    @Patch(':id/approve')
    @UseGuards(JwtAuthGuard, JwtRolesGuard) // <-- Aplica ambos guardianes
    @HasRoles(Rol.ADMIN) // <-- Define que solo los ADMIN pueden acceder
    approve(@Param('id', ParseIntPipe) id: number) {
        return this.companiesService.approve(id);
    }

    /**
   * Endpoint para que un COMPANY_ADMIN asigne el rol de DRIVER a un usuario existente.
   */
    @Post('assign-driver')
    @UseGuards(JwtAuthGuard, JwtRolesGuard)
    @HasRoles(Rol.COMPANY_ADMIN)
    assignDriver(@Body() assignDriverDto: AssignDriverDto, @Request() req) {
        const adminUserId = req.user.id;
        return this.companiesService.assignDriver(assignDriverDto, adminUserId);
    }
}
