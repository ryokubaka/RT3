import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Alert,
  Button,
  Avatar,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Divider,
  useTheme,
  Chip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import ImageUpload from './ImageUpload';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl, getDirectImageUrl, getAvatarUrl, getWsUrl } from '../utils/apiConfig';

const Dashboard = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [tempImage, setTempImage] = useState(null);
  const [tempImageId, setTempImageId] = useState(null);
  const [teamMembersCount, setTeamMembersCount] = useState(0);
  const [missionsCount, setMissionsCount] = useState(0);
  const [savedImage, setSavedImage] = useState(null);
  const [savedImageId, setSavedImageId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  const fetchUserData = useCallback(async () => {
    try {
      if (!user) {
        return;
      }

      const response = await fetch(getApiUrl('/team-roster/me'), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      setUserData(userData);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  }, [user]);

  const fetchDashboardImage = useCallback(async () => {
    try {
      if (!user) {
        return;
      }

      
      const response = await fetch(getApiUrl('/images/dashboard'), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch dashboard image. Status:', response.status);
        throw new Error('Failed to fetch dashboard image');
      }

      const imageData = await response.json();
      
      
      if (Array.isArray(imageData) && imageData.length > 0 && imageData[0].direct_url) {
        
        // Use the direct_url as is, since it already includes /uploads/dashboard/
        setSavedImage(imageData[0].direct_url);
        setSavedImageId(String(imageData[0].id));
        
        if (!isEditing) {
          setTempImage(imageData[0].direct_url);
          setTempImageId(String(imageData[0].id));
        }
      } else if (imageData.direct_url) {
        
        // Use the direct_url as is, since it already includes /uploads/dashboard/
        setSavedImage(imageData.direct_url);
        setSavedImageId(String(imageData.id));
        
        if (!isEditing) {
          setTempImage(imageData.direct_url);
          setTempImageId(String(imageData.id));
        }
      } else {
        
        setSavedImage(null);
        setSavedImageId(null);
        
        if (!isEditing) {
          setTempImage(null);
          setTempImageId(null);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard image:', err);
    }
  }, [user, isEditing]);

  const fetchTeamMembersCount = useCallback(async () => {
    try {
      if (!user) {
        return;
      }

      const response = await fetch(getApiUrl('/team-roster/active-count'), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team members count');
      }

      const data = await response.json();
      setTeamMembersCount(data.count);
    } catch (err) {
      console.error('Error fetching team members count:', err);
    }
  }, [user]);

  const fetchMissionsCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(getApiUrl('/missions/count'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch missions count');
      }

      const data = await response.json();
      setMissionsCount(data.count);
    } catch (err) {
      console.error('Error fetching missions count:', err);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUserData();
    fetchDashboardImage();
    fetchTeamMembersCount();
    fetchMissionsCount();

    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;
    const reconnectDelay = 5000;
    let reconnectTimeout = null;
    let shouldReconnect = true;
    let lastConnectionAttempt = 0;
    const minReconnectInterval = 10000;
    let isConnecting = false;

    const connect = () => {
      const now = Date.now();
      if (now - lastConnectionAttempt < minReconnectInterval) {
        
        return;
      }
      lastConnectionAttempt = now;

      if (!shouldReconnect || isConnecting) {
        
        return;
      }

      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        
        return;
      }

      if (ws) {
        ws.close();
      }

      const token = localStorage.getItem('token');
      if (!token) {
        
        shouldReconnect = false;
        return;
      }

      isConnecting = true;
      const wsUrl = `${getWsUrl()}?token=${encodeURIComponent(token)}`;
      
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        
        reconnectAttempts = 0;
        isConnecting = false;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'error' && data.message === 'Unauthorized') {
            
            shouldReconnect = false;
            ws.close();
            return;
          }
          // Handle other message types here
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnecting = false;
        // Don't attempt to reconnect on error, let onclose handle it
      };

      ws.onclose = (event) => {
        
        isConnecting = false;
        
        // Don't reconnect if:
        // 1. It was a normal closure (code 1000)
        // 2. It was an authentication error (code 4000 or 4001)
        // 3. We've exceeded max reconnection attempts
        // 4. It was a 403 Forbidden response
        if (event.code === 1000 || 
            event.code === 4000 || 
            event.code === 4001 || 
            event.code === 403 ||
            reconnectAttempts >= maxReconnectAttempts) {
          
          shouldReconnect = false;
          return;
        }

        reconnectAttempts++;
        
        
        // Clear any existing timeout
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        
        // Set a new timeout for reconnection with exponential backoff
        const backoffDelay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000);
        reconnectTimeout = setTimeout(connect, backoffDelay);
      };
    };

    // Only attempt to connect if we have a valid token
    const token = localStorage.getItem('token');
    if (token) {
      connect();
    }

    return () => {
      shouldReconnect = false;
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [fetchUserData, fetchDashboardImage, fetchTeamMembersCount, fetchMissionsCount]);

  const handleImageUpload = (imageData) => {
    
    if (!imageData || !imageData.id) {
      console.error('Invalid image data received:', imageData);
      setError('No image ID received from server');
      return;
    }
    
    // Convert the ID to a string to ensure consistent handling
    const imageId = String(imageData.id);
    
    
    // Set the temporary image but don't save it as active yet
    // This requires the user to explicitly click "Save"
    // Use the direct_url as is, since it already includes /uploads/dashboard/
    setTempImage(imageData.direct_url);
    setTempImageId(imageId);
    setIsEditing(true);
    setError('');
  };

  const handleImageDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Determine if we're deleting a saved image or a temporary one
      const imageIdToDelete = isEditing ? tempImageId : savedImageId;
      
      if (!imageIdToDelete) {
        throw new Error('No image ID found');
      }

      

      // Use the dashboard-specific delete endpoint
      const response = await fetch(getApiUrl(`/images/dashboard/${imageIdToDelete}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          throw new Error('Only administrators can delete dashboard images');
        }
        throw new Error(errorData.detail || 'Failed to delete image');
      }

      // Reset both the temporary and saved states
      setTempImage(null);
      setTempImageId(null);
      setSavedImage(null);
      setSavedImageId(null);
      setIsEditing(false);
      setError('');
      
      // Refresh the dashboard image from the backend
      await fetchDashboardImage();
    } catch (error) {
      console.error('Error deleting image:', error);
      setError(error.message);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      if (!tempImageId) {
        throw new Error('No image ID found');
      }

      
      
      // Ensure we're passing a numeric ID
      const numericId = parseInt(tempImageId, 10);
      if (isNaN(numericId)) {
        console.error('Invalid image ID format:', tempImageId);
        throw new Error('Invalid image ID format');
      }
      
      

      const response = await fetch(getApiUrl(`/images/dashboard/${numericId}/set-active`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          throw new Error('Only administrators can set dashboard images');
        }
        throw new Error(errorData.detail || 'Failed to save dashboard image');
      }

      try {
        // Parse the response data
        const data = await response.json();
        

        if (data && data.direct_url) {
          // Update the saved image state with the response data
          const directUrl = getDirectImageUrl(data.direct_url);
          setSavedImage(directUrl);
          setSavedImageId(String(data.id));
          setTempImage(directUrl);
          setTempImageId(String(data.id));
        } else {
          // If we don't have direct_url in the response, just use the current temp values
          setSavedImage(tempImage);
          setSavedImageId(tempImageId);
        }
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        // Fall back to using the temp values if parsing fails
        setSavedImage(tempImage);
        setSavedImageId(tempImageId);
      }
      
      // Exit editing mode
      setIsEditing(false);
      setError('');
      
      // Refresh the dashboard image from the backend
      await fetchDashboardImage();
      
      
    } catch (err) {
      console.error('Error saving dashboard image:', err);
      setError(err.message || 'Failed to save dashboard image');
    }
  };

  const handleCancel = () => {
    // Revert to the saved image state
    setTempImage(savedImage);
    setTempImageId(savedImageId);
    setIsEditing(false);
    setError('');
  };
  
  const stats = [
    { title: 'Team Members', value: teamMembersCount.toString(), icon: <PeopleIcon color="primary" />, link: '/team-roster' },
    { title: 'Missions', value: missionsCount.toString(), icon: <AssignmentIcon color="primary" />, link: '/missions' },
  ];

  return (
    <Box sx={{ pt: 2, pb: 6 }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 4, 
            borderRadius: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}
        >
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 5, width: '100%' }}>
        <Card 
          elevation={0}
          sx={{ 
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.08)',
            width: '100%',
          }}
        >
          <CardContent sx={{ pt: 3, pb: 3, width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar
                src={userData?.avatar ? getAvatarUrl(userData.operator_handle, userData.avatar.filename) : undefined}
                alt={userData?.name}
                sx={{ 
                  width: 72, 
                  height: 72, 
                  mr: 3,
                  border: `3px solid ${theme.palette.primary.main}`,
                  boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
                }}
              />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5, color: theme.palette.text.primary }}>
                  Welcome, {user?.name || 'User'}
                </Typography>
                <Chip 
                  label={userData?.role || 'User'} 
                  size="small" 
                  color="primary" 
                  sx={{ 
                    fontWeight: 500,
                    borderRadius: '4px',
                  }} 
                />
              </Box>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <Typography variant="body1" color="text.secondary" paragraph>
              Welcome to RT3 Dashboard. Here you can manage your missions, team roster, and track training progress.
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 3, width: '100%' }}>
              {stats.map((stat, index) => (
                <Grid item xs={12} sm={6} md={6} lg={6} xl={6} key={index} sx={{ flex: '1 1 0', minWidth: 0, display: 'flex' }}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 2, 
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 2,
                      backgroundColor: index % 2 === 0 ? 
                        `${theme.palette.primary.main}08` : 
                        `${theme.palette.secondary.main}08`,
                      border: '1px solid rgba(0,0,0,0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      minHeight: 160,
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.08)'
                      }
                    }}
                    onClick={() => navigate(stat.link)}
                  >
                    <Box sx={{ mb: 1 }}>{stat.icon}</Box>
                    <Typography variant="h4" color="text.primary" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      {stat.title}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            
            <Box sx={{ mt: 2, position: 'relative' }}>
              <Typography variant="h6" color="primary" sx={{ mb: 2, fontWeight: 600 }}>
                Dashboard Image
              </Typography>
              
              {tempImage ? (
                <Card 
                  elevation={0} 
                  sx={{ 
                    borderRadius: 2, 
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <CardMedia
                    component="img"
                    image={tempImage}
                    sx={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '600px',
                      objectFit: 'contain',
                    }}
                  />
                  {userData?.team_role?.includes('ADMIN') && (
                    <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                      <ImageUpload
                        onUpload={handleImageUpload}
                        onDelete={handleImageDelete}
                        currentImageUrl={tempImage}
                        imageType="dashboard"
                        maxSize={10}
                        size={300}
                        hidePreview={true}
                      />
                      
                      {isEditing && (
                        <>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSave}
                            size="small"
                            sx={{ ml: 1 }}
                          >
                            Save
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={handleCancel}
                            size="small"
                            sx={{ ml: 1 }}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </CardActions>
                  )}
                </Card>
              ) : (
                <Card 
                  elevation={0}
                  sx={{ 
                    borderRadius: 2,
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      height: 350,
                      bgcolor: 'rgba(0,0,0,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                    }}
                  >
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                      {userData?.team_role?.includes('ADMIN') ? 'Click to upload a dashboard image' : 'No dashboard image available'}
                    </Typography>
                    
                    {userData?.team_role?.includes('ADMIN') && (
                      <ImageUpload
                        onUpload={handleImageUpload}
                        onDelete={handleImageDelete}
                        currentImageUrl={tempImage}
                        imageType="dashboard"
                        maxSize={10}
                        size={300}
                        hidePreview={true}
                      />
                    )}
                  </Box>
                </Card>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard; 