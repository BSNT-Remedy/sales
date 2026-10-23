import { PropsWithChildren, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  AddShoppingCart,
  Assignment,
  Logout,
  Menu as MenuIcon,
  PointOfSale,
} from '@mui/icons-material';
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 248;

const navigation = [
  { label: 'Sales orders', path: '/orders', icon: <Assignment /> },
  { label: 'Create order', path: '/orders/new', icon: <AddShoppingCart /> },
];

export default function AppLayout({ children }: PropsWithChildren) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 3, py: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box className="brand-mark"><PointOfSale /></Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={800} lineHeight={1.2}>Sales Desk</Typography>
          <Typography variant="caption" color="text.secondary">ORDER MANAGEMENT</Typography>
        </Box>
      </Box>
      <Typography variant="overline" color="text.secondary" sx={{ px: 3, mt: 2, mb: 1 }}>
        WORKSPACE
      </Typography>
      <List sx={{ px: 1.5 }}>
        {navigation.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            end
            onClick={() => setMobileOpen(false)}
            className="nav-link"
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ p: 2 }}>
        <Box className="sidebar-note">
          <Typography variant="body2" fontWeight={700}>Keep orders moving</Typography>
          <Typography variant="caption" color="text.secondary">
            Drafts can be updated before confirmation.
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" elevation={0} className="topbar">
        <Toolbar sx={{ minHeight: '72px !important', px: { xs: 2, md: 4 } }}>
          <IconButton
            color="inherit"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' }, mr: 1 }}
            aria-label="Open navigation"
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Button color="inherit" startIcon={<Logout />} onClick={logout}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid #e7ebf2' },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Toolbar sx={{ minHeight: '72px !important' }} />
        <Box className="page-container">{children}</Box>
      </Box>
    </Box>
  );
}
