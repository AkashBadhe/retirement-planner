// Header.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import calculators from '../data/calculators';
import InstallButton from './InstallButton';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
        <Box>
          <InstallButton />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
