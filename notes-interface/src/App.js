import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navigation from './components/Navigation';
import CreateNote from './components/CreateNote';
import ManageNotes from './components/ManageNotes';
import UploadPDF from './components/UploadPDF';
import ScheduleEvent from './components/ScheduleEvent';
import './styles/global.css';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Router>
          <Routes>
            <Route path="/" element={<Navigation />} />
            <Route path="/create-note" element={<CreateNote />} />
            <Route path="/manage-notes" element={<ManageNotes />} />
            <Route path="/upload-pdf" element={<UploadPDF />} />
            <Route path="/schedule-event" element={<ScheduleEvent />} />
          </Routes>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default App;