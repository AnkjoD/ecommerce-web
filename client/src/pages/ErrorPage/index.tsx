import { Box, Container, Typography, Button } from '@mui/material';

const ErrorPage = () => {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: 'background.default',
        py: { xs: 8, lg: 16 },
        px: 4,
        minHeight: '100vh', 
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            maxWidth: 'sm',
            mx: 'auto',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="h1"
            component="h1"
            sx={{
              mb: 4,
              letterSpacing: '-0.05em',
              fontWeight: 800,
              fontSize: { xs: '4.5rem', lg: '8rem' },
              color: 'primary.main',
            }}
          >
            404
          </Typography>

          <Typography
            variant="h3"
            component="p"
            sx={{
              mb: 4,
              fontWeight: 'bold',
              letterSpacing: '-0.025em',
              color: 'text.primary',
              fontSize: { xs: '1.875rem', md: '2.25rem' },
            }}
          >
            Something's missing.
          </Typography>

          <Typography
            variant="body1"
            sx={{
              mb: 4,
              fontWeight: 300,
              color: 'text.secondary',
              fontSize: '1.125rem',
            }}
          >
            Sorry, we can't find that page. You'll find lots to explore on the home page.
          </Typography>

          <Button
            variant="contained"
            size="large"
            href="#"
            sx={{
              my: 4,
              px: 5,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Back to Homepage
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default ErrorPage;