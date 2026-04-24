import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@/common/enums';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, body, ip } = request;

    return next.handle().pipe(
      tap(async () => {
        // Only log mutations (POST, PATCH, PUT, DELETE) for Admin users
        if (
          user &&
          user.role === Role.ADMIN &&
          ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)
        ) {
          const controllerName = context.getClass().name;
          const moduleName = controllerName.replace('Controller', '');
          const action = `${method}_${moduleName}`.toUpperCase();

          try {
            await (this.prisma as any).auditLog.create({
              data: {
                user_id: user.sub || user.id,
                action,
                module: moduleName,
                method,
                path: url,
                payload: body || undefined,
                ip_address:
                  ip ||
                  request.get('x-forwarded-for') ||
                  request.connection.remoteAddress,
              },
            });
          } catch (error) {
            // Silently log error to console to not disrupt the main flow
            console.error('Audit Log Interceptor Error:', error);
          }
        }
      }),
    );
  }
}
