import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/dto/jwt/jwt-auth.guard';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';


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
}
