import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';

function Header() {
  return (
    <AppBar position='static'>
      <Toolbar>
        <Typography variant='h6' style={{ flexGrow: 1 }}>
          Retirement Planner
        </Typography>
        <Button color='inherit' component={Link} to='/'>
          Retirement Form
        </Button>
        <Button color='inherit' component={Link} to='/home-planner'>
          Home Planner
        </Button>
        <Button color='inherit' component={Link} to='/rent-calculator'>
          Rent Calculator
        </Button>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
