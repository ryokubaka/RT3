import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

/**
 * A reusable dialog component for forms
 * @param {Object} props Component props
 * @param {boolean} props.open Whether the dialog is open
 * @param {function} props.onClose Function to call when the dialog is closed
 * @param {string} props.title Dialog title
 * @param {JSX.Element} props.children Dialog content/form
 * @param {function} props.onSubmit Function to call when the form is submitted
 * @param {boolean} props.isSubmitting Whether the form is currently submitting
 * @param {string} props.submitLabel Label for the submit button
 * @param {string} props.cancelLabel Label for the cancel button
 * @param {boolean} props.disableSubmit Whether the submit button should be disabled
 * @param {string} props.maxWidth Maximum width of the dialog ('xs', 'sm', 'md', 'lg', 'xl')
 * @returns {JSX.Element} The FormDialog component
 */
const FormDialog = ({
  open,
  onClose,
  title,
  children,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  disableSubmit = false,
  maxWidth = 'sm'
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth={maxWidth}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{title}</Typography>
          {!isSubmitting && (
            <IconButton 
              edge="end" 
              color="inherit" 
              onClick={onClose} 
              aria-label="close"
              size="small"
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {children}
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          color="inherit" 
          disabled={isSubmitting}
        >
          {cancelLabel}
        </Button>
        <Button 
          onClick={onSubmit} 
          color="primary" 
          variant="contained"
          disabled={isSubmitting || disableSubmit}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormDialog; 