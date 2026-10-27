import { IsLatitude, IsLongitude } from 'class-validator';

export class DirectionsRequestDto {
  @IsLatitude()
  originLat: number;

  @IsLongitude()
  originLng: number;

  @IsLatitude()
  destinationLat: number;

  @IsLongitude()
  destinationLng: number;
}
