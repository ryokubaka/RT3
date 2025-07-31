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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  OutlinedInput,
  Box,
  Chip,
  Switch,
  FormControlLabel,
  Grid,
  Stack,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Upload as UploadIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import NewTable from './Table';
import { getApiUrl } from '../utils/apiConfig';
import { useUser } from '../utils/hooks';

const OPERATOR_LEVELS = {
  TEAM_MEMBER: 'Team Member',
  APPRENTICE: 'Apprentice',
  JOURNEYMAN: 'Journeyman',
  MASTER: 'Master'
};

const COMPLIANCE_STATUS = {
  COMPLIANT: 'Compliant',
  NON_COMPLIANT: 'Non-Compliant'
};

const TEAM_ROLES = [
  'ADMIN',
  'Branch Chief',
  'Operator',
  'Planner',
  'Developer',
  'Infrastructure'
];

const TeamRoster = () => {
  const { isAdmin } = useUser();
  const [filteredOperators, setFilteredOperators] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [newOperator, setNewOperator] = useState({
    name: '',
    operator_handle: '',
    email: '',
    team_role: [],
    onboarding_date: '',
    operator_level: '',
    compliance_8570: false,
    legal_document_status: false,
    active: true,
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const fetchUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(getApiUrl('/team-roster/me'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
    } catch (err) {
      console.error('Error fetching user data:', err);
      navigate('/login');
    }
  }, [navigate]);

  const fetchOperators = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/team-roster'), {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch team members');
      const data = await response.json();
      setFilteredOperators(data);
    } catch (err) {
      setError('Failed to load team members');
    }
  }, []);

  useEffect(() => {
    fetchUserData();
    fetchOperators();
  }, [fetchUserData, fetchOperators]);

  const handleOpen = (operator = null) => {
    if (operator) {
      setEditMode(true);
      setSelectedOperator(operator);
      setNewOperator({
        ...operator,
        team_role: Array.isArray(operator.team_role) 
          ? operator.team_role 
          : operator.team_role.split(',').map(role => role.trim()),
        active: operator.active !== undefined ? operator.active : true,
        email: operator.email || '',
        password: operator.password || ''
      });
    } else {
      setEditMode(false);
      setSelectedOperator(null);
      setNewOperator({
        name: '',
        operator_handle: '',
        email: '',
        team_role: [],
        onboarding_date: '',
        operator_level: OPERATOR_LEVELS.APPRENTICE,
        compliance_8570: COMPLIANCE_STATUS.NON_COMPLIANT,
        legal_document_status: COMPLIANCE_STATUS.NON_COMPLIANT,
        active: true,
        password: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setSelectedOperator(null);
    setNewOperator({
      name: '',
      operator_handle: '',
      email: '',
      team_role: [],
      onboarding_date: '',
      operator_level: OPERATOR_LEVELS.APPRENTICE,
      compliance_8570: COMPLIANCE_STATUS.NON_COMPLIANT,
      legal_document_status: COMPLIANCE_STATUS.NON_COMPLIANT,
      active: true,
      password: ''
    });
  };

  const handleChange = (e) => {
    setNewOperator({
      ...newOperator,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editMode ? getApiUrl(`/team-roster/${selectedOperator.id}`) : getApiUrl('/team-roster');
      
      const method = editMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...newOperator,
          team_role: Array.isArray(newOperator.team_role) 
            ? newOperator.team_role 
            : newOperator.team_role.split(',').map(role => role.trim()),
          email: newOperator.email || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save team member');
      }

      setSuccess(editMode ? 'Team member updated successfully' : 'Team member created successfully');
      handleClose();
      fetchOperators();
    } catch (err) {
      console.error('Error saving team member:', err);
      setError(err.message || 'Failed to save team member');
    }
  };

  const handleDelete = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) return;

    try {
      const response = await fetch(getApiUrl(`/team-roster/${memberId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete team member');

      setSuccess('Team member deleted successfully');
      fetchOperators();
    } catch (err) {
      setError('Failed to delete team member');
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

      const response = await fetch(getApiUrl('/team-roster/import'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to import team members');
      }

      setImportSuccess('Team members imported successfully');
      setImportDialogOpen(false);
      setSelectedFile(null);
      
      // Refresh the team roster list
      fetchOperators();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setImportSuccess('');
      }, 3000);
    } catch (err) {
      setImportError(err.message || 'Failed to import team members');
    }
  };

  return (
    <Container 
      maxWidth={false} 
      disableGutters
      sx={{ 
        mt: 4,
        px: { xs: 2, sm: 3 }
      }}
    >
      <Paper 
        elevation={2}
        sx={{ 
          p: { xs: 2, sm: 3 },
          width: '100%',
          overflowX: 'auto'
        }}
      >
        <Typography variant="h4" gutterBottom>
          Team Roster Management
        </Typography>
        {isAdmin && (
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleOpen()}
            >
              Add New Team Member
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<UploadIcon />}
              onClick={handleImportClick}
            >
              Import CSV
            </Button>
          </Stack>
        )}

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

        <NewTable 
          data={filteredOperators.map(operator => {
            // Convert team_role to a string for sorting/filtering
            const teamRoleText = Array.isArray(operator.team_role) 
              ? operator.team_role.join(', ')
              : typeof operator.team_role === 'string'
                ? operator.team_role
                : '';
            
            return {
              ...operator,
              // Keep the original text version for sorting/filtering
              team_role: teamRoleText,
              // Add a visual version for display
              team_role_display: Array.isArray(operator.team_role) 
                ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {operator.team_role.map((role) => (
                      <Chip 
                        key={role} 
                        label={role} 
                        size="small"
                        sx={{ 
                          fontSize: '0.75rem',
                          height: 24
                        }}
                      />
                    ))}
                  </Box>
                ) 
                : typeof operator.team_role === 'string' && operator.team_role
                  ? operator.team_role.split(', ').map((role) => (
                    <Chip 
                      key={role} 
                      label={role} 
                      size="small"
                      sx={{ 
                        fontSize: '0.75rem',
                        height: 24,
                        m: 0.25
                      }}
                    />
                  ))
                  : null,
              active_display: (
                <Chip 
                  label={operator.active ? 'Yes' : 'No'} 
                  color={operator.active ? 'success' : 'default'}
                  size="small"
                  sx={{ 
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}
                />
              ),
              compliance_8570_display: (
                <Chip 
                  label={operator.compliance_8570} 
                  color={operator.compliance_8570 === COMPLIANCE_STATUS.COMPLIANT ? 'success' : 'error'}
                  size="small"
                  sx={{ 
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}
                />
              ),
              legal_document_status_display: (
                <Chip 
                  label={operator.legal_document_status} 
                  color={operator.legal_document_status === COMPLIANCE_STATUS.COMPLIANT ? 'success' : 'error'}
                  size="small"
                  sx={{ 
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}
                />
              ),
              actions: isAdmin ? (
                <>
                  <IconButton onClick={() => handleOpen(operator)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(operator.id)}>
                    <DeleteIcon />
                  </IconButton>
                </>
              ) : null
            };
          })} 
          columns={[
            { id: 'name', label: 'Name', sortable: true, filterable: true },
            { id: 'operator_handle', label: 'Operator Handle', sortable: true, filterable: true },
            { id: 'email', label: 'Email', sortable: true, filterable: true },
            { 
              id: 'team_role', 
              label: 'Team Role', 
              sortable: true, 
              filterable: true,
              renderCell: (row) => row.team_role_display || row.team_role
            },
            { id: 'onboarding_date', label: 'Onboarding Date', sortable: true, filterable: true },
            { id: 'operator_level', label: 'Operator Level', sortable: true, filterable: true },
            { 
              id: 'compliance_8570', 
              label: '8570 Compliance', 
              sortable: true, 
              filterable: true,
              renderCell: (row) => row.compliance_8570_display
            },
            { 
              id: 'legal_document_status', 
              label: 'Legal Document Status', 
              sortable: true, 
              filterable: true,
              renderCell: (row) => row.legal_document_status_display
            },
            { 
              id: 'active', 
              label: 'Active', 
              sortable: true, 
              filterable: true,
              renderCell: (row) => row.active_display
            },
            isAdmin && { id: 'actions', label: 'Actions', sortable: false, filterable: false }
          ].filter(Boolean)} 
        />

        <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
          <DialogTitle>Import Team Members from CSV</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              The CSV file should have the following columns:
              <br />
              name, operator_handle, email, team_role, onboarding_date, operator_level, compliance_8570, legal_document_status, active
            </Typography>
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
              setSelectedFile(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleImport} variant="contained" color="primary">
              Import
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
          <DialogTitle>{editMode ? 'Edit Operator' : 'Add New Operator'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={newOperator.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Operator Handle"
                  name="operator_handle"
                  value={newOperator.operator_handle}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  value={newOperator.email}
                  onChange={handleChange}
                  required
                  type="email"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={newOperator.password}
                  onChange={handleChange}
                  required={!editMode}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Team Role</InputLabel>
                  <Select
                    multiple
                    name="team_role"
                    value={newOperator.team_role}
                    onChange={handleChange}
                    label="Team Role"
                    required
                    input={<OutlinedInput label="Team Role" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} />
                        ))}
                      </Box>
                    )}
                  >
                    {TEAM_ROLES.map((role) => (
                      <MenuItem key={role} value={role}>
                        {role}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Onboarding Date"
                  name="onboarding_date"
                  type="date"
                  value={newOperator.onboarding_date}
                  onChange={handleChange}
                  margin="normal"
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Operator Level</InputLabel>
                  <Select
                    name="operator_level"
                    value={newOperator.operator_level}
                    onChange={handleChange}
                    label="Operator Level"
                    required
                  >
                    {Object.values(OPERATOR_LEVELS).map((level) => (
                      <MenuItem key={level} value={level}>
                        {level}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>8570 Status</InputLabel>
                  <Select
                    name="compliance_8570"
                    value={newOperator.compliance_8570}
                    onChange={handleChange}
                    label="8570 Status"
                    required
                  >
                    {Object.values(COMPLIANCE_STATUS).map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Red Team Legal Document Status</InputLabel>
                  <Select
                    name="legal_document_status"
                    value={newOperator.legal_document_status}
                    onChange={handleChange}
                    label="Red Team Legal Document Status"
                    required
                  >
                    {Object.values(COMPLIANCE_STATUS).map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newOperator.active}
                      onChange={handleChange}
                      name="active"
                      color="primary"
                    />
                  }
                  label="Active"
                  sx={{ mt: 2 }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              {editMode ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default TeamRoster; 