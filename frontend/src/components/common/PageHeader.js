import React from 'react';
import { Box, Typography, Button, Divider } from '@mui/material';

/**
 * A reusable page header component with title, subtitle, and optional action buttons
 * @param {Object} props Component props
 * @param {string} props.title The page title
 * @param {string} props.subtitle Optional subtitle
 * @param {JSX.Element[]} props.actions Optional action buttons or components
 * @returns {JSX.Element} The PageHeader component
 */
const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box 
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: subtitle ? 1 : 2
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
        
        {actions && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {actions}
          </Box>
        )}
      </Box>
      
      {subtitle && (
        <Typography 
          variant="subtitle1" 
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          {subtitle}
        </Typography>
      )}
      
      <Divider />
    </Box>
  );
};

export default PageHeader; 