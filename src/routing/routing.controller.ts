import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { DirectionsRequestDto } from './routing.dto';
import { RoutingService } from './routing.service';

@Controller('routing')
@UseGuards(JwtAuthGuard)
export class RoutingController {
  private readonly logger = new Logger(RoutingController.name);

  constructor(private readonly routingService: RoutingService) {}

  @Post('directions')
  @HttpCode(HttpStatus.OK)
  getDirections(@Body() input: DirectionsRequestDto) {
    this.logger.log('Petición de ruta recibida en POST /routing/directions.');
    return this.routingService.getDirections(input);
  }
}
