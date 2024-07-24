import RetirementForm from './components/RetirementForm';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { Container, CssBaseline } from '@mui/material';
import styled from 'styled-components';
import Footer from './components/Footer';
import Header from './components/Header';

// Adjust the Container to include bottom padding
const StyledContainer = styled(Container)`
  padding-bottom: 70px;
`;

function App() {
  return (
    <>
      <Header />
      <StyledContainer>
        <CssBaseline />
        <RetirementForm />
      </StyledContainer>
      <Footer />
    </>
  );
}

export default App;
