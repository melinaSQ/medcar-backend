import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { JwtRolesGuard } from 'src/auth/jwt/jwt-roles.guard';
import { HasRoles } from 'src/auth/jwt/jwt-roles.decorator';
import { Rol } from 'src/common/enums/rol.enum';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, JwtRolesGuard)
@HasRoles(Rol.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('companies/pending')
  getPendingCompanies() {
    return this.adminService.getPendingCompanies();
  }

  @Get('users')
  findAllUsers(@Query('q') q?: string) {
    return this.adminService.findAllUsers(q);
  }

  @Get('users/contact-change-requests')
  getPendingContactChangeRequests(@Query('q') q?: string) {
    return this.adminService.getPendingContactChangeRequests(q);
  }

  @Patch('users/:id/block')
  blockUser(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.adminService.blockUser(id, req.user.id);
  }

  @Patch('users/:id/unblock')
  unblockUser(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.adminService.unblockUser(id, req.user.id);
  }

  @Patch('users/:id/contact-change/approve')
  approveContactChange(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.approveContactChange(id);
  }

  @Patch('users/:id/contact-change/reject')
  rejectContactChange(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.rejectContactChange(id);
  }

  @Delete('users/:id')
  deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.adminService.deleteUser(id, req.user.id);
  }

  @Get('users/:id/service-requests')
  getUserHistory(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUserServiceRequestHistory(id);
  }

  @Get('service-requests')
  getGlobalHistory() {
    return this.adminService.getGlobalServiceRequests();
  }
}
