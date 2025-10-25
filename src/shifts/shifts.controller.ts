import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { HasRoles } from 'src/auth/jwt/jwt-roles.decorator';
import { Rol } from 'src/common/enums/rol.enum';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { StartShiftDto } from './dto/start-shift.dto';

@Controller('shifts')
@UseGuards(JwtAuthGuard, JwtRolesGuard)
export class ShiftsController {
    constructor(private readonly shiftsService: ShiftsService) { }

    //http://localhost:3000/shifts

    /**
     * Endpoint para que un COMPANY_ADMIN genere un código de turno.
     */
    @Post('generate-code')
    @HasRoles(Rol.COMPANY_ADMIN)
    generateShiftCode(@Body() generateCodeDto: GenerateCodeDto, @Request() req) {
        const adminUserId = req.user.id;
        return this.shiftsService.generateShiftCode(generateCodeDto, adminUserId);
    }

    /**
     * Endpoint para que un DRIVER inicie su turno.
     */
    @Post('start')
    @HasRoles(Rol.DRIVER)
    startShift(@Body() startShiftDto: StartShiftDto, @Request() req) {
        const driverId = req.user.id;
        return this.shiftsService.startShift(startShiftDto, driverId);
    }

    /**
   * Endpoint para que un DRIVER finalice su turno activo.
   */
    @Post('end')
    @HasRoles(Rol.DRIVER)
    endShift(@Request() req) {
        // Obtenemos el ID del conductor directamente del token JWT validado.
        const driverId = req.user.id;
        return this.shiftsService.endShift(driverId);
    }
}