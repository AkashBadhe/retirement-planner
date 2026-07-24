import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * The OAuth token is extracted and applied at the app root (AuthProvider),
 * so this page just shows a brief spinner and redirects home.
 */
const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/', { replace: true }), 300);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <CircularProgress />
      <Typography variant='body2' color='textSecondary' sx={{ mt: 2 }}>
        Signing you in…
      </Typography>
    </Box>
  );
};

export default AuthCallbackPage;
