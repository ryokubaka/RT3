import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
  useTheme,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  AccountCircle,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Security,
  Settings,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ldapStatus, setLdapStatus] = useState(null);
  const [ldapLoading, setLdapLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const theme = useTheme();

  // Fetch LDAP status on component mount
  useEffect(() => {
    fetchLdapStatus();
  }, []);

  const fetchLdapStatus = async () => {
    try {
      const response = await fetch(getApiUrl('/team-roster/ldap/status'));
      if (response.ok) {
        const status = await response.json();
        setLdapStatus(status);
      }
    } catch (error) {
      console.error('Failed to fetch LDAP status:', error);
    }
  };

  const toggleLdap = async (enabled) => {
    setLdapLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/team-roster/ldap/toggle'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        await fetchLdapStatus();
      } else {
        console.error('Failed to toggle LDAP');
      }
    } catch (error) {
      console.error('Error toggling LDAP:', error);
    } finally {
      setLdapLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(username, password);
      
      if (success) {
        // Get the location state for redirect
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const getLdapStatusColor = () => {
    if (!ldapStatus) return 'default';
    return ldapStatus.enabled ? 'success' : 'default';
  };

  const getLdapStatusText = () => {
    if (!ldapStatus) return 'Unknown';
    return ldapStatus.enabled ? 'Enabled' : 'Disabled';
  };

  const getLdapInfoText = () => {
    if (!ldapStatus || !ldapStatus.enabled) {
      return 'Using local authentication';
    }
    return `Using ${ldapStatus.label || 'LDAP'} authentication (${ldapStatus.host}:${ldapStatus.port})`;
  };

  return (
    <Box 
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.palette.background.default,
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              color: theme.palette.primary.main,
              mb: 1
            }}
          >
            RT3
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary"
            sx={{ fontWeight: 400 }}
          >
            Red Team Training Tracker
          </Typography>
        </Box>

        <Card 
          elevation={0} 
          sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Box 
              sx={{ 
                backgroundColor: theme.palette.primary.main,
                py: 3,
                px: 4,
                textAlign: 'center'
              }}
            >
              <Typography 
                variant="h5" 
                component="h2" 
                sx={{ 
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                Login to your account
              </Typography>
            </Box>
            <Box sx={{ p: 4 }}>
              {/* LDAP Status Display */}
              <Box sx={{ 
                mb: 3, 
                p: 2, 
                borderRadius: 2, 
                backgroundColor: theme.palette.background.paper,
                border: '1px solid',
                borderColor: theme.palette.divider
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Security color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Authentication Method
                    </Typography>
                  </Box>
                  <Chip
                    icon={ldapStatus?.enabled ? <CheckCircle /> : <Cancel />}
                    label={getLdapStatusText()}
                    color={getLdapStatusColor()}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {getLdapInfoText()}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Settings color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">
                      LDAP Authentication
                    </Typography>
                  </Box>
                  <Tooltip title={ldapLoading ? 'Updating...' : 'Toggle LDAP authentication'}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={ldapStatus?.enabled || false}
                          onChange={(e) => toggleLdap(e.target.checked)}
                          disabled={ldapLoading}
                          size="small"
                        />
                      }
                      label=""
                    />
                  </Tooltip>
                </Box>
              </Box>

              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 1,
                    '& .MuiAlert-icon': {
                      color: theme.palette.error.main
                    }
                  }}
                >
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircle color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleClickShowPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ 
                    mt: 3, 
                    mb: 2,
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '1rem',
                    boxShadow: '0 4px 10px rgba(60, 110, 180, 0.3)',
                    '&:hover': {
                      boxShadow: '0 6px 15px rgba(60, 110, 180, 0.4)',
                    }
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </Box>
          </CardContent>
        </Card>
  
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} RT3 - Red Team Training Tracker
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login; 