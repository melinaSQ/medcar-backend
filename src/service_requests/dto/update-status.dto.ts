import { IsEnum, IsNotEmpty } from 'class-validator';
import { ServiceRequestStatus } from 'src/common/enums/service-request-status.enum';

export class UpdateStatusDto {
  @IsEnum(ServiceRequestStatus)
  @IsNotEmpty()
  status: ServiceRequestStatus;
}