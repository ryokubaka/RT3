import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Stack,
  ButtonGroup,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Upload as UploadIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import NewTable from './Table';
import { getApiUrl } from '../utils/apiConfig';
import { useUser } from '../utils/hooks';

const JQRQuestionnaire = () => {
  const [jqrItems, setJqrItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [taskSections, setTaskSections] = useState([]);
  const [formData, setFormData] = useState({
    task_number: '',
    question: '',
    task_section: '',
    training_status: 'Active',
    apprentice: false,
    journeyman: false,
    master: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [expandedLevel, setExpandedLevel] = useState(null);
  const [selectedSection, setSelectedSection] = useState('apprentice');
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useUser();
  
  const fetchJQRItems = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(getApiUrl('/jqr/questionnaire'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (response.status === 403) {
        setError('You do not have permission to view the JQR questionnaire. Please contact an administrator.');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch JQR items');
      }

      const data = await response.json();
      
      setJqrItems(data);
      setFilteredItems(data);
      
      // Extract unique task sections for the dropdown
      const uniqueSections = [...new Set(data
        .map(item => item.task_section)
        .filter(section => section && section.trim() !== '')
      )];
      setTaskSections(uniqueSections);
    } catch (err) {
      console.error('Error fetching JQR items:', err);
      setError(err.message || 'Failed to load JQR items');
    }
  }, [navigate]);

  useEffect(() => {
    fetchJQRItems();
  }, [fetchJQRItems]);

  // Apply filter when filter button is clicked or when jqrItems changes
  useEffect(() => {
    if (currentFilter === 'all') {
      setFilteredItems(jqrItems);
    } else if (currentFilter === 'apprentice') {
      setFilteredItems(jqrItems.filter(item => item.apprentice === true));
    } else if (currentFilter === 'journeyman') {
      setFilteredItems(jqrItems.filter(item => item.journeyman === true));
    } else if (currentFilter === 'master') {
      setFilteredItems(jqrItems.filter(item => item.master === true));
    }
  }, [currentFilter, jqrItems]);

  const handleOpen = (item = null) => {
    if (item) {
      setEditMode(true);
      setFormData({
        id: item.id,
        task_number: item.task_number,
        question: item.question,
        task_section: item.task_section,
        training_status: item.training_status,
        apprentice: item.apprentice,
        journeyman: item.journeyman,
        master: item.master,
      });
    } else {
      setEditMode(false);
      setFormData({
        task_number: '',
        question: '',
        task_section: '',
        training_status: 'Active',
        apprentice: false,
        journeyman: false,
        master: false,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setFormData({
      task_number: '',
      question: '',
      task_section: '',
      training_status: 'Active',
      apprentice: false,
      journeyman: false,
      master: false,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAutocompleteChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const url = editMode 
        ? getApiUrl(`/jqr/questionnaire/${formData.id}`)
        : getApiUrl('/jqr/questionnaire');
      
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save JQR item');
      }

      setSuccess(editMode ? 'JQR item updated successfully' : 'JQR item added successfully');
      setOpen(false);
      
      // Refresh the JQR items list
      fetchJQRItems();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to save JQR item');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this JQR item?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(getApiUrl(`/jqr/questionnaire/${id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete JQR item');
      }

      setSuccess('JQR item deleted successfully');
      
      // Refresh the JQR items list
      fetchJQRItems();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete JQR item');
    }
  };

  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
    // Set the expanded level based on the filter
    if (filter === 'all') {
      setExpandedLevel(null);  // Collapse all sections
    } else {
      setExpandedLevel(filter);  // Expand the selected section
    }
  };

  const handleImportClick = () => {
    setImportDialogOpen(true);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setImportError('');
    } else {
      setImportError('Please select a valid CSV file');
      setSelectedFile(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setImportError('Please select a file to import');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('section', selectedSection);

      const response = await fetch(getApiUrl('/jqr/questionnaire/import'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to import JQR items');
      }

      setImportSuccess('JQR items imported successfully');
      setImportDialogOpen(false);
      setSelectedFile(null);
      setSelectedSection('apprentice');
      
      // Refresh the JQR items list
      fetchJQRItems();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setImportSuccess('');
      }, 3000);
    } catch (err) {
      setImportError(err.message || 'Failed to import JQR items');
    }
  };

  // Group items by level
  const groupedItems = {
    apprentice: filteredItems.filter(item => item.apprentice === true),
    journeyman: filteredItems.filter(item => item.journeyman === true),
    master: filteredItems.filter(item => item.master === true),
  };

  const handleAccordionChange = (level) => (event, isExpanded) => {
    setExpandedLevel(isExpanded ? level : null);
  };

  // Selection handlers
  const handleSelectAll = (ids) => {
    setSelectedItems(ids);
  };

  const handleItemSelect = (item) => {
    setSelectedItems(prev => {
      if (prev.includes(item.id)) {
        return prev.filter(id => id !== item.id);
      } else {
        return [...prev, item.id];
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      setError('No items selected for deletion');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(getApiUrl('/jqr/questionnaire/bulk'), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(selectedItems),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete selected items');
      }

      const result = await response.json();
      
      if (result.failed_count > 0) {
        setError(`Successfully deleted ${result.deleted_count} items, but failed to delete ${result.failed_count} items.`);
      } else {
        setSuccess(`Successfully deleted ${result.deleted_count} JQR item(s)`);
      }
      
      setSelectedItems([]);
      setDeleteDialogOpen(false);
      
      // Refresh the JQR items list
      fetchJQRItems();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete selected items');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          JQR Questionnaire
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <ButtonGroup variant="outlined">
            <Button 
              onClick={() => handleFilterChange('all')}
              variant={currentFilter === 'all' ? 'contained' : 'outlined'}
            >
              All
            </Button>
            <Button 
              onClick={() => handleFilterChange('apprentice')}
              variant={currentFilter === 'apprentice' ? 'contained' : 'outlined'}
              color="primary"
            >
              Apprentice
            </Button>
            <Button 
              onClick={() => handleFilterChange('journeyman')}
              variant={currentFilter === 'journeyman' ? 'contained' : 'outlined'}
              color="secondary"
            >
              Journeyman
            </Button>
            <Button 
              onClick={() => handleFilterChange('master')}
              variant={currentFilter === 'master' ? 'contained' : 'outlined'}
              color="success"
            >
              Master
            </Button>
          </ButtonGroup>

          {isAdmin && (
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleOpen()}
              >
                Add New JQR Item
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<UploadIcon />}
                onClick={handleImportClick}
              >
                Import CSV
              </Button>
              {selectedItems.length > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Selected ({selectedItems.length})
                </Button>
              )}
            </>
          )}
        </Stack>

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

        {/* Apprentice Level Accordion */}
        <Accordion 
          expanded={expandedLevel === 'apprentice'} 
          onChange={handleAccordionChange('apprentice')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="apprentice-content"
            id="apprentice-header"
          >
            <Typography variant="h6" color="primary">
              Apprentice Level ({groupedItems.apprentice.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <NewTable 
              data={groupedItems.apprentice.map(item => ({
                ...item,
                checkboxCell: isAdmin ? (
                  <Checkbox 
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleItemSelect(item)}
                    color="primary"
                    size="small"
                  />
                ) : null,
                actions: isAdmin ? (
                  <>
                    <IconButton onClick={() => handleOpen(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </>
                ) : null
              }))} 
              columns={[
                isAdmin && { 
                  id: 'checkbox', 
                  label: '', 
                  sortable: false, 
                  filterable: false,
                  width: '40px',
                  renderCell: (row) => row.checkboxCell
                },
                { id: 'task_number', label: 'Task Number', sortable: true, filterable: true },
                { id: 'question', label: 'Question', sortable: true, filterable: true },
                { id: 'task_section', label: 'Task Section', sortable: true, filterable: true },
                { id: 'training_status', label: 'Training Status', sortable: true, filterable: true },
                isAdmin && { id: 'actions', label: 'Actions', sortable: false, filterable: false }
              ].filter(Boolean)} 
              onSelectAll={handleSelectAll}
              selectedItems={selectedItems}
            />
          </AccordionDetails>
        </Accordion>

        {/* Journeyman Level Accordion */}
        <Accordion 
          expanded={expandedLevel === 'journeyman'} 
          onChange={handleAccordionChange('journeyman')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="journeyman-content"
            id="journeyman-header"
          >
            <Typography variant="h6" color="secondary">
              Journeyman Level ({groupedItems.journeyman.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <NewTable 
              data={groupedItems.journeyman.map(item => ({
                ...item,
                checkboxCell: isAdmin ? (
                  <Checkbox 
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleItemSelect(item)}
                    color="primary"
                    size="small"
                  />
                ) : null,
                actions: isAdmin ? (
                  <>
                    <IconButton onClick={() => handleOpen(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </>
                ) : null
              }))} 
              columns={[
                isAdmin && { 
                  id: 'checkbox', 
                  label: '', 
                  sortable: false, 
                  filterable: false,
                  width: '40px',
                  renderCell: (row) => row.checkboxCell
                },
                { id: 'task_number', label: 'Task Number', sortable: true, filterable: true },
                { id: 'question', label: 'Question', sortable: true, filterable: true },
                { id: 'task_section', label: 'Task Section', sortable: true, filterable: true },
                { id: 'training_status', label: 'Training Status', sortable: true, filterable: true },
                isAdmin && { id: 'actions', label: 'Actions', sortable: false, filterable: false }
              ].filter(Boolean)} 
              onSelectAll={handleSelectAll}
              selectedItems={selectedItems}
            />
          </AccordionDetails>
        </Accordion>

        {/* Master Level Accordion */}
        <Accordion 
          expanded={expandedLevel === 'master'} 
          onChange={handleAccordionChange('master')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="master-content"
            id="master-header"
          >
            <Typography variant="h6" color="success.main">
              Master Level ({groupedItems.master.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <NewTable 
              data={groupedItems.master.map(item => ({
                ...item,
                checkboxCell: isAdmin ? (
                  <Checkbox 
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleItemSelect(item)}
                    color="primary"
                    size="small"
                  />
                ) : null,
                actions: isAdmin ? (
                  <>
                    <IconButton onClick={() => handleOpen(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </>
                ) : null
              }))} 
              columns={[
                isAdmin && { 
                  id: 'checkbox', 
                  label: '', 
                  sortable: false, 
                  filterable: false,
                  width: '40px',
                  renderCell: (row) => row.checkboxCell
                },
                { id: 'task_number', label: 'Task Number', sortable: true, filterable: true },
                { id: 'question', label: 'Question', sortable: true, filterable: true },
                { id: 'task_section', label: 'Task Section', sortable: true, filterable: true },
                { id: 'training_status', label: 'Training Status', sortable: true, filterable: true },
                isAdmin && { id: 'actions', label: 'Actions', sortable: false, filterable: false }
              ].filter(Boolean)} 
              onSelectAll={handleSelectAll}
              selectedItems={selectedItems}
            />
          </AccordionDetails>
        </Accordion>

        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
          <DialogTitle>{editMode ? 'Edit JQR Item' : 'Add New JQR Item'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Task Number"
              name="task_number"
              value={formData.task_number}
              onChange={handleChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Question"
              name="question"
              value={formData.question}
              onChange={handleChange}
              margin="normal"
              required
            />
            <Autocomplete
              freeSolo
              options={taskSections}
              value={formData.task_section}
              onInputChange={(event, newValue) => {
                handleAutocompleteChange('task_section', newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Task Section"
                  margin="normal"
                  required
                  fullWidth
                />
              )}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Training Status</InputLabel>
              <Select
                name="training_status"
                value={formData.training_status}
                onChange={handleChange}
                label="Training Status"
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.apprentice}
                    onChange={(e) => handleChange({ target: { name: 'apprentice', value: e.target.checked } })}
                    name="apprentice"
                  />
                }
                label="Apprentice"
              />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.journeyman}
                    onChange={(e) => handleChange({ target: { name: 'journeyman', value: e.target.checked } })}
                    name="journeyman"
                  />
                }
                label="Journeyman"
              />
            </FormControl>
            <FormControl fullWidth margin="normal">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.master}
                    onChange={(e) => handleChange({ target: { name: 'master', value: e.target.checked } })}
                    name="master"
                  />
                }
                label="Master"
              />
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {editMode ? 'Update' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
          <DialogTitle>Import JQR Items from CSV</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Select Section</InputLabel>
              <Select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                label="Select Section"
              >
                <MenuItem value="apprentice">Apprentice</MenuItem>
                <MenuItem value="journeyman">Journeyman</MenuItem>
                <MenuItem value="master">Master</MenuItem>
              </Select>
            </FormControl>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ marginTop: '1rem' }}
            />
            {importError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {importError}
              </Alert>
            )}
            {importSuccess && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {importSuccess}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setImportDialogOpen(false);
              setSelectedSection('apprentice');
            }}>
              Cancel
            </Button>
            <Button onClick={handleImport} variant="contained" color="primary">
              Import
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Bulk Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete {selectedItems.length} selected JQR item(s)? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkDelete} variant="contained" color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default JQRQuestionnaire;
