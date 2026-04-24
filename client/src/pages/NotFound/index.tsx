import { Link, useTheme } from "@mui/material"


export default function NotFound(){
    const theme = useTheme();
    return (
        <main 
    className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8"
    style={{ backgroundColor: theme.palette.background.default }}
>
    <div className="text-center">
        <p 
            className="text-base font-semibold"
            style={{ color: theme.palette.primary.main }} 
        >
            404
        </p>

        <h1 
        
            className="mt-4 text-5xl font-semibold tracking-tight text-balance sm:text-7xl"
            style={{ color: theme.palette.text.primary }}
        >
            Page not found
        </h1>

        <p 

            className="mt-6 text-lg font-medium text-pretty sm:text-xl/8"
            style={{ color: theme.palette.text.secondary }}
        >
            Sorry, we couldn’t find the page you’re looking for.
        </p>

        <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/" className={`rounded-md px-3.5 py-2.5 text-sm font-semibold shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500`}

                sx = {{
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    textDecoration: 'none',
                    '&:hover': {
                        backgroundColor: theme.palette.primary.light,
                    }
                }}
                
            
            >
                Go back home
            </Link>
        </div>
    </div>
</main>
    )
}