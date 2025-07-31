import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import NewTable from './NewTable';
import DocumentCell from './DocumentCell';

const CertificationsTab = ({
  data,
  columns,
  loading,
  onAdd,
  onEdit,
  onDelete,
  isAdmin,
  currentUser,
  operators,
  dialogOpen,
  formData,
  setFormData,
  handleInputChange,
  handleDialogClose,
  handleSave,
  defaultSortColumn = '',
  defaultSortDirection = 'asc'
}) => {
  // Add custom sortComparator to columns
  const columnsWithSort = useMemo(() => columns.map(col => {
    if (col.id === 'certification_name') {
      return {
        ...col,
        sortComparator: (a, b) => {
          // Ascending order
          if (a.certification_name !== b.certification_name) {
            return a.certification_name.localeCompare(b.certification_name);
          }
          // Secondary: expiration_date (desc, New -> Old)
          if (a.expiration_date && b.expiration_date) {
            return new Date(b.expiration_date) - new Date(a.expiration_date);
          }
          return 0;
        }
      };
    }
    return col;
  }), [columns]);

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2',
            fontWeight: 'bold',
            backgroundColor: theme => theme.palette.mode === 'dark' ? '#262626' : '#e3f2fd',
            p: 2,
            borderRadius: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            '&:hover': {
              backgroundColor: theme => theme.palette.mode === 'dark' ? '#333333' : '#bbdefb'
            }
          }}
        >
          Certifications
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAdd}
            sx={{ 
              bgcolor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : 'white',
              color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2',
              '&:hover': {
                bgcolor: theme => theme.palette.mode === 'dark' ? '#262626' : '#e3f2fd'
              }
            }}
          >
            Add Certification
          </Button>
        </Typography>
      </Box>
      <NewTable 
        columns={columnsWithSort} 
        rows={data} 
        title="Certifications" 
        groupByOperator={true}
        defaultSortColumn={defaultSortColumn}
        defaultSortDirection={defaultSortDirection}
      />
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>{formData.id ? 'Edit' : 'Add'} Certification</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel id="operator-select-label">Operator</InputLabel>
            <Select
              labelId="operator-select-label"
              name="operator_name"
              value={formData.operator_name || ''}
              onChange={handleInputChange}
              label="Operator"
            >
              {isAdmin ? (
                operators
                  .filter(op => op && op.name)
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .map(op => (
                    <MenuItem key={op.id} value={op.name}>{op.name}</MenuItem>
                  ))
              ) : (
                <MenuItem value={currentUser?.name}>{currentUser?.name}</MenuItem>
              )}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            name="certification_name"
            label="Certification Name"
            value={formData.certification_name || ''}
            onChange={handleInputChange}
          />
          <TextField
            fullWidth
            margin="normal"
            name="date_acquired"
            label="Date Acquired"
            type="date"
            value={formData.date_acquired || ''}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            margin="normal"
            name="training_hours"
            label="Training Hours"
            type="number"
            value={formData.training_hours || ''}
            onChange={handleInputChange}
          />
          <TextField
            fullWidth
            margin="normal"
            name="expiration_date"
            label="Expiration Date"
            type="date"
            value={formData.expiration_date || ''}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
          />
          <FormControlLabel
            control={
              <Checkbox
                name="dod_8140"
                checked={formData.dod_8140 || false}
                onChange={(e) => handleInputChange({
                  target: {
                    name: 'dod_8140',
                    value: e.target.checked
                  }
                })}
              />
            }
            label="DoD 8140"
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Document
            </Typography>
            {formData.operator_name ? (
              <DocumentCell
                row={formData}
                isAdmin={isAdmin}
                onUpload={(data) => {
                  setFormData(prev => ({
                    ...prev,
                    tempFile: data.tempFile
                  }));
                }}
                onDelete={() => {
                  setFormData(prev => ({
                    ...prev,
                    tempFile: null,
                    file_url: ""
                  }));
                }}
                documentType="certification"
                currentUser={currentUser}
              />
            ) : (
              <Alert severity="info">
                Please select an operator before uploading a document
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CertificationsTab; 