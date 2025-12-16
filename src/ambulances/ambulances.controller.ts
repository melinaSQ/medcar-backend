import { Controller, Get, Post, Put, Delete, Patch, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { AmbulancesService } from './ambulances.service';
import { CreateAmbulanceDto } from './dto/create-ambulance.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { Rol } from 'src/common/enums/rol.enum';
import { HasRoles } from 'src/auth/jwt/jwt-roles.decorator';
import { AmbulanceStatus } from 'src/common/enums/ambulance-status.enum';

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

    /**
     * Endpoint para que un COMPANY_ADMIN actualice una ambulancia de su compañía.
     */
    @Put(':id')
    @HasRoles(Rol.COMPANY_ADMIN)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateAmbulanceDto: CreateAmbulanceDto,
        @Request() req,
    ) {
        const userId = req.user.id;
        return this.ambulancesService.update(id, updateAmbulanceDto, userId);
    }

    /**
     * Endpoint para que un COMPANY_ADMIN elimine una ambulancia de su compañía.
     */
    @Delete(':id')
    @HasRoles(Rol.COMPANY_ADMIN)
    remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
        const userId = req.user.id;
        return this.ambulancesService.remove(id, userId);
    }

    /**
     * Endpoint para que un COMPANY_ADMIN actualice el estado de una ambulancia.
     */
    @Patch(':id/status')
    @HasRoles(Rol.COMPANY_ADMIN)
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body('status') status: AmbulanceStatus,
        @Request() req,
    ) {
        const userId = req.user.id;
        return this.ambulancesService.updateStatus(id, status, userId);
    }
}
