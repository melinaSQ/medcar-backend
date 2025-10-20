export enum AmbulanceStatus {
  /*
  AVAILABLE = 'AVAILABLE',
  IN_SERVICE = 'IN_SERVICE', // Ocupada en un turno o emergencia
  OUT_OF_SERVICE = 'OUT_OF_SERVICE', // En mantenimiento, etc.
*/
  OPERATIONAL = 'OPERATIONAL', // El vehículo está funcional y listo para que un conductor inicie turno
  IN_MAINTENANCE = 'IN_MAINTENANCE', // El vehículo está en el taller, no se puede usar
  OUT_OF_SERVICE = 'OUT_OF_SERVICE', // Retirado temporal o permanentemente por otras razones
}