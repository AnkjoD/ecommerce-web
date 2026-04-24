import { Request } from 'express';
import { Role } from '@/common/enums';
import { JwtPayload } from '@/auth/interfaces/jwt-payload.interface';

/**
 * Mở rộng kiểu Request của Express để thêm trường user.
 * Sau khi AtStrategy.validate() chạy xong, NestJS tự động gắn
 * kết quả trả về vào req.user — tức là object JwtPayload.
 *
 * Tại sao role phải là Role (enum) thay vì string?
 * → JWT lưu role là chuỗi "customer" / "admin".
 * → TypeScript không tự biết "customer" thuộc Role enum.
 * → Khai báo rõ Role ở đây giúp IDE autocomplete và bắt lỗi
 *   khi bạn so sánh nhầm (ví dụ viết sai "costumer").
 */
export interface RequestWithUser extends Request {
  user: JwtPayload; // { sub: userId, role: Role, iat, exp }
}
