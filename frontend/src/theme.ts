import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#3458d4', dark: '#2846b0', light: '#edf1ff' },
    background: { default: '#f6f8fb', paper: '#ffffff' },
    text: { primary: '#1c2434', secondary: '#788396' },
    divider: '#e8ecf2',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
    h4: { fontSize: '1.85rem', letterSpacing: '-0.035em' },
    h6: { fontSize: '1.05rem', letterSpacing: '-0.015em' },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, paddingLeft: 16, paddingRight: 16, minHeight: 40 },
      },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 12 } } },
    MuiTableCell: {
      styleOverrides: {
        head: { color: '#7e899b', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em' },
        root: { borderColor: '#edf0f4' },
      },
    },
  },
});
