import {
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { Company } from 'src/companies/company.entity';
import { CompanyStatus } from 'src/common/enums/company-status.enum';
import { User } from 'src/users/user.entity';
import { Rol } from 'src/common/enums/rol.enum';
import { ServiceRequest } from 'src/service_requests/service_request.entity';
import { Shift } from 'src/shifts/shift.entity';
import { Rating } from 'src/ratings/rating.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ServiceRequest)
    private readonly serviceRequestRepository: Repository<ServiceRequest>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Empresas pendientes de aprobación (para app móvil admin).
   */
  async getPendingCompanies() {
    const companies = await this.companyRepository.find({
      where: { status: CompanyStatus.PENDING },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      ruc: c.ruc,
      phone: c.phone,
      email: c.user?.email,
    }));
  }

  /**
   * Listado de usuarios con búsqueda opcional (nombre, apellido, email).
   */
  async findAllUsers(search?: string) {
    const q = search?.trim();
    const qb = this.userRepository
      .createQueryBuilder('u')
      .orderBy('u.id', 'ASC');

    if (q) {
      qb.where(
        '(u.name LIKE :q OR u.lastname LIKE :q OR u.email LIKE :q OR u.phone LIKE :q)',
        { q: `%${q}%` },
      );
    }

    const users = await qb.getMany();
    return users.map((user) => {
      const { password, ...rest } = user;
      return rest;
    });
  }

  /**
   * Lista solicitudes pendientes de cambio de contacto.
   */
  async getPendingContactChangeRequests(search?: string) {
    const q = search?.trim();
    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('(u.pendingEmail IS NOT NULL OR u.pendingPhone IS NOT NULL)')
      .orderBy('u.contactChangeRequestedAt', 'ASC');

    if (q) {
      qb.andWhere(
        '(u.name LIKE :q OR u.lastname LIKE :q OR u.email LIKE :q OR u.phone LIKE :q)',
        { q: `%${q}%` },
      );
    }

    const users = await qb.getMany();
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      lastname: u.lastname,
      currentEmail: u.email,
      currentPhone: u.phone,
      requestedEmail: u.pendingEmail,
      requestedPhone: u.pendingPhone,
      requestedAt: u.contactChangeRequestedAt,
    }));
  }

  async approveContactChange(userId: number) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    if (!user.pendingEmail && !user.pendingPhone) {
      throw new ConflictException(
        'El usuario no tiene solicitudes pendientes de contacto.',
      );
    }

    if (user.pendingEmail && user.pendingEmail !== user.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: user.pendingEmail },
      });
      if (existingEmail && existingEmail.id !== user.id) {
        throw new ConflictException(
          'No se puede aprobar: el correo solicitado ya está en uso.',
        );
      }
      user.email = user.pendingEmail;
    }

    if (user.pendingPhone && user.pendingPhone !== user.phone) {
      const existingPhone = await this.userRepository.findOne({
        where: { phone: user.pendingPhone },
      });
      if (existingPhone && existingPhone.id !== user.id) {
        throw new ConflictException(
          'No se puede aprobar: el teléfono solicitado ya está en uso.',
        );
      }
      user.phone = user.pendingPhone;
    }

    user.pendingEmail = null;
    user.pendingPhone = null;
    user.contactChangeRequestedAt = null;

    const saved = await this.userRepository.save(user);
    this.notificationsGateway.emitSystemAdminQueuesUpdated('contact_change_resolved');
    this.notificationsGateway.emitUserProfileUpdated(
      user.id,
      'contact_change_approved',
    );
    const { password, ...rest } = saved;
    return rest;
  }

  async rejectContactChange(userId: number) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    if (!user.pendingEmail && !user.pendingPhone) {
      throw new ConflictException(
        'El usuario no tiene solicitudes pendientes de contacto.',
      );
    }

    user.pendingEmail = null;
    user.pendingPhone = null;
    user.contactChangeRequestedAt = null;
    await this.userRepository.save(user);
    this.notificationsGateway.emitSystemAdminQueuesUpdated('contact_change_resolved');
    this.notificationsGateway.emitUserProfileUpdated(
      user.id,
      'contact_change_rejected',
    );
  }

  async blockUser(targetUserId: number, adminUserId: number) {
    if (targetUserId === adminUserId) {
      throw new ForbiddenException('No puedes bloquear tu propia cuenta.');
    }
    const user = await this.userRepository.findOneBy({ id: targetUserId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    if (user.roles.includes(Rol.ADMIN)) {
      throw new ForbiddenException('No se puede bloquear a otro administrador del sistema.');
    }
    user.isBlocked = true;
    await this.userRepository.save(user);
    this.notificationsGateway.disconnectUserSockets(targetUserId);
    this.notificationsGateway.emitSystemAdminQueuesUpdated('user_blocked');
  }

  async unblockUser(targetUserId: number, adminUserId: number) {
    if (targetUserId === adminUserId) {
      throw new ForbiddenException('No puedes desbloquear tu propia cuenta desde aquí.');
    }
    const user = await this.userRepository.findOneBy({ id: targetUserId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    if (!user.isBlocked) {
      throw new ConflictException('El usuario no está bloqueado.');
    }
    user.isBlocked = false;
    await this.userRepository.save(user);
    this.notificationsGateway.emitSystemAdminQueuesUpdated('user_unblocked');
  }

  async deleteUser(targetUserId: number, adminUserId: number) {
    if (targetUserId === adminUserId) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta.');
    }
    const user = await this.userRepository.findOneBy({ id: targetUserId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    if (user.roles.includes(Rol.ADMIN)) {
      throw new ForbiddenException('No se puede eliminar a un administrador del sistema.');
    }

    const company = await this.companyRepository.findOne({
      where: { user: { id: targetUserId } },
    });
    if (company) {
      throw new ConflictException(
        'El usuario administra una empresa. Elimina o transfiere la empresa antes.',
      );
    }

    const srCount = await this.serviceRequestRepository.count({
      where: { client: { id: targetUserId } },
    });
    if (srCount > 0) {
      throw new ConflictException(
        'El usuario tiene solicitudes de servicio asociadas. Usa bloqueo en su lugar.',
      );
    }

    const shiftCount = await this.shiftRepository.count({
      where: { driver: { id: targetUserId } },
    });
    if (shiftCount > 0) {
      throw new ConflictException(
        'El usuario tiene turnos registrados. No se puede eliminar.',
      );
    }

    const ratingAsRater = await this.ratingRepository.count({
      where: { rater: { id: targetUserId } },
    });
    const ratingAsRated = await this.ratingRepository.count({
      where: { rated: { id: targetUserId } },
    });
    if (ratingAsRater + ratingAsRated > 0) {
      throw new ConflictException(
        'El usuario tiene calificaciones asociadas. Usa bloqueo en su lugar.',
      );
    }

    await this.userRepository.remove(user);
  }

  /**
   * Todas las solicitudes donde el usuario actuó como cliente (auditoría).
   */
  async getUserServiceRequestHistory(userId: number) {
    return this.serviceRequestRepository.find({
      where: { client: { id: userId } },
      relations: [
        'client',
        'shift',
        'shift.ambulance',
        'shift.ambulance.company',
        'shift.driver',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Historial global de solicitudes (sin filtro por empresa).
   */
  async getGlobalServiceRequests() {
    return this.serviceRequestRepository.find({
      relations: [
        'client',
        'shift',
        'shift.ambulance',
        'shift.ambulance.company',
        'shift.driver',
      ],
      order: { createdAt: 'DESC' },
    });
  }
}
