import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { Rol } from 'src/common/enums/rol.enum';
import { AssignRequestDto } from './dto/assign-request.dto';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { ServiceRequestsService } from './service_requests.service';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { HasRoles } from 'src/auth/jwt/jwt-roles.decorator';
import { UpdateStatusDto } from './dto/update-status.dto';

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

    /**
   * Endpoint para que un DRIVER actualice el estado de su misión actual.
   */
    @Patch(':id/status')
    @UseGuards(JwtRolesGuard)
    @HasRoles(Rol.DRIVER)
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateStatusDto: UpdateStatusDto,
        @Request() req,
    ) {
        const driverId = req.user.id;
        return this.serviceRequestsService.updateStatus(id, updateStatusDto.status, driverId);
    }

    /**
     * Endpoint para que un cliente cancele su solicitud de emergencia.
     */
    @Patch(':id/cancel')
    cancel(@Param('id', ParseIntPipe) id: number, @Request() req) {
        const clientId = req.user.id;
        return this.serviceRequestsService.cancel(id, clientId);
    }
}