export enum ServiceRequestStatus {
  SEARCHING = 'SEARCHING',   // El sistema está buscando una ambulancia disponible
  ASSIGNED = 'ASSIGNED',     // Una ambulancia ha aceptado, pero aún no se mueve
  ON_THE_WAY = 'ON_THE_WAY', // El conductor está en camino hacia el cliente
  ON_SITE = 'ON_SITE',       // El conductor ha llegado a la ubicación del cliente
  TRAVELLING = 'TRAVELLING',   // El paciente está siendo transportado al hospital
  COMPLETED = 'COMPLETED',   // El servicio ha finalizado con éxito
  CANCELED = 'CANCELED',     // El servicio fue cancelado por el cliente o el sistema
}