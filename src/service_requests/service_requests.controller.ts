import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { Rol } from 'src/common/enums/rol.enum';
import { AssignRequestDto } from './dto/assign-request.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { ServiceRequestsService } from './service_requests.service';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { HasRoles } from 'src/auth/jwt/jwt-roles.decorator';

@Controller('service-requests')
@UseGuards(JwtAuthGuard) // Protegemos todo el controlador con autenticación
export class ServiceRequestsController {
    constructor(private readonly serviceRequestsService: ServiceRequestsService) { }

    /**
     * Endpoint para que un cliente cree una nueva solicitud de emergencia.
     */
    @Post()
    create(@Body() createDto: CreateServiceRequestDto, @Request() req) {
        const clientId = req.user.id;
        return this.serviceRequestsService.create(createDto, clientId);
    }

    /**
     * Endpoint para que un COMPANY_ADMIN vea las solicitudes pendientes.
     */
    @Get('pending')
    @UseGuards(JwtRolesGuard)
    @HasRoles(Rol.COMPANY_ADMIN)
    findAllPending() {
        return this.serviceRequestsService.findAllPending();
    }

    /**
     * Endpoint para que un COMPANY_ADMIN asigne un turno a una solicitud.
     */
    @Patch('assign')
    @UseGuards(JwtRolesGuard)
    @HasRoles(Rol.COMPANY_ADMIN)
    assign(@Body() assignDto: AssignRequestDto, @Request() req) {
        const adminUserId = req.user.id;
        return this.serviceRequestsService.assign(assignDto, adminUserId);
    }
}