import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response as ExpressResponse } from 'express';

export interface StandardResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    const response = context.switchToHttp().getResponse<ExpressResponse>();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data: unknown) => ({
        statusCode,
        message: 'Success',
        data: this.transformDecimal(data) as T,
      })),
    );
  }

  private transformDecimal(data: unknown): unknown {
    if (data === null || data === undefined) return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.transformDecimal(item));
    }

    if (typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      // Xử lý Decimal của Prisma sang Number dựa trên cấu trúc đặc trưng
      if (
        obj.constructor?.name === 'Decimal' ||
        (obj.d && obj.s && obj.e !== undefined)
      ) {
        return Number((obj as any).toString());
      }

      const transformed: Record<string, unknown> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          transformed[key] = this.transformDecimal(obj[key]);
        }
      }
      return transformed;
    }

    return data;
  }
}
