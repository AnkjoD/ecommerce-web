// roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@/common/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestWithUser } from '../interfaces/user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Đọc danh sách roles yêu cầu từ Decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu route không yêu cầu role nào, cho phép truy cập
    if (!requiredRoles) {
      return true;
    }

    // Lấy object request và ép kiểu về RequestWithUser
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // Nếu không có user trong request (chưa đăng nhập), từ chối truy cập
    if (!user || !user.role) {
      return false;
    }

    // Kiểm tra xem user có ít nhất 1 role khớp với requiredRoles không
    return requiredRoles.includes(user.role);
  }
}
