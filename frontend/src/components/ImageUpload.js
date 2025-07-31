import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { getApiUrl, getDirectImageUrl } from '../utils/apiConfig';

const ImageUpload = ({
  currentImageUrl,
  onUpload,
  onDelete,
  imageType,
  size = 100,
  accept = 'image/*',
  hidePreview = false,
}) => {
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl ? getDirectImageUrl(currentImageUrl) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (file) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      const formData = new FormData();
      formData.append('file', file);

      const endpoint = imageType === 'dashboard' ? '/images/dashboard/upload' : '/team-roster/me/avatar/upload';
      
      
      const response = await fetch(getApiUrl(endpoint), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({detail: 'Failed to upload image'}));
        throw new Error(errorData.detail || 'Failed to upload image');
      }

      // Safely try to parse JSON response
      let data;
      const responseText = await response.text();
      try {
        // Try to parse as JSON
        data = JSON.parse(responseText);
        
      } catch (parseError) {
        // If it's not valid JSON, use the raw text
        
        data = responseText;
      }
      
      // Different handling for avatar vs dashboard images
      if (imageType === 'dashboard') {
        if (!data.id || !data.direct_url) {
          throw new Error('Invalid response from server');
        }
        setPreviewUrl(getDirectImageUrl('/uploads/' + data.direct_url));
        onUpload({
          id: data.id,
          direct_url: data.direct_url
        });
      } else {
        // Avatar response format could be similar to dashboard format
        
        
        // Check if response has direct_url (same format as dashboard)
        if (data && data.direct_url) {
          
          // Set the preview using the direct_url
          setPreviewUrl(getDirectImageUrl(data.direct_url));
          
          // Pass the whole data object to the parent component
          onUpload(data);
        }
        // Check if response contains a filename directly
        else if (data && data.filename) {
          
          // Set the preview directly using the filename
          setPreviewUrl(getDirectImageUrl('/uploads/' + data.filename));
          
          // Pass the filename to the parent component
          onUpload({
            filename: data.filename
          });
        } 
        // Some backends might just return the filename as the entire response
        else if (typeof data === 'string') {
          
          setPreviewUrl(getDirectImageUrl('/uploads/' + data));
          
          onUpload({
            filename: data
          });
        }
        // If we get a different format, try to extract useful information
        else if (data) {
          
          // Just pass the data directly to the parent component and let it handle it
          setPreviewUrl(previewUrl || currentImageUrl);
          onUpload(data);
        } 
        else {
          throw new Error('Invalid avatar response format');
        }
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      
      
      // Different handling for dashboard vs avatar
      let endpoint;
      
      if (imageType === 'dashboard') {
        // For dashboard images, use the image ID directly
        if (!currentImageUrl) {
          throw new Error('No image URL found');
        }
        
        // Extract the ID from the URL
        const urlParts = currentImageUrl.split('/');
        const imageId = urlParts[urlParts.length - 1].split('.')[0];
        
        if (!imageId) {
          throw new Error('Could not extract image ID from URL');
        }
        
        endpoint = `/images/${imageId}`;
      } else {
        // For avatar, use the correct avatar endpoint
        endpoint = '/team-roster/me/avatar';
      }
      
      

      const response = await fetch(getApiUrl(endpoint), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({detail: 'Error deleting image'}));
        throw new Error(errorData.detail || 'Failed to delete image');
      }

      setPreviewUrl('');
      onDelete();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {!hidePreview && (
        <Box
          sx={{
            width: size,
            height: size,
            border: '2px dashed #ccc',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No image
            </Typography>
          )}
        </Box>
      )}

      {error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          component="label"
          disabled={loading}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            'Upload Image'
          )}
          <input
            type="file"
            hidden
            accept={accept}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleUpload(e.target.files[0]);
              }
            }}
          />
        </Button>

        {previewUrl && (
          <IconButton
            color="error"
            onClick={handleDelete}
            disabled={loading}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default ImageUpload; 