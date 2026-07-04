import React from 'react';
import { Grid } from '@mui/material';
import WatchlistTable from '../components/WatchlistTable';
import CalculatorSidebar from '../components/CalculatorSidebar';

const WatchlistPage: React.FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={9}>
        <WatchlistTable />
      </Grid>
      <Grid item xs={12} md={3} sx={{ display: { xs: 'none', md: 'block' } }}>
        <CalculatorSidebar />
      </Grid>
    </Grid>
  );
};

export default WatchlistPage;
