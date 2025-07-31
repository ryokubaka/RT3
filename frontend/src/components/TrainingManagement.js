import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon, FilePresent as FileIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import DocumentCell from './DocumentCell';
import { getApiUrl } from '../utils/apiConfig';
import NewTable from './NewTable';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`training-tabpanel-${index}`}
      aria-labelledby={`training-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Tab accessibility props
// eslint-disable-next-line no-unused-vars
function a11yProps(index) {
  return {
    id: `training-tab-${index}`,
    'aria-controls': `training-tabpanel-${index}`,
  };
}

// Replace direct imports with lazy imports
const JQRAdminTracker = lazy(() => import('./JQRAdminTracker'));
const RedTeamTab = lazy(() => import('./RedTeamTab'));
const CertificationsTab = lazy(() => import('./CertificationsTab'));
const VendorTrainingTab = lazy(() => import('./VendorTrainingTab'));
const SkillLevelTab = lazy(() => import('./SkillLevelTab'));

const TrainingManagement = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [redTeamTrainings, setRedTeamTrainings] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [vendorTrainings, setVendorTrainings] = useState([]);
  const [skillLevelHistory, setSkillLevelHistory] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [operators, setOperators] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [masterOperatorFilter, setMasterOperatorFilter] = useState('all');
  const [activeDialogType, setActiveDialogType] = useState('');
  const [trainingTypes, setTrainingTypes] = useState([]);
  const [dataCache, setDataCache] = useState({
    redTeam: null,
    certifications: null,
    vendor: null,
    skillLevel: null
  });
  const [loadingStates, setLoadingStates] = useState({
    redTeam: false,
    certifications: false,
    vendor: false,
    skillLevel: false
  });

  // Add sanitizeDate helper
  const sanitizeDate = (value) => {
    if (!value || value === 'NaN-NaN-NaN') return null;
    // Optionally, add more validation here
    return value;
  };

  // Define fetch functions first
  const fetchRedTeamTrainings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(getApiUrl('/training/red-team'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch Red Team Training data');
      const data = await response.json();
      setRedTeamTrainings(data);
      setDataCache(prev => ({ ...prev, redTeam: data }));
    } catch (err) {
      setError('Failed to load Red Team Training data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchCertifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(getApiUrl('/training/certs'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch Certifications data');
      const data = await response.json();
      setCertifications(data);
      setDataCache(prev => ({ ...prev, certifications: data }));
    } catch (err) {
      setError('Failed to load Certifications data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchVendorTrainings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(getApiUrl('/training/vendor'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch Vendor Training data');
      const data = await response.json();
      setVendorTrainings(data);
      setDataCache(prev => ({ ...prev, vendor: data }));
    } catch (err) {
      setError('Failed to load Vendor Training data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchSkillLevelHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(getApiUrl('/training/skill-level'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch Skill Level History data');
      const data = await response.json();
      setSkillLevelHistory(data);
      setDataCache(prev => ({ ...prev, skillLevel: data }));
    } catch (err) {
      setError('Failed to load Skill Level History data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Define refreshDataAfterDocumentChange before it's used
  const refreshDataAfterDocumentChange = useCallback((recordType) => {
    switch (recordType) {
      case 'red_team':
        setDataCache(prev => ({ ...prev, redTeam: null }));
        fetchRedTeamTrainings();
        break;
      case 'certification':
        setDataCache(prev => ({ ...prev, certifications: null }));
        fetchCertifications();
        break;
      case 'vendor':
        setDataCache(prev => ({ ...prev, vendor: null }));
        fetchVendorTrainings();
        break;
      case 'skill_level':
        setDataCache(prev => ({ ...prev, skillLevel: null }));
        fetchSkillLevelHistory();
        break;
      default:
        break;
    }
  }, [fetchRedTeamTrainings, fetchCertifications, fetchVendorTrainings, fetchSkillLevelHistory]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Fetch user data to determine admin status and current user
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
      setIsAdmin(userData.team_role === 'ADMIN');
      setCurrentUser(userData);
      return userData;
    } catch (err) {
      console.error('Error fetching user data:', err);
      navigate('/login');
      return null;
    }
  }, [navigate]);

  // Fetch operators list for dropdowns
  const fetchOperators = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(getApiUrl('/team-roster/'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch operators');
      const data = await response.json();
      // Filter to only active operators
      const activeOperators = data.filter(op => op.active);
      setOperators(activeOperators);
    } catch (err) {
      console.error('Error fetching operators:', err);
    }
  }, [navigate]);

  // Initialize user data and operators on component mount
  useEffect(() => {
    fetchUserData();
    fetchOperators();
  }, [fetchUserData, fetchOperators]);

  // Fetch initial data for all tabs
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchRedTeamTrainings(),
          fetchCertifications(),
          fetchVendorTrainings(),
          fetchSkillLevelHistory()
        ]);
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load training data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [fetchRedTeamTrainings, fetchCertifications, fetchVendorTrainings, fetchSkillLevelHistory]);

  // Update data fetching functions to use cache
  useEffect(() => {
    const fetchDataForTab = async () => {
      setLoading(false);
      setError('');
      
      if (tabValue === 1 && !dataCache.redTeam) {
        setLoadingStates(prev => ({ ...prev, redTeam: true }));
        await fetchRedTeamTrainings();
        setLoadingStates(prev => ({ ...prev, redTeam: false }));
      } else if (tabValue === 2 && !dataCache.certifications) {
        setLoadingStates(prev => ({ ...prev, certifications: true }));
        await fetchCertifications();
        setLoadingStates(prev => ({ ...prev, certifications: false }));
      } else if (tabValue === 3 && !dataCache.vendor) {
        setLoadingStates(prev => ({ ...prev, vendor: true }));
        await fetchVendorTrainings();
        setLoadingStates(prev => ({ ...prev, vendor: false }));
      } else if (tabValue === 4 && !dataCache.skillLevel) {
        setLoadingStates(prev => ({ ...prev, skillLevel: true }));
        await fetchSkillLevelHistory();
        setLoadingStates(prev => ({ ...prev, skillLevel: false }));
      }
    };

    fetchDataForTab();
  }, [tabValue, dataCache, fetchRedTeamTrainings, fetchCertifications, fetchVendorTrainings, fetchSkillLevelHistory]);

  // Update useEffect to extract unique training types
  useEffect(() => {
    if (redTeamTrainings.length > 0) {
      const types = [...new Set(redTeamTrainings.map(training => training.training_type).filter(Boolean))];
      setTrainingTypes(types);
    }
  }, [redTeamTrainings]);

  // Handle edit button click
  const handleEditClick = useCallback((record, type) => {
    const canEdit = isAdmin || record.operator_name === currentUser?.name;
    if (!canEdit) {
      setError('You can only edit your own records');
      return;
    }

    setActiveDialogType(type);
    
    const formatDate = (dateString) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (e) {
        console.error('Invalid date:', dateString, e);
        return '';
      }
    };
    
    setFormData({
      id: record.id,
      operator_name: record.operator_name,
      ...(type === 'redTeam' && {
        training_name: record.training_name,
        training_type: record.training_type,
        due_date: formatDate(record.due_date),
        expiration_date: formatDate(record.expiration_date),
        date_submitted: formatDate(record.date_submitted),
        file_url: record.file_url
      }),
      ...(type === 'certification' && {
        certification_name: record.certification_name,
        date_acquired: formatDate(record.date_acquired),
        training_hours: record.training_hours || '',
        expiration_date: formatDate(record.expiration_date),
        file_url: record.file_url,
        dod_8140: record.dod_8140 || false
      }),
      ...(type === 'vendor' && {
        class_name: record.class_name,
        start_date: formatDate(record.start_date),
        end_date: formatDate(record.end_date),
        hours: record.hours || '',
        location: record.location || '',
        file_url: record.file_url
      }),
      ...(type === 'skillLevel' && {
        skill_level: record.skill_level,
        date_assigned: formatDate(record.date_assigned),
        signed_memo_url: record.signed_memo_url
      })
    });
    
    setDialogOpen(true);
  }, [isAdmin, currentUser]);

  // Handle delete button click
  const handleDeleteClick = useCallback(async (record, type) => {
    const canDelete = isAdmin || record.operator_name === currentUser?.name;
    if (!canDelete) {
      setError('You can only delete your own records');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      let url;
      let recordType;
      if (type === 'redTeam') {
        url = getApiUrl(`/training/red-team/${record.id}`);
        recordType = 'red_team';
      } else if (type === 'certification') {
        url = getApiUrl(`/training/certs/${record.id}`);
        recordType = 'certification';
      } else if (type === 'vendor') {
        url = getApiUrl(`/training/vendor/${record.id}`);
        recordType = 'vendor';
      } else if (type === 'skillLevel') {
        url = getApiUrl(`/training/skill-level/${record.id}`);
        recordType = 'skill_level';
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete record');
      }

      // Refresh the data using the correct record type
      await refreshDataAfterDocumentChange(recordType);
      setSuccess('Record deleted successfully');
    } catch (err) {
      setError(`Failed to delete record: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentUser, navigate, refreshDataAfterDocumentChange]);

  // Open add dialog for the appropriate tab
  const handleOpenAddDialog = (type) => {
    setActiveDialogType(type);
    
    // Set initial form data based on dialog type and current user
    const baseFormData = {
      operator_name: currentUser?.name || '',
    };

    if (type === 'redTeam') {
      setFormData({
        ...baseFormData,
        training_name: '',
        training_type: '',
        due_date: '',
        expiration_date: '',
        date_submitted: '',
        file_url: ''
      });
    } else if (type === 'certification') {
      setFormData({
        ...baseFormData,
        certification_name: '',
        date_acquired: '',
        training_hours: '',
        expiration_date: '',
        file_url: '',
        dod_8140: false
      });
    } else if (type === 'vendor') {
      setFormData({
        ...baseFormData,
        class_name: '',
        start_date: '',
        end_date: '',
        hours: '',
        location: '',
        file_url: ''
      });
    } else if (type === 'skillLevel') {
      setFormData({
        ...baseFormData,
        skill_level: '',
        date_assigned: '',
        signed_memo_url: ''
      });
    }
    
    setDialogOpen(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setActiveDialogType('');
    setFormData({});
  };

  // Handle form input changes
  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      return;
    }
    
    // Handle date inputs
    if (name.includes('date')) {
      // Keep the date exactly as entered by the user
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Table columns for Red Team Training
  const redTeamColumns = [
    { id: 'operator_name', label: 'Operator', minWidth: 150 },
    { id: 'training_name', label: 'Training Name', minWidth: 200 },
    { id: 'training_type', label: 'Training Type', minWidth: 150 },
    { 
      id: 'due_date', 
      label: 'Due Date', 
      minWidth: 120, 
      format: (value) => {
        if (!value) return '-';
        try {
          const [year, month, day] = value.split('-');
          return `${month}/${day}/${year}`;
        } catch (e) {
          console.error('Invalid date:', value, e);
          return '-';
        }
      }
    },
    { 
      id: 'expiration_date', 
      label: 'Expiration Date', 
      minWidth: 120, 
      format: (value) => {
        if (!value) return '-';
        try {
          const [year, month, day] = value.split('-');
          return `${month}/${day}/${year}`;
        } catch (e) {
          console.error('Invalid date:', value, e);
          return '-';
        }
      }
    },
    { 
      id: 'date_submitted', 
      label: 'Date Submitted', 
      minWidth: 120, 
      format: (value) => {
        if (!value) return '-';
        try {
          const [year, month, day] = value.split('-');
          return `${month}/${day}/${year}`;
        } catch (e) {
          console.error('Invalid date:', value, e);
          return '-';
        }
      }
    },
    { 
      id: 'file_url', 
      label: 'Document', 
      minWidth: 220, 
      renderCell: (row) => (
        <DocumentCell
          row={row}
          isAdmin={isAdmin}
          onUpload={(data) => {
            refreshDataAfterDocumentChange('red_team');
          }}
          onDelete={() => {
            refreshDataAfterDocumentChange('red_team');
          }}
          documentType="red_team"
          currentUser={currentUser}
        />
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 120,
      renderCell: (row) => {
        const canEdit = isAdmin || row.operator_name === currentUser?.name;
        if (!canEdit) return null;
        return (
          <Box>
            <IconButton 
              size="small" 
              color="primary" 
              onClick={() => handleEditClick(row, 'redTeam')}
            >
              <EditIcon />
            </IconButton>
            <IconButton 
              size="small" 
              color="error" 
              onClick={() => handleDeleteClick(row, 'redTeam')}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        );
      }
    }
  ];

  // Memoize the columns
  const certColumns = React.useMemo(() => [
    { id: 'operator_name', label: 'Operator', minWidth: 150 },
    { id: 'certification_name', label: 'Certification', minWidth: 200 },
    { 
      id: 'date_acquired', 
      label: 'Date Acquired', 
      minWidth: 120,
      format: (value) => {
        if (!value) return '-';
        try {
          const [year, month, day] = value.split('-');
          return `${month}/${day}/${year}`;
        } catch (e) {
          console.error('Invalid date:', value, e);
          return '-';
        }
      }
    },
    { id: 'training_hours', label: 'Training Hours', minWidth: 120 },
    { 
      id: 'expiration_date', 
      label: 'Expiration Date', 
      minWidth: 120,
      format: (value) => {
        if (!value) return '-';
        try {
          const [year, month, day] = value.split('-');
          return `${month}/${day}/${year}`;
        } catch (e) {
          console.error('Invalid date:', value, e);
          return '-';
        }
      }
    },
    {
      id: 'dod_8140',
      label: 'DoD 8140',
      minWidth: 100,
      renderCell: (row) => row.dod_8140 ? (
        <CheckCircleIcon style={{ color: 'green' }} />
      ) : (
        <CancelIcon style={{ color: 'red' }} />
      )
    },
    { 
      id: 'file_url', 
      label: 'Document', 
      minWidth: 220,
      renderCell: (row) => (
        <DocumentCell
          row={row}
          isAdmin={isAdmin}
          onUpload={(data) => {
            refreshDataAfterDocumentChange('certification');
          }}
          onDelete={() => {
            refreshDataAfterDocumentChange('certification');
          }}
          documentType="certification"
          currentUser={currentUser}
        />
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 120,
      renderCell: (row) => {
        const canEdit = isAdmin || row.operator_name === currentUser?.name;
        if (!canEdit) return null;
        return (
          <Box>
            <IconButton 
              size="small" 
              color="primary" 
              onClick={() => handleEditClick(row, 'certification')}
            >
              <EditIcon />
            </IconButton>
            <IconButton 
              size="small" 
              color="error" 
              onClick={() => handleDeleteClick(row, 'certification')}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        );
      }
    }
  ], [isAdmin, handleEditClick, handleDeleteClick, currentUser, refreshDataAfterDocumentChange]);

  // Table columns for Vendor Training
  const vendorColumns = [
    { id: 'operator_name', label: 'Operator', minWidth: 150 },
    { id: 'class_name', label: 'Class Name', minWidth: 200 },
    { 
      id: 'start_date', 
      label: 'Start Date', 
      minWidth: 120, 
      format: (value) => {
        if (!value) return '-';
        try {
          const [year, month, day] = value.split('-');
          return `${month}/${day}/${year}`;
        } catch (e) {
          console.error('Invalid date:', value, e);
          return '-';
        }
      }
    },
    { 
      id: 'end_date', 
      label: 'End Date', 
      minWidth: 120, 
      format: (value) => {
        if (!value) return '-';
        try {
          const [year, month, day] = value.split('-');
          return `${month}/${day}/${year}`;
        } catch (e) {
          console.error('Invalid date:', value, e);
          return '-';
        }
      }
    },
    { id: 'hours', label: 'Hours', minWidth: 80 },
    { id: 'location', label: 'Location', minWidth: 150 },
    { 
      id: 'file_url', 
      label: 'Document', 
      minWidth: 220,
      renderCell: (row) => (
        <DocumentCell
          row={row}
          isAdmin={isAdmin}
          onUpload={(data) => {
            refreshDataAfterDocumentChange('vendor');
          }}
          onDelete={() => {
            refreshDataAfterDocumentChange('vendor');
          }}
          documentType="vendor"
          currentUser={currentUser}
        />
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 120,
      renderCell: (row) => {
        const canEdit = isAdmin || row.operator_name === currentUser?.name;
        if (!canEdit) return null;
        return (
          <Box>
            <IconButton 
              size="small" 
              color="primary" 
              onClick={() => handleEditClick(row, 'vendor')}
            >
              <EditIcon />
            </IconButton>
            <IconButton 
              size="small" 
              color="error" 
              onClick={() => handleDeleteClick(row, 'vendor')}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        );
      }
    }
  ];

  // Table columns for Skill Level History
  const skillLevelColumns = [
    { id: 'operator_name', label: 'Operator', minWidth: 150 },
    { id: 'skill_level', label: 'Skill Level', minWidth: 120 },
    { 
      id: 'date_assigned', 
      label: 'Date Assigned', 
      minWidth: 120, 
      format: (value) => {
        if (!value) return '-';
        try {
          const [year, month, day] = value.split('-');
          return `${month}/${day}/${year}`;
        } catch (e) {
          console.error('Invalid date:', value, e);
          return '-';
        }
      }
    },
    { 
      id: 'signed_memo_url', 
      label: 'Signed Memo', 
      minWidth: 220,
      renderCell: (row) => {
        if (!row.signed_memo_url) {
          return isAdmin ? (
            <Button 
              size="small" 
              variant="outlined"  
              startIcon={<FileIcon />}
              onClick={() => {
                // Open edit dialog to upload document
                setActiveDialogType('skillLevel');
                
                // Safely format dates
                const formatDate = (dateString) => {
                  if (!dateString) return '';
                  try {
                    return new Date(dateString).toISOString().split('T')[0];
                  } catch (e) {
                    console.error('Invalid date:', dateString, e);
                    return '';
                  }
                };
                
                setFormData({
                  id: row.id,
                  operator_name: row.operator_name,
                  skill_level: row.skill_level,
                  date_assigned: formatDate(row.date_assigned),
                  signed_memo_url: row.signed_memo_url
                });
                setDialogOpen(true);
              }}
            >
              Upload
            </Button>
          ) : (
            <Typography variant="body2" color="text.secondary">None</Typography>
          );
        }
        
        return (
          <DocumentCell
            row={row}
            isAdmin={isAdmin}
            onUpload={(data) => {
              refreshDataAfterDocumentChange('skill_level');
            }}
            onDelete={() => {
              refreshDataAfterDocumentChange('skill_level');
            }}
            documentType="skill_level"
            currentUser={currentUser}
          />
        );
      }
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 120,
      renderCell: (row) => {
        const canEdit = isAdmin || row.operator_name === currentUser?.name;
        if (!canEdit) return null;
        return (
          <Box>
            <IconButton 
              size="small" 
              color="primary" 
              onClick={() => handleEditClick(row, 'skillLevel')}
            >
              <EditIcon />
            </IconButton>
            <IconButton 
              size="small" 
              color="error" 
              onClick={() => handleDeleteClick(row, 'skillLevel')}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        );
      }
    }
  ];

  // Filter data for masterOperatorFilter before passing to tabs
  const filteredRedTeamTrainings = masterOperatorFilter === 'all'
    ? [...redTeamTrainings].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    : redTeamTrainings.filter(item => item.name === masterOperatorFilter);
  const filteredCertifications = masterOperatorFilter === 'all'
    ? [...certifications].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    : certifications.filter(item => item.name === masterOperatorFilter);
  const filteredVendorTrainings = masterOperatorFilter === 'all'
    ? [...vendorTrainings].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    : vendorTrainings.filter(item => item.name === masterOperatorFilter);
  const filteredSkillLevelHistory = masterOperatorFilter === 'all'
    ? [...skillLevelHistory].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    : skillLevelHistory.filter(item => item.name === masterOperatorFilter);

  // Restore handleSaveData
  const handleSaveData = async () => {
    if (!formData.operator_name) {
      setError('Operator name is required');
      return;
    }

    // Add validation for skill level
    if (activeDialogType === 'skillLevel' && !formData.skill_level) {
      setError('Skill Level is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      let response;
      let endpoint;
      let documentType;
      let fileUrlField;
      if (activeDialogType === 'redTeam') {
        endpoint = '/training/red-team';
        documentType = 'red_team';
        fileUrlField = 'file_url';
      } else if (activeDialogType === 'certification') {
        endpoint = '/training/certs';
        documentType = 'certification';
        fileUrlField = 'file_url';
      } else if (activeDialogType === 'vendor') {
        endpoint = '/training/vendor';
        documentType = 'vendor';
        fileUrlField = 'file_url';
      } else if (activeDialogType === 'skillLevel') {
        endpoint = '/training/skill-level';
        documentType = 'skill_level';
        fileUrlField = 'signed_memo_url';
      }
      const payload = { ...formData };
      // Sanitize all date fields
      payload.date_acquired = sanitizeDate(payload.date_acquired);
      payload.expiration_date = sanitizeDate(payload.expiration_date);
      payload.due_date = sanitizeDate(payload.due_date);
      payload.date_submitted = sanitizeDate(payload.date_submitted);
      payload.start_date = sanitizeDate(payload.start_date);
      payload.end_date = sanitizeDate(payload.end_date);
      payload.date_assigned = sanitizeDate(payload.date_assigned);
      delete payload.tempFile;
      if (!formData.id) {
        delete payload[fileUrlField];
      }
      if (formData.id) {
        response = await fetch(getApiUrl(`${endpoint}/${formData.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(getApiUrl(endpoint), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to save record');
      }
      const savedRecord = await response.json();
      if (formData.tempFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', formData.tempFile);
        uploadFormData.append('document_type', documentType);
        uploadFormData.append('operator_name', savedRecord.operator_name);
        uploadFormData.append('record_id', savedRecord.id);
        const uploadResponse = await fetch(getApiUrl('/training/document/upload'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadFormData,
        });
        if (!uploadResponse.ok) {
          if (uploadResponse.status === 401) {
            navigate('/login');
            return;
          }
          const errorData = await uploadResponse.json();
          throw new Error(errorData.detail || 'Failed to upload document');
        }
        const uploadData = await uploadResponse.json();
        const updateResponse = await fetch(getApiUrl(`${endpoint}/${savedRecord.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            ...savedRecord, 
            [fileUrlField]: uploadData.file_url 
          }),
        });
        if (!updateResponse.ok) {
          if (updateResponse.status === 401) {
            navigate('/login');
            return;
          }
          throw new Error('Failed to update record with file URL');
        }
      }
      await refreshDataAfterDocumentChange(documentType);
      setDialogOpen(false);
      setFormData({});
    } catch (error) {
      console.error('Save error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Loading fallback component
  const LoadingIndicator = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
      <Typography variant="h6" color="text.secondary">Loading...</Typography>
    </Box>
  );

  return (
    <Container maxWidth={false} sx={{ mt: 4, px: { xs: 1, sm: 1, md: 1, lg: 1 } }}>
      {/* Display error and success messages */}
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

      {/* Master Operator Filter */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel id="master-operator-filter-label">Filter All Tabs by Operator</InputLabel>
          <Select
            labelId="master-operator-filter-label"
            value={masterOperatorFilter}
            label="Filter All Tabs by Operator"
            onChange={(e) => setMasterOperatorFilter(e.target.value)}
            size="small"
          >
            <MenuItem value="all">All Operators</MenuItem>
            {operators
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(op => (
                <MenuItem key={op.id} value={op.name}>{op.name}</MenuItem>
              ))}
          </Select>
        </FormControl>
        {masterOperatorFilter !== 'all' && (
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => setMasterOperatorFilter('all')}
            sx={{ mt: { xs: 2, sm: 0 } }}
          >
            Clear Filter
          </Button>
        )}
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'divider',
          backgroundColor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff'
        }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{
              backgroundColor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
              '& .MuiTab-root': {
                color: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(30, 26, 26, 0.87)',
                '&.Mui-selected': {
                  color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2'
              }
            }}
          >
            <Tab label="JQR" {...a11yProps(0)} />
            <Tab label="RED TEAM TRAINING" {...a11yProps(1)} />
            <Tab label="CERTIFICATIONS" {...a11yProps(2)} />
            <Tab label="VENDOR TRAINING" {...a11yProps(3)} />
            <Tab label="SKILL LEVEL HISTORY" {...a11yProps(4)} />
          </Tabs>
        </Box>

        {/* Tab Panels with Suspense for lazy loading */}
        <TabPanel value={tabValue} index={0}>
          <Suspense fallback={<LoadingIndicator />}>
            <Box sx={{ mt: -3, ml: -3, mr: -3 }}>
              <JQRAdminTracker masterOperatorFilter={masterOperatorFilter} />
            </Box>
          </Suspense>
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <Suspense fallback={<LoadingIndicator />}>
            <RedTeamTab
              data={filteredRedTeamTrainings}
              columns={redTeamColumns}
              loading={loadingStates.redTeam}
              onAdd={() => handleOpenAddDialog('redTeam')}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              isAdmin={isAdmin}
              currentUser={currentUser}
              operators={operators}
              trainingTypes={trainingTypes}
              dialogOpen={dialogOpen && activeDialogType === 'redTeam'}
              formData={formData}
              setFormData={setFormData}
              handleInputChange={handleInputChange}
              handleDialogClose={handleCloseDialog}
              handleSave={handleSaveData}
              defaultSortColumn="training_name"
              defaultSortDirection="desc"
              onRefresh={fetchRedTeamTrainings}
            />
          </Suspense>
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <Suspense fallback={<LoadingIndicator />}>
            <CertificationsTab
              data={filteredCertifications}
              columns={certColumns}
              loading={loadingStates.certifications}
              onAdd={() => handleOpenAddDialog('certification')}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              isAdmin={isAdmin}
              currentUser={currentUser}
              operators={operators}
              dialogOpen={dialogOpen && activeDialogType === 'certification'}
              formData={formData}
              setFormData={setFormData}
              handleInputChange={handleInputChange}
              handleDialogClose={handleCloseDialog}
              handleSave={handleSaveData}
              defaultSortColumn="certification_name"
              defaultSortDirection="asc"
            />
          </Suspense>
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <Suspense fallback={<LoadingIndicator />}>
            <VendorTrainingTab
              data={filteredVendorTrainings}
              columns={vendorColumns}
              loading={loadingStates.vendor}
              onAdd={() => handleOpenAddDialog('vendor')}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              isAdmin={isAdmin}
              currentUser={currentUser}
              operators={operators}
              dialogOpen={dialogOpen && activeDialogType === 'vendor'}
              formData={formData}
              setFormData={setFormData}
              handleInputChange={handleInputChange}
              handleDialogClose={handleCloseDialog}
              handleSave={handleSaveData}
              defaultSortColumn="class_name"
              defaultSortDirection="asc"
            />
          </Suspense>
        </TabPanel>
        <TabPanel value={tabValue} index={4}>
          <Suspense fallback={<LoadingIndicator />}>
            <SkillLevelTab
              data={filteredSkillLevelHistory}
              columns={skillLevelColumns}
              loading={loadingStates.skillLevel}
              onAdd={() => handleOpenAddDialog('skillLevel')}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              isAdmin={isAdmin}
              currentUser={currentUser}
              operators={operators}
              dialogOpen={dialogOpen && activeDialogType === 'skillLevel'}
              formData={formData}
              setFormData={setFormData}
              handleInputChange={handleInputChange}
              handleDialogClose={handleCloseDialog}
              handleSave={handleSaveData}
              defaultSortColumn="date_assigned"
              defaultSortDirection="asc"
            />
          </Suspense>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default TrainingManagement; 