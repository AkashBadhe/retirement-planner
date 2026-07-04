import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { Container, CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import styled from 'styled-components';
import { HashRouter, Routes, Route } from 'react-router-dom';
import theme from './theme';
import Footer from './components/Footer';
import Header from './components/Header';
import Home from './pages/Home';
import RetirementPlannerPage from './pages/RetirementPlannerPage';
import SipCalculatorPage from './pages/SipCalculatorPage';
import CagrCalculatorPage from './pages/CagrCalculatorPage';
import EmiCalculatorPage from './pages/EmiCalculatorPage';
import SipReturnsPage from './pages/SipReturnsPage';
import SwpCalculatorPage from './pages/SwpCalculatorPage';
import StockIntrinsicValuePage from './pages/StockIntrinsicValuePage';
import WatchlistPage from './pages/WatchlistPage';

// Adjust the Container to include bottom padding
const StyledContainer = styled(Container)`
  padding-bottom: 70px;
`;

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Header />
        <StyledContainer>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/retirement-planner' element={<RetirementPlannerPage />} />
            <Route path='/sip-calculator' element={<SipCalculatorPage />} />
            <Route path='/cagr-calculator' element={<CagrCalculatorPage />} />
            <Route path='/emi-calculator' element={<EmiCalculatorPage />} />
            <Route path='/sip-returns' element={<SipReturnsPage />} />
            <Route path='/swp-calculator' element={<SwpCalculatorPage />} />
            <Route path='/stock-intrinsic-value' element={<StockIntrinsicValuePage />} />
            <Route path='/watchlist' element={<WatchlistPage />} />
          </Routes>
        </StyledContainer>
        <Footer />
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
