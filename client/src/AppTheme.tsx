import React, { useState, useMemo, useEffect } from "react";
import { createTheme, ThemeProvider, CssBaseline, type PaletteMode, useMediaQuery, alpha } from "@mui/material";
import { ColorModeContext } from "~/contexts/colormode.context";


export default function AppTheme({ children }: { children: React.ReactNode }) {

    // 1. Check System
    const systemIsDark = useMediaQuery('(prefers-color-scheme: dark)');

    // 2. Khởi tạo State (Logic thông minh)
    const [mode, setMode] = useState<PaletteMode>(() => {
        // Kiểm tra xem trong kho lưu trữ có gì chưa?
        const savedMode = typeof window !== 'undefined' ? localStorage.getItem('themeMode') : null;
        
        if (savedMode === 'light' || savedMode === 'dark') {
            return savedMode; // A. Nếu đã lưu -> Dùng cái đã lưu (Bất chấp System)
        }
        
        // B. Nếu chưa lưu -> Dùng mặc định là Light (hoặc logic khác tùy bạn)
        return 'light'; 
    });

    // 3. Effect để đồng bộ System (Chỉ chạy khi User CHƯA từng chọn thủ công)
    useEffect(() => {
        const savedMode = localStorage.getItem('themeMode');
        
        // Nếu không có savedMode (tức là User chưa can thiệp)
        if (!savedMode) {
            // Thì Web sẽ ngoan ngoãn nghe theo System
            setMode(systemIsDark ? 'dark' : 'light');
        }
    }, [systemIsDark]);

    // 4. Hàm Toggle (Khi bấm nút)
    const colorMode = useMemo(() => ({
        toggleColorMode: () => {
            setMode((prevMode) => {
                const newMode = prevMode === 'light' ? 'dark' : 'light';
                // QUAN TRỌNG: Lưu lựa chọn của User vào kho
                localStorage.setItem('themeMode', newMode); 
                return newMode;
            });
        },
        mode:mode,
    }), [mode]);

    // 5. CẤU HÌNH THEME (BẢNG MÀU KẾT HỢP)
    const theme = useMemo(() => createTheme({
        palette: {
            mode,
            
            ...(mode === 'dark' ? {
                primary: {
                    main: "#6C5CE7", // Electric Royal Purple - Đậm và Rực rỡ hơn
                    light: "#8275E9",
                    dark: "#5A4AD1",
                    contrastText: "#FFFFFF",
                },
                secondary: {
                    main: "#FFB300", // Vibrant Amber Gold
                },
                background: {
                    default: "#050505", // Đen sâu tuyệt đối
                    paper: "#0D0D12", 
                },
                text: {
                    primary: "#FFFFFF",
                    secondary: "#A0A0B0",
                },
                error: {
                    main: "#FF1744",
                },
            } : {
                // Light Mode (Keep it clean but bold)
                text: { 
                    primary: "#111111",
                    secondary: "#444444",
                },
                background: { 
                    default: "#F8F8FA",
                    paper: "#FFFFFF",
                },
                primary: { 
                    main: "#6C5CE7", 
                    light: "#8275E9",
                    dark: "#5A4AD1",
                    contrastText: "#FFFFFF"
                },
                secondary: {
                    main: "#C5A059",
                },
            }),
        },
        typography: {
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            h1: { fontWeight: 900, letterSpacing: '-0.04em', textShadow: '0 2px 10px rgba(108, 92, 231, 0.2)' },
            h2: { fontWeight: 900, letterSpacing: '-0.03em', textShadow: '0 2px 8px rgba(108, 92, 231, 0.15)' },
            h3: { fontWeight: 800 },
            h4: { fontWeight: 800 },
            h5: { fontWeight: 700 },
            h6: { fontWeight: 700 },
            button: { textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.05em' },
            body1: { lineHeight: 1.8 },
        },
        shape: {
            borderRadius: 12
        },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: { 
                        backgroundImage: 'none',
                        backdropFilter: 'blur(20px)',
                        backgroundColor: mode === 'dark' 
                            ? alpha("#0D0D12", 0.9) 
                            : alpha("#FFFFFF", 0.95),
                        boxShadow: mode === 'dark' 
                            ? '0 20px 50px rgba(0,0,0,0.8)' 
                            : '0 10px 40px rgba(108,92,231,0.06)',
                        border: `1px solid ${mode === 'dark' ? alpha("#FFFFFF", 0.08) : alpha("#000000", 0.04)}`,
                        transition: 'all 0.4s ease'
                    }
                }
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 10,
                        padding: '12px 28px',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        '&:hover': {
                            transform: 'translateY(-3px) scale(1.02)',
                        }
                    },
                    containedPrimary: {
                        boxShadow: (theme) => `0 10px 30px ${alpha(theme.palette.primary.main, 0.5)}`,
                        '&:hover': {
                            boxShadow: (theme) => `0 15px 40px ${alpha(theme.palette.primary.main, 0.7)}`,
                        }
                    }
                }
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: mode === 'dark' ? alpha("#0A090F", 0.7) : alpha("#FFFFFF", 0.8),
                        backdropFilter: 'blur(20px)',
                        boxShadow: 'none',
                        borderBottom: `1px solid ${mode === 'dark' ? alpha("#FFFFFF", 0.08) : alpha("#000000", 0.05)}`,
                        color: mode === 'dark' ? "#F3E5F5" : "#1A1A1A",
                    }
                }
            },
            // Xử lý thanh cuộn (Scrollbar) đẹp mắt & Auto dark theo web
            MuiCssBaseline: {
                styleOverrides: {
                    html: {
                        colorScheme: mode === 'dark' ? 'dark' : 'light',
                        scrollBehavior: 'smooth'
                    },
                    body: {
                        scrollbarWidth: 'thin',
                        scrollbarColor: mode === 'dark' ? "#333 #000" : "#ccc #fff",
                        "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
                            width: '6px',
                            height: '6px'
                        },
                        "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
                            borderRadius: 10,
                            backgroundColor: mode === 'dark' ? alpha("#FFFFFF", 0.1) : alpha("#000000", 0.1),
                        },
                        "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover": {
                            backgroundColor: mode === 'dark' ? alpha("#FFFFFF", 0.2) : alpha("#000000", 0.2),
                        }
                    }
                }
            }
        }
    }), [mode]);

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}