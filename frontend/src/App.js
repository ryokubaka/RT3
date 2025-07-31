import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useTheme } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Layout from './components/Layout';
import Missions from './components/Missions';
import TeamRoster from './components/TeamRoster';
import JQRQuestionnaire from './components/JQRQuestionnaire';
import TrainingManagement from './components/TrainingManagement';
import Calendar from './components/Calendar';
import Reports from './components/Reports';
import Assessments from './components/Assessments';
import CreateAssessment from './components/CreateAssessment';
import TakeAssessment from './components/TakeAssessment';
import ViewAssessmentResponse from './components/ViewAssessmentResponse';
import EditAssessment from './components/EditAssessment';

const AppContent = () => {
  const { darkMode } = useTheme();

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
      text: {
        primary: darkMode ? '#ffffff' : '#000000',
        secondary: darkMode ? '#a0a0a0' : '#666666',
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            color: darkMode ? '#ffffff' : '#000000',
            borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            color: darkMode ? '#ffffff' : '#000000',
            borderRight: darkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:nth-of-type(even)': {
              backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            },
            '&:nth-of-type(odd)': {
              backgroundColor: darkMode ? '#262626' : '#f5f5f5',
            },
            '&.MuiTableRow-head': {
              backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
            color: darkMode ? '#ffffff' : '#000000',
          },
          head: {
            color: darkMode ? '#ffffff' : '#000000',
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
          },
          indicator: {
            backgroundColor: '#1976d2',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
            '&.Mui-selected': {
              color: '#1976d2',
            },
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#262626' : '#ffffff',
            color: darkMode ? '#ffffff' : '#000000',
            '&.Mui-focused': {
              backgroundColor: darkMode ? '#262626' : '#ffffff',
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            backgroundColor: darkMode ? '#262626' : '#ffffff',
            color: darkMode ? '#ffffff' : '#000000',
          },
          icon: {
            color: darkMode ? 'rgba(255, 255, 255, 0.54)' : 'rgba(0, 0, 0, 0.54)',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: darkMode ? '#262626' : '#ffffff',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            },
            '&.Mui-selected': {
              backgroundColor: darkMode ? 'rgba(25, 118, 210, 0.16)' : 'rgba(25, 118, 210, 0.08)',
              '&:hover': {
                backgroundColor: darkMode ? 'rgba(25, 118, 210, 0.24)' : 'rgba(25, 118, 210, 0.12)',
              },
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: darkMode ? '#262626' : '#ffffff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: darkMode ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: darkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1976d2',
            },
          },
        },
      },
    },
  });

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="missions" element={<Missions />} />
          <Route path="team-roster" element={<TeamRoster />} />
          <Route path="jqr" element={<JQRQuestionnaire />} />
          <Route path="training-management" element={<TrainingManagement />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="reports" element={<Reports />} />
          <Route path="assessments" element={<Assessments />} />
          <Route path="assessments/create" element={<CreateAssessment />} />
          <Route path="assessments/:id/take" element={<TakeAssessment />} />
          <Route path="assessments/:id/edit" element={<EditAssessment />} />
          <Route path="assessments/:assessmentId/responses/:id" element={<ViewAssessmentResponse />} />
        </Route>
      </Routes>
    </MuiThemeProvider>
  );
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
