import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AmbulancesService } from './ambulances.service';
import { CreateAmbulanceDto } from './dto/create-ambulance.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { Rol } from 'src/common/enums/rol.enum';
import { HasRoles } from 'src/auth/jwt/roles.decorator';

@Controller('ambulances')
@UseGuards(JwtAuthGuard, JwtRolesGuard) // Protegemos todo el controlador
export class AmbulancesController {
    constructor(private readonly ambulancesService: AmbulancesService) { }

    //http://localhost:3000/ambulances

    /**
     * Endpoint para que un COMPANY_ADMIN registre una nueva ambulancia para su compañía.
     */
    @Post()
    @HasRoles(Rol.COMPANY_ADMIN)
    create(@Body() createAmbulanceDto: CreateAmbulanceDto, @Request() req) {
        const userId = req.user.id;
        return this.ambulancesService.create(createAmbulanceDto, userId);
    }

    /**
     * Endpoint para que un COMPANY_ADMIN vea la lista de todas las ambulancias de su compañía.
     */
    @Get('my-company')
    @HasRoles(Rol.COMPANY_ADMIN)
    findAllByCompany(@Request() req) {
        const userId = req.user.id;
        return this.ambulancesService.findAllByCompany(userId);
    }
}
