// src/context/ColorModeContext.tsx
import { createContext, useContext } from "react";
import { type PaletteMode } from "@mui/material";

// 1. Định nghĩa kiểu dữ liệu cho Context (giúp gợi ý code tốt hơn)
interface IColorModeContext {
    toggleColorMode: () => void;
    mode: PaletteMode;
}

// 2. Tạo Context
export const ColorModeContext = createContext<IColorModeContext>({
    toggleColorMode: () => {},
    mode: 'light',

});

// 3. Export Hook dùng chung (Component khác chỉ cần gọi cái này)
export const useColorMode = () => useContext(ColorModeContext);