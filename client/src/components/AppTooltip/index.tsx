// apps/client/src/components/ui/AppTooltip.tsx
import { styled } from '@mui/material/styles';
import Tooltip, {type  TooltipProps, tooltipClasses } from '@mui/material/Tooltip';


// 1. Định nghĩa Style riêng (Shopee Style: Nền trắng, chữ đen, có viền mờ)
const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({theme}) => ({
  // Custom class .MuiTooltip-tooltip
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.background.paper,
    color: 'text.primary', 
    boxShadow: theme.shadows[3], 
    maxWidth: 'none',
    padding: 0,
    margin: 0,
    borderRadius: 4,
  },

  // Custom cái mũi tên (Arrow)
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.palette.background.paper,
  },
}));

// // 2. Interface cho Props (Kế thừa props của MUI + custom nếu cần)
// interface AppTooltipProps extends TooltipProps {
//   // Bạn có thể thêm props riêng nếu muốn, ví dụ: variant="light" | "dark"
// }

// 3. Component chính
export const AppTooltip = ({ children, title, placement = 'top', arrow = true, ...props }: TooltipProps) => {

  return (
    <StyledTooltip
      title={title}
      placement={placement}
      arrow={arrow}
      {...props}
    >
      {children}
    </StyledTooltip>
  );
};