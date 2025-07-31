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
  OutlinedInput,
  Chip,
  Box,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Edit as EditIcon, Delete as DeleteIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import NewTable from './Table';
import { getApiUrl } from '../utils/apiConfig';
import { useUser } from '../utils/hooks';
import { useTheme } from '../contexts/ThemeContext';

const Missions = () => {
  const { isAdmin } = useUser();
  const [filteredMissions, setFilteredMissions] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedMission, setSelectedMission] = useState(null);
  const [newMission, setNewMission] = useState({
    mission: '',
    team_lead: '',
    mission_lead: '',
    rep: '',
    remote_operators: [],
    local_operators: [],
    remote_operators_on_keyboard: [],
    local_operators_on_keyboard: [],
    planner: '',
    location: '',
  });
  const [error, setError] = useState('');
  const [expandedYear, setExpandedYear] = useState(null);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  // Define columns configuration for NewTable
  const columns = [
    { id: 'mission', label: 'Mission', sortable: true, filterable: true },
    { id: 'team_lead', label: 'Team Lead', sortable: true, filterable: true },
    { id: 'mission_lead', label: 'Mission Lead', sortable: true, filterable: true },
    { id: 'rep', label: 'Rep', sortable: true, filterable: true },
    { 
      id: 'remote_operators', 
      label: 'Remote Operators', 
      sortable: true, 
      filterable: true,
      renderCell: (row) => row.remote_operators_display
    },
    { 
      id: 'local_operators', 
      label: 'Local Operators', 
      sortable: true, 
      filterable: true,
      renderCell: (row) => row.local_operators_display
    },
    { id: 'planner', label: 'Planner', sortable: true, filterable: true },
    { id: 'location', label: 'Location', sortable: true, filterable: true },
    // Add actions column for ADMIN role
    isAdmin && { id: 'actions', label: 'Actions', sortable: false, filterable: false }
  ].filter(Boolean);

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

  const fetchMissions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Use the correct URL format - ensure no trailing slash
      const missionsUrl = getApiUrl('/missions');
      
      
      const response = await fetch(missionsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error(`Failed to fetch missions: ${response.status} ${response.statusText}`);
      const data = await response.json();
      
      // Ensure data consistency
      const processedData = Array.isArray(data) ? data.map(mission => ({
        ...mission,
        remote_operators: mission.remote_operators || '', // Ensure remote_operators is never undefined
        local_operators: mission.local_operators || '' // Ensure local_operators is never undefined
      })) : [];
      
      setFilteredMissions(processedData);
    } catch (err) {
      console.error('Error fetching missions:', err);
      setError(`Failed to load missions: ${err.message}`);
    }
  }, [navigate]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      
      const response = await fetch(getApiUrl('/team-roster'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error(`Failed to fetch team members: ${response.status} ${response.statusText}`);
      const data = await response.json();
      // Filter to only active operators for dropdown selections
      const activeTeamMembers = Array.isArray(data) ? data.filter(member => member.active) : [];
      setTeamMembers(activeTeamMembers);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError(`Failed to load team members: ${err.message}`);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUserData();
    fetchMissions();
    fetchTeamMembers();
  }, [fetchUserData, fetchMissions, fetchTeamMembers]);

  // Set expanded year when missions are loaded
  useEffect(() => {
    if (filteredMissions.length > 0) {
      const groupedMissions = groupMissionsByYear(filteredMissions);
      const latestYear = getLatestYear(groupedMissions);
      setExpandedYear(latestYear);
    }
  }, [filteredMissions]);

  const handleOpen = () => {
    setEditMode(false);
    setSelectedMission(null);
    setNewMission({
      mission: '',
      team_lead: '',
      mission_lead: '',
      rep: '',
      remote_operators: [],
      local_operators: [],
      remote_operators_on_keyboard: [],
      local_operators_on_keyboard: [],
      planner: '',
      location: '',
    });
    setOpen(true);
  };

  const handleEdit = (mission) => {
    setEditMode(true);
    setSelectedMission(mission);
    setNewMission({
      mission: mission.mission,
      team_lead: mission.team_lead,
      mission_lead: mission.mission_lead,
      rep: mission.rep,
      remote_operators: mission.remote_operators ? mission.remote_operators.split(', ') : [],
      local_operators: mission.local_operators ? mission.local_operators.split(', ') : [],
      remote_operators_on_keyboard: mission.remote_operators_on_keyboard ? mission.remote_operators_on_keyboard.split(', ') : [],
      local_operators_on_keyboard: mission.local_operators_on_keyboard ? mission.local_operators_on_keyboard.split(', ') : [],
      planner: mission.planner,
      location: mission.location,
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setSelectedMission(null);
    setNewMission({
      mission: '',
      team_lead: '',
      mission_lead: '',
      rep: '',
      remote_operators: [],
      local_operators: [],
      remote_operators_on_keyboard: [],
      local_operators_on_keyboard: [],
      planner: '',
      location: '',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewMission(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOperatorsChange = (event) => {
    const { value } = event.target;
    setNewMission(prev => ({
      ...prev,
      remote_operators: value,
      // Clear on keyboard selections that are no longer in the main list
      remote_operators_on_keyboard: prev.remote_operators_on_keyboard.filter(op => value.includes(op))
    }));
  };

  const handleLocalOperatorsChange = (event) => {
    const { value } = event.target;
    setNewMission(prev => ({
      ...prev,
      local_operators: value,
      // Clear on keyboard selections that are no longer in the main list
      local_operators_on_keyboard: prev.local_operators_on_keyboard.filter(op => value.includes(op))
    }));
  };

  const handleRemoteOperatorsOnKeyboardChange = (event) => {
    const { value } = event.target;
    setNewMission(prev => ({
      ...prev,
      remote_operators_on_keyboard: value,
    }));
  };

  const handleLocalOperatorsOnKeyboardChange = (event) => {
    const { value } = event.target;
    setNewMission(prev => ({
      ...prev,
      local_operators_on_keyboard: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const missionData = {
        ...newMission,
        remote_operators: Array.isArray(newMission.remote_operators) ? newMission.remote_operators.join(', ') : newMission.remote_operators,
        local_operators: Array.isArray(newMission.local_operators) ? newMission.local_operators.join(', ') : newMission.local_operators,
        remote_operators_on_keyboard: Array.isArray(newMission.remote_operators_on_keyboard) ? newMission.remote_operators_on_keyboard.join(', ') : newMission.remote_operators_on_keyboard,
        local_operators_on_keyboard: Array.isArray(newMission.local_operators_on_keyboard) ? newMission.local_operators_on_keyboard.join(', ') : newMission.local_operators_on_keyboard
      };

      const url = editMode && selectedMission
        ? getApiUrl(`/missions/${selectedMission.id}`)
        : getApiUrl('/missions');

      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(missionData),
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 422) {
          // Handle validation errors
          const errorMessage = Object.entries(errorData.detail)
            .map(([field, error]) => {
              if (Array.isArray(error)) {
                return `${field}: ${error.join(', ')}`;
              }
              return `${field}: ${error}`;
            })
            .join('\n');
          throw new Error(errorMessage);
        }
        throw new Error(errorData.detail || 'Failed to save mission');
      }

      handleClose();
      fetchMissions();
    } catch (error) {
      console.error('Error saving mission:', error);
      setError(error.message || 'Failed to save mission');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this mission?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(getApiUrl(`/missions/${id}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to delete mission');
      
      fetchMissions();
    } catch (err) {
      setError('Failed to delete mission');
    }
  };

  // Function to extract year from mission name (format: YYYY-###)
  const extractYearFromMission = (missionName) => {
    const match = missionName.match(/^(\d{4})-/);
    return match ? match[1] : null;
  };

  // Function to group missions by year
  const groupMissionsByYear = (missions) => {
    const grouped = {};
    missions.forEach(mission => {
      const year = extractYearFromMission(mission.mission);
      if (year) {
        if (!grouped[year]) {
          grouped[year] = [];
        }
        grouped[year].push(mission);
      }
    });
    return grouped;
  };

  // Function to get the latest year
  const getLatestYear = (groupedMissions) => {
    const years = Object.keys(groupedMissions);
    return years.length > 0 ? Math.max(...years.map(Number)).toString() : null;
  };

  // Function to handle accordion expansion
  const handleAccordionChange = (year) => (event, isExpanded) => {
    setExpandedYear(isExpanded ? year : null);
  };

  return (
    <Container 
      maxWidth={false} 
      disableGutters
      sx={{ 
        mt: 4,
        px: { xs: 2, sm: 3 }  // Add minimal padding on small screens
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
          Missions
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpen}
            sx={{ mb: 3 }}
          >
            Create New Mission
          </Button>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Group missions by year and create accordions */}
        {(() => {
          const groupedMissions = groupMissionsByYear(filteredMissions);
          const sortedYears = Object.keys(groupedMissions).sort((a, b) => Number(b) - Number(a)); // Descending order

          return sortedYears.map(year => {
            const yearMissions = groupedMissions[year];
            // Sort missions within the year in descending order (2025-003, 2025-002, 2025-001)
            const sortedYearMissions = yearMissions.sort((a, b) => {
              // Extract the mission number part (after the dash)
              const aNumber = parseInt(a.mission.split('-')[1]) || 0;
              const bNumber = parseInt(b.mission.split('-')[1]) || 0;
              return bNumber - aNumber; // Descending order
            });
            
            const processedYearMissions = sortedYearMissions.map(mission => {
              // Process remote operators to prepare for display as chips and keep original for filtering/sorting
              const remoteOperatorsArray = mission.remote_operators ? mission.remote_operators.split(', ').filter(op => op.trim() !== '').sort((a, b) => a.localeCompare(b)) : [];
              const localOperatorsArray = mission.local_operators ? mission.local_operators.split(', ').filter(op => op.trim() !== '').sort((a, b) => a.localeCompare(b)) : [];
              const remoteOperatorsOnKeyboardArray = mission.remote_operators_on_keyboard ? mission.remote_operators_on_keyboard.split(', ').filter(op => op.trim() !== '') : [];
              const localOperatorsOnKeyboardArray = mission.local_operators_on_keyboard ? mission.local_operators_on_keyboard.split(', ').filter(op => op.trim() !== '') : [];
              
              return {
                ...mission,
                // Keep original operators strings for sorting/filtering
                remote_operators: mission.remote_operators || '',
                local_operators: mission.local_operators || '',
                // Add operators display for rendering chips
                remote_operators_display: (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {remoteOperatorsArray.map((operator) => {
                      const isOnKeyboard = remoteOperatorsOnKeyboardArray.includes(operator);
                      return (
                        <Chip 
                          key={operator} 
                          label={operator} 
                          size="small"
                          sx={{ 
                            fontSize: '0.75rem',
                            height: 24,
                            backgroundColor: isOnKeyboard ? (darkMode ? '#4caf50' : '#4caf50') : undefined,
                            color: isOnKeyboard ? 'white' : undefined,
                            '&:hover': {
                              backgroundColor: isOnKeyboard ? (darkMode ? '#45a049' : '#45a049') : undefined,
                            }
                          }}
                        />
                      );
                    })}
                  </Box>
                ),
                local_operators_display: (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {localOperatorsArray.map((operator) => {
                      const isOnKeyboard = localOperatorsOnKeyboardArray.includes(operator);
                      return (
                        <Chip 
                          key={operator} 
                          label={operator} 
                          size="small"
                          sx={{ 
                            fontSize: '0.75rem',
                            height: 24,
                            backgroundColor: isOnKeyboard ? (darkMode ? '#4caf50' : '#4caf50') : undefined,
                            color: isOnKeyboard ? 'white' : undefined,
                            '&:hover': {
                              backgroundColor: isOnKeyboard ? (darkMode ? '#45a049' : '#45a049') : undefined,
                            }
                          }}
                        />
                      );
                    })}
                  </Box>
                ),
                actions: isAdmin ? (
                  <>
                    <IconButton onClick={() => handleEdit(mission)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(mission.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </>
                ) : null
              };
            });

            return (
              <Accordion 
                key={year}
                expanded={expandedYear === year}
                onChange={handleAccordionChange(year)}
                sx={{ mb: 1 }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: expandedYear === year
                      ? (darkMode ? 'rgba(25, 118, 210, 0.16)' : 'primary.light')
                      : (darkMode ? '#1e1e1e' : '#f5f5f5'),
                    '&:hover': {
                      backgroundColor: darkMode ? 'rgba(25, 118, 210, 0.24)' : 'primary.light',
                    }
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {year} Missions ({yearMissions.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <NewTable 
                    data={processedYearMissions} 
                    columns={columns} 
                  />
                </AccordionDetails>
                <Box sx={{ p: 2, backgroundColor: darkMode ? '#262626' : '#f5f5f5', borderTop: '1px solid', borderColor: darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)' }}>
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}>
                    <Box component="span" sx={{ 
                      width: 16, 
                      height: 16, 
                      backgroundColor: '#4caf50', 
                      borderRadius: '4px',
                      display: 'inline-block'
                    }} />
                    Green chips indicate operators who were "On Keyboard" during the mission
                  </Typography>
                </Box>
              </Accordion>
            );
          });
        })()}

        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
          <DialogTitle>{editMode ? 'Edit Mission' : 'Add New Mission'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Mission"
              name="mission"
              value={newMission.mission}
              onChange={handleChange}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Team Lead</InputLabel>
              <Select
                name="team_lead"
                value={newMission.team_lead}
                onChange={handleChange}
                label="Team Lead"
                required
              >
                {teamMembers.map((member) => (
                  <MenuItem key={member.id} value={member.name}>
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Mission Lead</InputLabel>
              <Select
                name="mission_lead"
                value={newMission.mission_lead}
                onChange={handleChange}
                label="Mission Lead"
                required
              >
                {teamMembers.map((member) => (
                  <MenuItem key={member.id} value={member.name}>
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Rep</InputLabel>
              <Select
                name="rep"
                value={newMission.rep}
                onChange={handleChange}
                label="Rep"
                required
              >
                {teamMembers.map((member) => (
                  <MenuItem key={member.id} value={member.name}>
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Remote Operators</InputLabel>
              <Select
                multiple
                name="remote_operators"
                value={newMission.remote_operators}
                onChange={handleOperatorsChange}
                label="Remote Operators"
                required
                input={<OutlinedInput label="Remote Operators" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                {teamMembers.map((member) => (
                  <MenuItem key={member.id} value={member.name}>
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Local Operators</InputLabel>
              <Select
                multiple
                name="local_operators"
                value={newMission.local_operators}
                onChange={handleLocalOperatorsChange}
                label="Local Operators"
                required
                input={<OutlinedInput label="Local Operators" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                {teamMembers.map((member) => (
                  <MenuItem key={member.id} value={member.name}>
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="h6" sx={{ mt: 3, mb: 2, color: 'primary.main' }}>
              On Keyboard Operators
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select which operators were actively on keyboard during this mission. These will be highlighted in green on the missions table.
            </Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>Remote Operators on Keyboard</InputLabel>
              <Select
                multiple
                name="remote_operators_on_keyboard"
                value={newMission.remote_operators_on_keyboard}
                onChange={handleRemoteOperatorsOnKeyboardChange}
                label="Remote Operators on Keyboard"
                input={<OutlinedInput label="Remote Operators on Keyboard" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                {newMission.remote_operators.length > 0 ? (
                  newMission.remote_operators.map((operator) => (
                    <MenuItem key={operator} value={operator}>
                      {operator}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    No remote operators selected above
                  </MenuItem>
                )}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Local Operators on Keyboard</InputLabel>
              <Select
                multiple
                name="local_operators_on_keyboard"
                value={newMission.local_operators_on_keyboard}
                onChange={handleLocalOperatorsOnKeyboardChange}
                label="Local Operators on Keyboard"
                input={<OutlinedInput label="Local Operators on Keyboard" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                {newMission.local_operators.length > 0 ? (
                  newMission.local_operators.map((operator) => (
                    <MenuItem key={operator} value={operator}>
                      {operator}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    No local operators selected above
                  </MenuItem>
                )}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Planner</InputLabel>
              <Select
                name="planner"
                value={newMission.planner}
                onChange={handleChange}
                label="Planner"
                required
              >
                {teamMembers.map((member) => (
                  <MenuItem key={member.id} value={member.name}>
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Location"
              name="location"
              value={newMission.location}
              onChange={handleChange}
              margin="normal"
              required
            />
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

export default Missions; 