import React from 'react';
import { Chip } from '@mui/material';
import { COLORS, TRAINING_STATUS } from '../../utils/constants';

/**
 * A reusable chip component for displaying status indicators
 * @param {Object} props Component props
 * @param {string} props.status The status value
 * @param {string} props.label Optional custom label
 * @param {Object} props.customColors Optional custom color mapping
 * @param {Object} props.size Chip size ('small' or 'medium')
 * @returns {JSX.Element} The StatusChip component
 */
const StatusChip = ({ 
  status, 
  label, 
  customColors, 
  size = 'small',
  ...chipProps 
}) => {
  // Default color mapping
  const defaultColors = {
    [TRAINING_STATUS.NOT_STARTED]: {
      color: 'default',
      backgroundColor: COLORS.STATUS.NOT_STARTED,
      textColor: COLORS.TEXT.SECONDARY,
    },
    [TRAINING_STATUS.IN_PROGRESS]: {
      color: 'primary',
      backgroundColor: COLORS.STATUS.IN_PROGRESS,
      textColor: COLORS.PRIMARY,
    },
    [TRAINING_STATUS.COMPLETE]: {
      color: 'success',
      backgroundColor: COLORS.STATUS.COMPLETE,
      textColor: COLORS.SUCCESS,
    },
    // Add custom status mapping for other status types
    'EXPIRED': {
      color: 'error',
      backgroundColor: '#ffcdd2',
      textColor: COLORS.ERROR,
    },
    'UPCOMING': {
      color: 'warning',
      backgroundColor: '#fff9c4',
      textColor: COLORS.WARNING,
    },
  };

  // Use custom colors if provided, otherwise use defaults
  const colorMap = customColors || defaultColors;
  
  // Get color settings for the current status
  const colorSettings = colorMap[status] || {
    color: 'default',
    backgroundColor: '#f5f5f5',
    textColor: '#757575',
  };

  // Use provided label or format the status for display
  const displayLabel = label || status.replace(/_/g, ' ').toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <Chip
      label={displayLabel}
      size={size}
      sx={{
        backgroundColor: colorSettings.backgroundColor,
        color: colorSettings.textColor,
        fontWeight: 500,
        '&:hover': {
          backgroundColor: colorSettings.backgroundColor,
          opacity: 0.9,
        },
      }}
      {...chipProps}
    />
  );
};

export default StatusChip; 