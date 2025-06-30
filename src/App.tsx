import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RetirementForm from './components/retirement-planner/RetirementForm';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { Container, CssBaseline } from '@mui/material';
import styled from 'styled-components';
import Footer from './components/Footer';
import Header from './components/Header';
import HomePlanner from './components/home-planner/HomePlanner';
import RentCalculator from './components/rent-calculator/RentCalculator';

// Adjust the Container to include bottom padding
const StyledContainer = styled(Container)`
  padding-bottom: 70px;
`;

function App() {
  return (
    <Router>
      <Header />
      <StyledContainer>
        <CssBaseline />
        <Routes>
          <Route path='/' element={<RetirementForm />} />
          <Route path='/home-planner' element={<HomePlanner />} />
          <Route path='/rent-calculator' element={<RentCalculator />} />
        </Routes>
      </StyledContainer>
      <Footer />
    </Router>
  );
}

export default App;
