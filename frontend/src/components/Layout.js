import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Container,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as MissionsIcon,
  People as UsersIcon,
  Group as TeamRosterIcon,
  Assessment as JQRIcon,
  Assessment as ReportsIcon,
  CalendarMonth as CalendarIcon,
  School as TrainingIcon,
  Logout as LogoutIcon,
  Person as ProfileIcon,
  Assessment as AssessmentIcon,
  Notifications as NotificationsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import { getAvatarUrl } from '../utils/apiConfig';

const drawerWidth = 250;

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useThemeContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavItemClick = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Profile', icon: <ProfileIcon />, path: '/profile' },
    { text: 'Team Roster', icon: <TeamRosterIcon />, path: '/team-roster' },
    { text: 'Missions', icon: <MissionsIcon />, path: '/missions' },
    { text: 'JQR Questionnaire', icon: <JQRIcon />, path: '/jqr' },
    { text: 'Training Management', icon: <TrainingIcon />, path: '/training-management' },
    { text: 'Assessments', icon: <AssessmentIcon />, path: '/assessments' },
    { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
    { text: 'Reports', icon: <ReportsIcon />, path: '/reports' },
  ];

  const drawer = (
    <div>
      <Box sx={{ 
        py: 2, 
        px: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: darkMode ? '#1e1e1e' : theme.palette.primary.main
      }}>
        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 600 }}>
          RT3
        </Typography>
      </Box>
      <List sx={{ pt: 2 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem
              button
              key={item.text}
              onClick={() => handleNavItemClick(item.path)}
              sx={{
                mb: 0.5,
                mx: 1,
                borderRadius: '4px',
                backgroundColor: isSelected ? 
                  darkMode ? 'rgba(255, 255, 255, 0.08)' : `${theme.palette.primary.light}15` : 'transparent',
                color: isSelected ? theme.palette.primary.main : theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.12)' : `${theme.palette.primary.light}20`,
                }
              }}
            >
              <ListItemIcon sx={{ 
                minWidth: 40, 
                color: isSelected ? theme.palette.primary.main : theme.palette.text.secondary 
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '0.9rem'
                }} 
              />
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ my: 2 }} />
      <List>
        <ListItem 
          button 
          onClick={handleLogout}
          sx={{
            mx: 1,
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: darkMode ? 'rgba(255, 0, 0, 0.12)' : `${theme.palette.error.light}15`,
              color: theme.palette.error.main
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutIcon sx={{ color: theme.palette.error.main }} />
          </ListItemIcon>
          <ListItemText 
            primary="Logout" 
            primaryTypographyProps={{ 
              fontWeight: 500,
              fontSize: '0.9rem'
            }} 
          />
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: darkMode ? '#1e1e1e' : '#fff',
          color: theme.palette.text.primary,
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              color: darkMode ? '#fff' : theme.palette.primary.main 
            }}
          >
            {menuItems.find(item => item.path === location.pathname)?.text || 'RT3'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              <IconButton 
                size="large" 
                color="inherit" 
                onClick={toggleDarkMode}
                sx={{ mr: 1 }}
              >
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Notifications">
              <IconButton size="large" color="inherit" sx={{ mr: 1 }}>
                <NotificationsIcon />
              </IconButton>
            </Tooltip>
            
            <Box
              onClick={handleMenuClick}
              sx={{
                display: 'flex', 
                alignItems: 'center',
                p: 0.5,
                ml: 1,
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              <Avatar
                src={user?.avatar ? getAvatarUrl(user.operator_handle, user.avatar.filename) : undefined}
                alt={user?.name}
                sx={{ width: 40, height: 40 }}
              />
              <Box sx={{ ml: 1, display: { xs: 'none', md: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {user?.name || 'User'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  {user?.role || 'User'}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 180
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <ProfileIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <Typography variant="body2">Profile</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" color="error" />
              </ListItemIcon>
              <Typography variant="body2" color="error.main">Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
              backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
              backgroundColor: darkMode ? '#1e1e1e' : '#FBFBFB',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          backgroundColor: theme.palette.background.default,
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        <Container maxWidth="xl">
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default Layout; 