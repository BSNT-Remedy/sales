import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LockOutlined, PointOfSale } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(username, password);
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
      navigate(from || '/orders', { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('The username or password is incorrect, or this account is inactive.');
      } else if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('This account is not allowed to access the Sales API. Ask an administrator to check its access.');
      } else if (axios.isAxiosError(err) && err.response) {
        setError('The server rejected the sign-in request. Check that the backend is configured and migrations have been applied.');
      } else {
        setError('Cannot reach the API. Start the Django backend and check the development API proxy.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="login-shell">
      <Container maxWidth="sm">
        <Box className="login-brand">
          <Box className="brand-mark"><PointOfSale /></Box>
          <Typography variant="h6" fontWeight={800}>Sales Desk</Typography>
        </Box>
        <Paper className="login-card" elevation={0}>
          <Box className="login-icon"><LockOutlined /></Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>Welcome back</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Sign in with your Django account to manage sales orders.
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            There is no public registration. Ask your administrator for an account, or create a local admin with
            {' '}<code>python manage.py createsuperuser</code> from the backend folder.
          </Alert>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={submit} noValidate>
            <TextField
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              fullWidth
              autoFocus
              margin="normal"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              fullWidth
              margin="normal"
            />
            <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 3 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
