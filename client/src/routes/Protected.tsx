import { Outlet, Navigate, useLocation } from "react-router";
import { useContext } from "react";
import { AppContext } from "~/contexts/app.context";

/**
 * PrivateRoute: Chỉ cho phép truy cập nếu đã đăng nhập.
 * Đọc isAuthenticated từ AppContext (React state) thay vì LS
 * để phản ánh đúng trạng thái realtime.
 */
export const PrivateRoute = () => {
  const { isAuthenticated } = useContext(AppContext);
  const location = useLocation();
  return isAuthenticated ? <Outlet /> : <Navigate to='/login' state={{ from: location }} replace />;
}

/**
 * RejectedRoute: Chặn người đã đăng nhập vào trang Login/Register.
 */
export const RejectedRoute = () => {
  const { isAuthenticated } = useContext(AppContext);
  return !isAuthenticated ? <Outlet /> : <Navigate to='/' />;
}