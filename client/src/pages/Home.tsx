import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Grid,
} from '@mui/material';
import styled from 'styled-components';
import SavingsIcon from '@mui/icons-material/Savings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HistoryIcon from '@mui/icons-material/History';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import calculators from '../data/calculators';

const StyledGrid = styled(Grid)`
  padding: 2rem 0;
`;

const StyledCard = styled(Card)`
  height: 100%;
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-4px);
  }
`;

const IconWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
`;

const iconMap: Record<string, React.ReactNode> = {
  savings: <SavingsIcon sx={{ fontSize: 48 }} color='primary' />,
  trending_up: <TrendingUpIcon sx={{ fontSize: 48 }} color='primary' />,
  show_chart: <ShowChartIcon sx={{ fontSize: 48 }} color='primary' />,
  account_balance: <AccountBalanceIcon sx={{ fontSize: 48 }} color='primary' />,
  history: <HistoryIcon sx={{ fontSize: 48 }} color='primary' />,
  account_balance_wallet: <AccountBalanceWalletIcon sx={{ fontSize: 48 }} color='primary' />,
};

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <StyledGrid container spacing={3}>
      {calculators.map(calc => (
        <Grid item xs={12} sm={6} md={4} key={calc.path}>
          <StyledCard>
            <CardActionArea onClick={() => navigate(calc.path)}>
              <CardContent>
                <IconWrapper>
                  {iconMap[calc.icon] || <SavingsIcon sx={{ fontSize: 48 }} color='primary' />}
                </IconWrapper>
                <Typography variant='h6' align='center' gutterBottom>
                  {calc.title}
                </Typography>
                <Typography
                  variant='body2'
                  color='textSecondary'
                  align='center'
                >
                  {calc.description}
                </Typography>
              </CardContent>
            </CardActionArea>
          </StyledCard>
        </Grid>
      ))}
    </StyledGrid>
  );
};

export default Home;
