import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Avatar
} from '@mui/material';
import ImageUpload from './ImageUpload';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl, getAvatarUrl } from '../utils/apiConfig';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
    }
  }, [user]);

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/team-roster/me/email'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update email');
      }

      const data = await response.json();
      updateUser(data);
      setSuccess('Email updated successfully');
    } catch (error) {
      console.error('Error updating email:', error);
      setError('Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/team-roster/me/password'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update password');
      }

      setSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (data) => {
    try {
      
      
      // First, update local state with the avatar data
      if (data && data.id) {
        // We need to make an explicit call to update the avatar in the backend
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Not authenticated');
        }

        
        const updateResponse = await fetch(getApiUrl('/team-roster/me/avatar'), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image_id: data.id })
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({ detail: 'Failed to update avatar' }));
          throw new Error(errorData.detail || 'Failed to update avatar reference');
        }

        // Get the updated user data
        const userData = await updateResponse.json();
        
        
        // Update the user with the complete response from the backend
        updateUser(userData);
        setSuccess('Avatar uploaded and linked successfully');
      }
      // Fallback handling if we don't get an ID
      else if (data && data.direct_url) {
        
        
        // Extract the filename from the direct_url
        const urlParts = data.direct_url.split('/');
        const filename = urlParts[urlParts.length - 1];
        
        // Set temporary UI state with the avatar info
        const updatedUser = {
          ...user,
          avatar: {
            filename: filename,
          },
        };
        
        
        updateUser(updatedUser);
        setError('Avatar uploaded but not properly linked - please try again');
        
        // Try to fetch user data to see if the avatar was linked
        setTimeout(() => {
          fetchUserData();
        }, 500);
      }
      else {
        console.error('Unrecognized avatar upload data:', data);
        setError('Failed to process avatar data');
      }
    } catch (error) {
      console.error('Error handling avatar upload:', error);
      setError('Failed to update avatar: ' + error.message);
      
      // Still try to refresh user data
      setTimeout(() => {
        fetchUserData();
      }, 500);
    }
  };

  const handleAvatarDelete = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      
      
      // Make an API call to actually delete the avatar
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(getApiUrl('/team-roster/me/avatar'), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to delete avatar' }));
        throw new Error(errorData.detail || 'Failed to delete avatar');
      }

      try {
        // Try to parse the response to get the updated user data
        const userData = await response.json();
        
        updateUser(userData);
      } catch (e) {
        console.error('Error parsing avatar delete response:', e);
        // If we can't parse the response, just clear the avatar
        const updatedUser = {
          ...user,
          avatar: null,
          avatar_id: null
        };
        updateUser(updatedUser);
      }
      
      setSuccess('Avatar removed successfully');
      
      // Reload user data to ensure avatar deletion persists
      fetchUserData();
    } catch (err) {
      console.error('Error in avatar delete handler:', err);
      setError(err.message || 'Failed to remove avatar');
      
      // Try to reload user data to get the correct state
      fetchUserData();
    } finally {
      setLoading(false);
    }
  };

  // Add a function to fetch user data
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      
      const response = await fetch(getApiUrl('/team-roster/me'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
      }

      const userData = await response.json();
      
      
      // Explicitly update the avatar information
      updateUser({
        ...userData,
        avatar: userData.avatar || null
      });
      
      // Ensure the email field is updated
      if (userData.email) {
        setEmail(userData.email);
      }
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Profile Settings
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Profile Picture
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar 
              src={user?.avatar ? getAvatarUrl(user.operator_handle, user.avatar.filename) : undefined}
              alt={user?.name || 'User'}
              sx={{ width: 64, height: 64, mr: 2 }}
            />
            <Typography>
              Current Profile Picture
            </Typography>
          </Box>
          <ImageUpload
            currentImageUrl={user?.avatar ? getAvatarUrl(user.operator_handle, user.avatar.filename) : ''}
            onUpload={handleAvatarUpload}
            onDelete={handleAvatarDelete}
            imageType="avatar"
            size={100}
            accept="image/*"
          />
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box component="form" onSubmit={handleEmailChange} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Email Address
          </Typography>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Update Email'}
          </Button>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box component="form" onSubmit={handlePasswordChange}>
          <Typography variant="h6" gutterBottom>
            Change Password
          </Typography>
          <TextField
            fullWidth
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            required
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Update Password'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Profile;
