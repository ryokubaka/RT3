import React, { useMemo, useState } from 'react';
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
  Autocomplete,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import NewTable from './NewTable';
import DocumentCell from './DocumentCell';
import { getApiUrl } from '../utils/apiConfig';

const RedTeamTab = ({
  data,
  columns,
  loading,
  onAdd,
  onEdit,
  onDelete,
  isAdmin,
  currentUser,
  operators,
  trainingTypes,
  dialogOpen,
  formData,
  setFormData,
  handleInputChange,
  handleDialogClose,
  handleSave,
  defaultSortColumn = '',
  defaultSortDirection = 'asc',
  onRefresh
}) => {
  // Helper function to generate training name options based on training type
  const generateTrainingNameOptions = (trainingType) => {
    const currentYear = new Date().getFullYear();
    const options = [];
    
    if (trainingType === 'Red Team Legal Brief') {
      // Generate quarter options from current year + 1 down to 2020 (descending)
      for (let year = currentYear + 1; year >= 2020; year--) {
        for (let quarter = 4; quarter >= 1; quarter--) {
          options.push(`${year} Q${quarter}`);
        }
      }
    } else if (trainingType) {
      // Generate year agreement options from current year + 1 down to 2020 (descending)
      for (let year = currentYear + 1; year >= 2020; year--) {
        options.push(`${year} Agreement`);
      }
    }
    
    return options;
  };

  // Helper function to get quarter end date
  const getQuarterEndDate = (year, quarter) => {
    const quarterEndMonths = { 1: 3, 2: 6, 3: 9, 4: 12 };
    const month = quarterEndMonths[quarter];
    // Get the last day of the month
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  };

  // Helper function to get year end date
  const getYearEndDate = (year) => {
    return `${year}-12-31`;
  };

  // Handle training type change
  const handleTrainingTypeChange = (event, newValue) => {
    setFormData(prev => ({ 
      ...prev, 
      training_type: newValue,
      training_name: '', // Reset training name when type changes
      due_date: '',
      expiration_date: ''
    }));
  };

  // Handle training name change
  const handleTrainingNameChange = (event, newValue) => {
    let dueDate = '';
    let expirationDate = '';

    if (newValue) {
      if (formData.training_type === 'Red Team Legal Brief') {
        // Parse "YYYY QX" format
        const match = newValue.match(/(\d{4}) Q(\d)/);
        if (match) {
          const year = parseInt(match[1]);
          const quarter = parseInt(match[2]);
          dueDate = getQuarterEndDate(year, quarter);
          expirationDate = getQuarterEndDate(year, quarter);
        }
      } else {
        // Parse "YYYY Agreement" format
        const match = newValue.match(/(\d{4}) Agreement/);
        if (match) {
          const year = parseInt(match[1]);
          dueDate = getYearEndDate(year);
          expirationDate = getYearEndDate(year);
        }
      }
    }

    setFormData(prev => ({ 
      ...prev, 
      training_name: newValue,
      due_date: dueDate,
      expiration_date: expirationDate
    }));
  };
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);

  // Add custom sortComparator to columns
  const columnsWithSort = useMemo(() => columns.map(col => {
    if (col.id === 'training_name') {
      return {
        ...col,
        sortComparator: (a, b) => {
          // Descending order
          if (a.training_name !== b.training_name) {
            return b.training_name.localeCompare(a.training_name);
          }
          // Secondary: training_type (desc)
          if (a.training_type && b.training_type) {
            return b.training_type.localeCompare(a.training_type);
          }
          return 0;
        }
      };
    }
    return col;
  }), [columns]);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) return;

    setImporting(true);
    setImportResults(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(getApiUrl('/training/red-team/import'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportResults(result);
      
      // Refresh the data if any records were imported
      if (result.imported > 0 && onRefresh) {
        onRefresh();
      }
    } catch (error) {
      setImportResults({
        imported: 0,
        errors: [`Import failed: ${error.message}`],
        records: []
      });
    } finally {
      setImporting(false);
    }
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    setSelectedFiles([]);
    setImportResults(null);
  };

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
          Red Team Training
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => setImportDialogOpen(true)}
              sx={{ 
                bgcolor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : 'white',
                color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2',
                '&:hover': {
                  bgcolor: theme => theme.palette.mode === 'dark' ? '#262626' : '#e3f2fd'
                }
              }}
            >
              Import Files
            </Button>
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
              Add Training
            </Button>
          </Box>
        </Typography>
      </Box>
      <NewTable 
        columns={columnsWithSort} 
        rows={data} 
        title="Red Team Training" 
        groupByOperator={true}
        defaultSortColumn={defaultSortColumn}
        defaultSortDirection={defaultSortDirection}
      />
      
      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={handleCloseImportDialog} maxWidth="md" fullWidth>
        <DialogTitle>Import Red Team Training Files</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload training files to automatically import training records. Files should follow the naming convention:
              <br />
              <strong>Example:</strong> 10A - JFHQ-DODIN Red_Team_Code_of_Ethics_Agreement_20231218-Meow
            </Typography>
            
            <input
              accept=".pdf,.doc,.docx,.txt"
              style={{ display: 'none' }}
              id="file-upload"
              multiple
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="file-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                Select Files
              </Button>
            </label>
            
            {selectedFiles.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Files ({selectedFiles.length}):
                </Typography>
                <List dense>
                  {selectedFiles.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemText primary={file.name} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>

          {importResults && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Import Results
              </Typography>
              
              {importResults.imported > 0 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Successfully imported {importResults.imported} training record(s)
                </Alert>
              )}
              
              {importResults.skipped && importResults.skipped.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Skipped Duplicates ({importResults.skipped.length}):
                  </Typography>
                  <List dense>
                    {importResults.skipped.map((skip, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckCircleIcon color="info" />
                        </ListItemIcon>
                        <ListItemText primary={skip} />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              )}
              
              {importResults.errors.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Errors ({importResults.errors.length}):
                  </Typography>
                  <List dense>
                    {importResults.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <ErrorIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText primary={error} />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImportDialog}>Close</Button>
          {selectedFiles.length > 0 && !importResults && (
            <Button 
              onClick={handleImport} 
              variant="contained" 
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Import Files'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Existing Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>{formData.id ? 'Edit' : 'Add'} Red Team Training</DialogTitle>
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
          <Autocomplete
            freeSolo
            options={trainingTypes}
            inputValue={formData.training_type || ''}
            onInputChange={(event, newValue) => {
              setFormData(prev => ({ ...prev, training_type: newValue }));
            }}
            onChange={handleTrainingTypeChange}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Training Type"
                fullWidth
                margin="normal"
              />
            )}
          />
          <Autocomplete
            options={generateTrainingNameOptions(formData.training_type)}
            value={formData.training_name || ''}
            
            onChange={handleTrainingNameChange}
            disabled={!formData.training_type}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Training Name"
                fullWidth
                margin="normal"
                helperText={!formData.training_type ? "Please select a Training Type first" : ""}
              />
            )}
          />
          <TextField
            fullWidth
            margin="normal"
            name="due_date"
            label="Due Date"
            type="date"
            value={formData.due_date || ''}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
            helperText={formData.training_name ? "Auto-populated based on selected training name" : ""}
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
            helperText={formData.training_name ? "Auto-populated based on selected training name" : ""}
          />
          <TextField
            fullWidth
            margin="normal"
            name="date_submitted"
            label="Date Submitted"
            type="date"
            value={formData.date_submitted || ''}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
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
                documentType="red_team"
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

export default RedTeamTab; 