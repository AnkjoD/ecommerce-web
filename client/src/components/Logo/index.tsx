import {  Box, Typography } from "@mui/material"
import madokaLogo from '~/assets/img/madoka_light_mode.webp';
import homuraLogo from '~/assets/img/homura_dark_mode.webp';
import {type TypographyVariant} from "@mui/material";
import { useColorMode } from "~/contexts/colormode.context";
import type { SxProps, Theme} from "@mui/system";
import { Link } from "react-router";
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

interface LogoProps {
    size: "small" | "medium" | "large",
    sx?:  SxProps<Theme>
}

function Logo({sx,size = "large"}: LogoProps) {
    const {mode} = useColorMode();
    const isDark = mode === "dark";
    const sizeVariant: Record<LogoProps["size"], TypographyVariant> = {
        small: "h6",
        medium: "h5",
        large: "h4"
    }
    return (
        <Link to = '/' style = {{textDecoration: 'none'}}>
            <Box sx={[
                { textDecoration: 'none', color: 'inherit'},
                ...(Array.isArray(sx) ? sx : [sx])
            ]}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LazyLoadImage src={isDark ? homuraLogo : madokaLogo} width={50} height={50} effect="blur" />
                    <Typography variant={sizeVariant[size]} sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                        {isDark ? "Homura-Chan" : "Madoka-Chan"}
                    </Typography>
                </Box>
            </Box>
        </Link>
    )
}

export default Logo;