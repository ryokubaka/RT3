import React from 'react';
import { Box, Alert, CircularProgress, Button } from '@mui/material';
import { RefreshOutlined } from '@mui/icons-material';

/**
 * A component for handling loading states and error messages
 * @param {Object} props Component props
 * @param {boolean} props.loading Whether data is currently loading
 * @param {string} props.error Error message if there is an error
 * @param {function} props.onRetry Function to call when retrying
 * @param {JSX.Element} props.children Child components to render when not loading or in error
 * @returns {JSX.Element} The DataLoadingError component
 */
const DataLoadingError = ({ loading, error, onRetry, children }) => {
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          py: 4 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 2, mb: 2 }}>
        <Alert 
          severity="error" 
          action={
            onRetry && (
              <Button
                color="inherit"
                size="small"
                onClick={onRetry}
                startIcon={<RefreshOutlined />}
              >
                Retry
              </Button>
            )
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return children;
};

export default DataLoadingError; 