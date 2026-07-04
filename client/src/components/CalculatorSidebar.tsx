import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HistoryIcon from '@mui/icons-material/History';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import calculators from '../data/calculators';

const iconMap: Record<string, React.ReactNode> = {
  savings: <SavingsIcon />,
  trending_up: <TrendingUpIcon />,
  show_chart: <ShowChartIcon />,
  account_balance: <AccountBalanceIcon />,
  history: <HistoryIcon />,
  account_balance_wallet: <AccountBalanceWalletIcon />,
  analytics: <AnalyticsIcon />,
  list: <FormatListBulletedIcon />,
};

const CalculatorSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Paper sx={{ p: 2, position: 'sticky', top: '1rem', mt: '1.5rem' }}>
      <Typography variant='subtitle2' color='textSecondary' sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        All Calculators
      </Typography>
      <List disablePadding>
        {calculators.map(calc => (
          <ListItemButton
            key={calc.path}
            selected={location.pathname === calc.path}
            onClick={() => navigate(calc.path)}
            sx={{ borderRadius: 1, mb: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {iconMap[calc.icon] || <SavingsIcon />}
            </ListItemIcon>
            <ListItemText
              primary={calc.title}
              primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
};

export default CalculatorSidebar;
