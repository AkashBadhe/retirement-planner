import { createTheme } from '@mui/material/styles';

// Finance-focused color palette
// Primary: Deep navy blue — trust, stability, professionalism
// Secondary: Emerald green — growth, wealth, positive returns
// Accent: Amber/gold — prosperity, premium feel
// Error: Muted red — losses, warnings

const theme = createTheme({
  palette: {
    primary: {
      main: '#1a3a5c',
      light: '#2d5a8a',
      dark: '#0f2440',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2e7d5b',
      light: '#4caf80',
      dark: '#1b5e3d',
      contrastText: '#ffffff',
    },
    error: {
      main: '#c0392b',
      light: '#e57373',
      dark: '#8e2420',
    },
    warning: {
      main: '#d4a017',
      light: '#f2c94c',
      dark: '#a67c00',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a2a3a',
      secondary: '#546e7a',
    },
    divider: '#dce3e8',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      color: '#1a3a5c',
    },
    h5: {
      fontWeight: 600,
      color: '#1a3a5c',
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(26, 58, 92, 0.3)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: '#2d5a8a',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1a3a5c',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 4px rgba(26, 58, 92, 0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(26, 58, 92, 0.08)',
          border: '1px solid #dce3e8',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(26, 58, 92, 0.14)',
            borderColor: '#2d5a8a',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(26, 58, 92, 0.12)',
        },
      },
    },
  },
});

export default theme;
