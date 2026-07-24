// Header.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GoogleIcon from '@mui/icons-material/Google';
import LogoutIcon from '@mui/icons-material/Logout';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import calculators from '../data/calculators';
import InstallButton from './InstallButton';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loginWithGoogle, logout, loading } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = async () => {
    handleMenuClose();
    await logout();
  };

  const currentCalculator = calculators.find(
    c => c.path === location.pathname,
  );
  const isHome = location.pathname === '/';

  return (
    <AppBar position='static' color='primary' elevation={0}>
      <Toolbar>
        {!isHome && (
          <IconButton
            onClick={() => navigate('/')}
            sx={{ color: 'white', mr: 1 }}
            size='small'
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        {isHome && (
          <Box
            component='img'
            src='/logo192.png'
            alt='Investo'
            sx={{ width: 32, height: 32, mr: 1, borderRadius: '4px' }}
          />
        )}
        <Typography
          variant='h6'
          component='div'
          sx={{ color: 'white', cursor: 'pointer', flexGrow: 1 }}
          onClick={() => navigate('/')}
        >
          {currentCalculator ? currentCalculator.title : 'Investo'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InstallButton />
          {!loading && !user && (
            <Button
              size='small'
              variant='outlined'
              startIcon={<GoogleIcon />}
              onClick={loginWithGoogle}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', textTransform: 'none', fontSize: '0.8rem' }}
            >
              Sign in
            </Button>
          )}
          {user && (
            <>
              <IconButton size='small' onClick={handleMenuOpen}>
                <Avatar sx={{ width: 30, height: 30, fontSize: '0.85rem', bgcolor: '#fff', color: '#1a3a5c', fontWeight: 700 }}>
                  {user.email.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { minWidth: 240, mt: 0.5 } } }}
              >
                {/* User info header */}
                <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: '#1a3a5c', color: '#fff', fontWeight: 700 }}>
                    {user.email.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant='body2' fontWeight={600} noWrap>
                      {user.email.split('@')[0]}
                    </Typography>
                    <Typography variant='caption' color='textSecondary' noWrap sx={{ display: 'block' }}>
                      {user.email}
                    </Typography>
                  </Box>
                </Box>
                <Divider />
                <MenuItem onClick={() => { handleMenuClose(); navigate('/watchlist'); }}>
                  <ListItemIcon>
                    <FormatListBulletedIcon fontSize='small' />
                  </ListItemIcon>
                  My Watchlist
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize='small' />
                  </ListItemIcon>
                  Sign out
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
