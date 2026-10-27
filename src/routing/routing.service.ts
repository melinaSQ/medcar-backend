import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DirectionsRequestDto } from './routing.dto';

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  async getDirections(input: DirectionsRequestDto) {
    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) {
      this.logger.error('ORS_API_KEY no está configurada en el backend.');
      throw new ServiceUnavailableException(
        'El servicio de rutas todavía no está configurado.',
      );
    }

    let response: Response;
    try {
      response = await fetch(
        'https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson',
        {
          method: 'POST',
          headers: {
            Authorization: apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/geo+json, application/json',
          },
          body: JSON.stringify({
            coordinates: [
              [input.originLng, input.originLat],
              [input.destinationLng, input.destinationLat],
            ],
          }),
          signal: AbortSignal.timeout(12000),
        },
      );
    } catch {
      this.logger.error('No se pudo conectar con OpenRouteService.');
      throw new BadGatewayException('No se pudo conectar con el servicio de rutas.');
    }

    if (!response.ok) {
      this.logger.warn(`OpenRouteService respondió HTTP ${response.status}.`);
      // Do not return provider response bodies because they can contain key details.
      throw new BadGatewayException('El servicio de rutas rechazó la solicitud.');
    }

    const payload = (await response.json()) as {
      features?: Array<{
        geometry?: { coordinates?: Array<[number, number]> };
        properties?: { summary?: { distance?: number; duration?: number } };
      }>;
    };
    const feature = payload.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    const summary = feature?.properties?.summary;
    if (!coordinates || coordinates.length < 2 || !summary) {
      this.logger.warn('OpenRouteService respondió, pero no incluyó una ruta válida.');
      throw new BadGatewayException('El servicio no devolvió una ruta válida.');
    }

    this.logger.log(
      `OpenRouteService devolvió una ruta válida con ${coordinates.length} puntos.`,
    );

    return {
      coordinates,
      distanceMeters: summary.distance,
      durationSeconds: summary.duration,
    };
  }
}
