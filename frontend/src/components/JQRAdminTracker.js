import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  Container,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  Chip,
  Grid,
  LinearProgress,
  IconButton,
  InputAdornment,
  TablePagination,
  CircularProgress
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import NewTable from './Table';
import { getApiUrl } from '../utils/apiConfig';

// Helper function to format operator level for display
const formatOperatorLevel = (level) => {
  if (!level) return 'Unknown';
  
  return level
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Memoize the table component to prevent unnecessary re-renders
const MemoizedTable = memo(NewTable);

// Skill Level Accordion component for nested grouping
const SkillLevelAccordion = memo(({
  skillLevel,
  items,
  selectedItems,
  onItemSelect,
  onEdit,
  onTrainerSignature,
  onDelete,
  userData,
  userRole,
  canBeTrainerForTask,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onSelectAllSkillLevel
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasBeenExpanded, setHasBeenExpanded] = useState(false);

  // Memoize the items with their display properties
  const itemsWithDisplay = useMemo(() => 
    items.map(item => {
      const isSelected = selectedItems.some(selected => selected.id === item.id);
      let status_display = null;
      
      if (item.completion_date && item.operator_signature && item.trainer_signature) {
        status_display = <Chip 
          label="Complete" 
          color="success" 
          size="small" 
          sx={{ fontWeight: 'medium' }}
        />;
      } else if (item.completion_date && item.operator_signature) {
        status_display = <Chip 
          label="Pending trainer signature" 
          color="warning" 
          size="small"
          sx={{ fontWeight: 'medium' }}
        />;
      } else if (item.start_date) {
        status_display = <Chip 
          label="In Progress" 
          color="primary" 
          size="small"
          sx={{ fontWeight: 'medium' }}
        />;
      } else {
        status_display = <Chip 
          label="Not Started" 
          color="default" 
          size="small"
          sx={{ fontWeight: 'medium' }}
        />;
      }
      
      // Format dates for display
      const start_date_display = item.start_date 
        ? (() => {
            try {
              const [year, month, day] = item.start_date.split('-');
              return `${month}/${day}/${year}`;
            } catch (e) {
              console.error('Invalid date:', item.start_date, e);
              return '-';
            }
          })()
        : '-';
      
      const completion_date_display = item.completion_date 
        ? (() => {
            try {
              const [year, month, day] = item.completion_date.split('-');
              return `${month}/${day}/${year}`;
            } catch (e) {
              console.error('Invalid date:', item.completion_date, e);
              return '-';
            }
          })()
        : '-';
      
      // Create the action cell with edit button
      const actionCell = (
        <Box sx={{ display: 'flex' }}>
          <IconButton 
            size="small" 
            onClick={() => onEdit(item)}
            title="Edit"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          
          {item.operator_signature && !item.trainer_signature && (
            <IconButton 
              size="small" 
              color="secondary"
              onClick={() => onTrainerSignature(item)}
              title={
                userData && item.operator_name === userData.name ?
                  "You cannot sign off as trainer for your own tasks" :
                userRole !== 'ADMIN' && userData && !canBeTrainerForTask(item.task_skill_level, userData.operator_level) ?
                  `You must be at least ${item.task_skill_level} level to be a trainer for this task` :
                  "Sign as trainer"
              }
              disabled={
                (userData && item.operator_name === userData.name) ||
                (userRole !== 'ADMIN' && userData && !canBeTrainerForTask(item.task_skill_level, userData.operator_level))
              }
            >
              <DoneAllIcon fontSize="small" />
            </IconButton>
          )}
          
          {userData?.team_role?.includes('ADMIN') && (
            <IconButton 
              size="small" 
              color="error"
              onClick={() => onDelete(item)}
              title="Delete"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      );
      
      // Create the checkbox cell
      const checkboxCell = (
        <Checkbox 
          checked={isSelected}
          onChange={() => onItemSelect(item)}
          color="primary"
          size="small"
        />
      );
      
      return {
        ...item,
        status_display,
        start_date_display,
        completion_date_display,
        actionCell,
        checkboxCell
      };
    }),
    [items, selectedItems, userData, userRole, canBeTrainerForTask, onEdit, onTrainerSignature, onDelete, onItemSelect]
  );

  // Get paginated items
  const paginatedItems = useMemo(() => 
    itemsWithDisplay.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [itemsWithDisplay, page, rowsPerPage]
  );

  // Compute select-all state for paginated items
  const allPaginatedSelected = useMemo(() =>
    paginatedItems.length > 0 && paginatedItems.every(item => selectedItems.some(selected => selected.id === item.id)),
    [paginatedItems, selectedItems]
  );
  const anyPaginatedSelected = useMemo(() =>
    paginatedItems.some(item => selectedItems.some(selected => selected.id === item.id)),
    [paginatedItems, selectedItems]
  );

  // Handler for table header select-all
  const handleTableSelectAll = (select) => {
    if (select) {
      // Add all paginated items
      const newSelectedIds = new Set(selectedItems.map(item => item.id));
      paginatedItems.forEach(item => { newSelectedIds.add(item.id); });
      onSelectAllSkillLevel(skillLevel, false); // clear all in skill level first
      // Add all paginated items
      onSelectAllSkillLevel(skillLevel, true, Array.from(newSelectedIds));
    } else {
      // Remove all paginated items
      const paginatedIds = new Set(paginatedItems.map(item => item.id));
      const filtered = selectedItems.filter(item => !paginatedIds.has(item.id));
      onSelectAllSkillLevel(skillLevel, false, filtered.map(item => item.id));
    }
  };

  // Handle accordion expansion with lazy loading
  const handleExpand = useCallback(() => {
    if (!isExpanded) {
      setIsLoading(true);
      setTimeout(() => {
        setIsExpanded(true);
        setIsLoading(false);
        setHasBeenExpanded(true);
      }, 100);
    } else {
      setIsExpanded(false);
    }
  }, [isExpanded]);

  return (
    <Accordion 
      expanded={isExpanded} 
      onChange={handleExpand}
      sx={{ mb: 1, backgroundColor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
        '& .MuiAccordionSummary-root': {
          backgroundColor: theme => theme.palette.mode === 'dark' ? '#262626' : '#e3f2fd',
          '&:hover': { backgroundColor: theme => theme.palette.mode === 'dark' ? '#333333' : '#bbdefb' }
        }
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${skillLevel}-content`}
        id={`${skillLevel}-header`}
        sx={{ display: 'flex', alignItems: 'center' }}
      >
        {/* Skill-level select all checkbox */}
        <Checkbox
          checked={allPaginatedSelected}
          indeterminate={anyPaginatedSelected && !allPaginatedSelected}
          onClick={e => e.stopPropagation()}
          onChange={e => {
            e.stopPropagation();
            handleTableSelectAll(e.target.checked);
          }}
          color="primary"
          size="small"
          sx={{ mr: 1 }}
        />
        <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
          {formatOperatorLevel(skillLevel)} Level Tasks ({items.length})
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : hasBeenExpanded ? (
          <>
            <TablePagination
              component="div"
              count={items.length}
              page={page}
              onPageChange={onPageChange}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={onRowsPerPageChange}
              rowsPerPageOptions={[25, 50, 75, 100, 250, 500]}
            />
            
            <Box>
              <MemoizedTable 
                data={paginatedItems}
                columns={[
                  { 
                    id: 'checkbox', 
                    label: '', 
                    sortable: false, 
                    filterable: false,
                    width: '40px',
                    renderCell: (row) => row.checkboxCell
                  },
                  {
                    id: 'task.task_number',
                    label: 'Task #',
                    sortable: true,
                    filterable: true,
                    width: '100px',
                    renderCell: (row) => row.task?.task_number || 'N/A',
                    sortComparator: (a, b) => {
                      const aNumbers = (a?.task?.task_number || '').split('.').map(Number);
                      const bNumbers = (b?.task?.task_number || '').split('.').map(Number);
                      
                      for (let i = 0; i < Math.max(aNumbers.length, bNumbers.length); i++) {
                        const aNum = aNumbers[i] || 0;
                        const bNum = bNumbers[i] || 0;
                        if (aNum !== bNum) {
                          return aNum - bNum;
                        }
                      }
                      return 0;
                    }
                  },
                  { 
                    id: 'task.question', 
                    label: 'Task', 
                    sortable: true, 
                    filterable: true,
                    width: '30%',
                    renderCell: (row) => row.task?.question || 'Unknown Task'
                  },
                  { 
                    id: 'start_date', 
                    label: 'Start Date', 
                    sortable: true, 
                    filterable: true,
                    width: '100px',
                    renderCell: (row) => row.start_date_display
                  },
                  { 
                    id: 'completion_date', 
                    label: 'Completion Date', 
                    sortable: true, 
                    filterable: true,
                    width: '120px',
                    renderCell: (row) => row.completion_date_display
                  },
                  { 
                    id: 'operator_signature', 
                    label: 'Operator Signature', 
                    sortable: true, 
                    filterable: true,
                    width: '15%',
                    renderCell: (row) => row.operator_signature
                  },
                  { 
                    id: 'trainer_signature', 
                    label: 'Trainer Signature', 
                    sortable: true, 
                    filterable: true,
                    width: '15%',
                    renderCell: (row) => row.trainer_signature
                  },
                  { 
                    id: 'status', 
                    label: 'Status', 
                    sortable: true, 
                    filterable: true,
                    width: '120px',
                    renderCell: (row) => row.status_display
                  },
                  { 
                    id: 'actions', 
                    label: 'Actions', 
                    sortable: false, 
                    filterable: false,
                    width: '100px',
                    renderCell: (row) => row.actionCell
                  }
                ]} 
                onSelectAll={(select) => handleTableSelectAll(select)}
                selectedItems={selectedItems.map(item => item.id)}
                defaultSortColumn="task.task_number"
                defaultSortDirection="asc"
                selectAllChecked={allPaginatedSelected}
                selectAllIndeterminate={anyPaginatedSelected && !allPaginatedSelected}
              />
            </Box>
            
            <TablePagination
              component="div"
              count={items.length}
              page={page}
              onPageChange={onPageChange}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={onRowsPerPageChange}
              rowsPerPageOptions={[25, 50, 75, 100, 250, 500]}
            />
          </>
        ) : null}
      </AccordionDetails>
    </Accordion>
  );
});

// Memoize the operator accordion to prevent unnecessary re-renders
const OperatorAccordion = memo(({ 
  operatorName, 
  operatorData, 
  items, 
  isExpanded, 
  onToggle, 
  onSelectAll,
  selectedItems,
  onItemSelect,
  onEdit,
  onTrainerSignature,
  onDelete,
  userData,
  userRole,
  canBeTrainerForTask,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  stats
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [localExpanded, setLocalExpanded] = useState(false);

  // Group items by skill level
  const itemsBySkillLevel = useMemo(() => 
    items.reduce((acc, item) => {
      const level = item.task_skill_level || 'unknown';
      if (!acc[level]) {
        acc[level] = [];
      }
      acc[level].push(item);
      return acc;
    }, {}),
    [items]
  );

  const allSelected = useMemo(() => 
    items.every(item => selectedItems.some(selected => selected.id === item.id)),
    [items, selectedItems]
  );

  const anySelected = useMemo(() => 
    items.some(item => selectedItems.some(selected => selected.id === item.id)),
    [items, selectedItems]
  );

  // Handle accordion expansion with lazy loading
  const handleExpand = useCallback(() => {
    if (!localExpanded) {
      setIsLoading(true);
      // Simulate loading delay for better UX
      setTimeout(() => {
        setLocalExpanded(true);
        setIsLoading(false);
      }, 100);
    } else {
      setLocalExpanded(false);
    }
    onToggle(operatorName);
  }, [localExpanded, onToggle, operatorName]);

  // Add skill-level select all handler
  const handleSelectAllSkillLevel = useCallback((skillLevel, select, overrideSelectedIds = null) => {
    const skillItems = (itemsBySkillLevel[skillLevel] || []);
    if (overrideSelectedIds) {
      // Used for table select all
      return onSelectAll(operatorName, false, overrideSelectedIds);
    }
    if (select) {
      // Add all items for this skill level that aren't already selected
      const newSelectedIds = new Set(selectedItems.map(item => item.id));
      skillItems.forEach(item => { newSelectedIds.add(item.id); });
      return onSelectAll(operatorName, false, Array.from(newSelectedIds));
    } else {
      // Remove all items for this skill level
      const skillItemIds = new Set(skillItems.map(item => item.id));
      const filtered = selectedItems.filter(item => !skillItemIds.has(item.id));
      return onSelectAll(operatorName, false, filtered.map(item => item.id));
    }
  }, [itemsBySkillLevel, selectedItems, onSelectAll, operatorName]);

  return (
    <Accordion 
      expanded={isExpanded} 
      onChange={handleExpand}
      sx={{ mb: 2, backgroundColor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
        '& .MuiAccordionSummary-root': {
          backgroundColor: theme => theme.palette.mode === 'dark' ? '#262626' : '#e3f2fd',
          '&:hover': { backgroundColor: theme => theme.palette.mode === 'dark' ? '#333333' : '#bbdefb' }
        }
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`${operatorName}-content`}
        id={`${operatorName}-header`}
        sx={{ backgroundColor: anySelected ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
          '&:hover': { backgroundColor: anySelected ? 'rgba(25, 118, 210, 0.12)' : 'inherit' },
          '& .MuiAccordionSummary-content': { margin: '12px 0' }
        }}
      >
        <Grid container alignItems="center">
          <Grid item>
            {/* Operator-level select all checkbox, prevent expansion toggle */}
            <Checkbox 
              checked={allSelected && items.length > 0}
              indeterminate={anySelected && !allSelected}
              onClick={e => e.stopPropagation()}
              onChange={e => {
                e.stopPropagation();
                onSelectAll(operatorName, !allSelected);
              }}
              color="primary"
              size="small"
              sx={{ mr: 1 }}
            />
          </Grid>
          <Grid item xs>
            <Typography 
              variant="subtitle1" 
              component="div"
              sx={{ 
                color: '#1976d2',
                fontWeight: 'bold'
              }}
            >
              {operatorName} {" "}
              <Typography 
                variant="caption" 
                component="span"
                sx={{ 
                  color: '#0d47a1',
                  backgroundColor: '#bbdefb',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 'medium'
                }}
              >
                {formatOperatorLevel(operatorData.level)}
              </Typography>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                {stats.totalItems} tasks
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={stats.completionPercentage} 
                sx={{ width: '100px', mr: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {stats.completionPercentage}% complete
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {stats.completedItems > 0 && (
                <Chip 
                  label={`${stats.completedItems} Complete`} 
                  size="small" 
                  color="success"
                  variant="outlined"
                />
              )}
              {stats.pendingTrainerItems > 0 && (
                <Chip 
                  label={`${stats.pendingTrainerItems} Pending signature`} 
                  size="small" 
                  color="warning"
                  variant="outlined"
                />
              )}
              {stats.inProgressItems > 0 && (
                <Chip 
                  label={`${stats.inProgressItems} In Progress`} 
                  size="small" 
                  color="primary"
                  variant="outlined"
                />
              )}
              {stats.notStartedItems > 0 && (
                <Chip 
                  label={`${stats.notStartedItems} Not Started`} 
                  size="small" 
                  color="default"
                  variant="outlined"
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ p: 1 }}>
            {Object.entries(itemsBySkillLevel)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([skillLevel, skillItems]) => (
                <SkillLevelAccordion
                  key={skillLevel}
                  skillLevel={skillLevel}
                  items={skillItems}
                  selectedItems={selectedItems}
                  onItemSelect={onItemSelect}
                  onEdit={onEdit}
                  onTrainerSignature={onTrainerSignature}
                  onDelete={onDelete}
                  userData={userData}
                  userRole={userRole}
                  canBeTrainerForTask={canBeTrainerForTask}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  onPageChange={onPageChange}
                  onRowsPerPageChange={onRowsPerPageChange}
                  onSelectAllSkillLevel={handleSelectAllSkillLevel}
                />
              ))}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
});

const JQRAdminTracker = ({ masterOperatorFilter = 'all' }) => {
  const [trackerItems, setTrackerItems] = useState([]);
  const [operators, setOperators] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState('');
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [singleEditOpen, setSingleEditOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [expandedOperators, setExpandedOperators] = useState({});
  const [bulkEditData, setBulkEditData] = useState({
    start_date: '',
    completion_date: '',
    operator_signature: '',
    trainer_signature: ''
  });
  const [singleEditData, setSingleEditData] = useState({
    start_date: '',
    completion_date: '',
    operator_signature: '',
    trainer_signature: ''
  });
  const [userData, setUserData] = useState(null);
  const dataFetchedRef = useRef(false);
  const navigate = useNavigate();
  
  // Add pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const ITEM_HEIGHT = 50; // Estimated height of each item

  // Use useEffect for debug logging instead of top-level code
  useEffect(() => {
    
  }, [userRole]);

  // Memoize grouped items to prevent recalculation on every render
  const groupedItems = useMemo(() => 
    trackerItems.reduce((acc, item) => {
      if (!acc[item.operator_name]) {
        acc[item.operator_name] = {
          items: [],
          level: item.operator_level
        };
      }
      acc[item.operator_name].items.push(item);
      return acc;
    }, {}),
    [trackerItems]
  );

  // Handle scroll events for virtualization
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, clientHeight } = containerRef.current;
    const start = Math.floor(scrollTop / ITEM_HEIGHT);
    const visibleCount = Math.ceil(clientHeight / ITEM_HEIGHT);
    const end = start + visibleCount + 5; // Add buffer

    setVisibleRange({ start, end });
  }, []);

  // Add scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial calculation
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Get visible items
  const visibleItems = useMemo(() => {
    const allItems = Object.entries(groupedItems).flatMap(([operatorName, data]) => 
      data.items.map(item => ({ ...item, operatorName }))
    );
    return allItems.slice(visibleRange.start, visibleRange.end);
  }, [groupedItems, visibleRange]);

  // Calculate total height for scroll container
  const totalHeight = useMemo(() => {
    const allItems = Object.entries(groupedItems).flatMap(([operatorName, data]) => 
      data.items.map(item => ({ ...item, operatorName }))
    );
    return allItems.length * ITEM_HEIGHT;
  }, [groupedItems]);

  const fetchUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Get user info
      const response = await fetch(getApiUrl('/team-roster/me'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      setUserRole(userData.team_role);
      
      
      // Always get the latest operator level from team roster
      try {
        const rosterResponse = await fetch(getApiUrl('/team-roster/'), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (rosterResponse.ok) {
          const operators = await rosterResponse.json();
          
          
          // Find the operator entry that matches the user's name
          const operatorEntry = operators.find(op => op.name === userData.name);
          if (operatorEntry) {
            
            // Add the operator level to the user data
            userData.operator_level = operatorEntry.operator_level;
          } else {
            
            // Set a default level for admins to prevent permission issues
            if (userData.team_role?.includes('ADMIN')) {
              userData.operator_level = 'master';
            }
          }
        }
      } catch (err) {
        console.error('Error fetching operator data:', err);
      }
      
      dataFetchedRef.current = true; // Mark data as fetched
      setUserData(userData); // Store user data in state
      return userData;
    } catch (err) {
      console.error('Error fetching user data:', err);
      navigate('/login');
      return null;
    }
  }, [navigate]);

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

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch operators');
      const data = await response.json();
      
      setOperators(data);

      // Initialize expanded state for each operator to be collapsed by default
      const expanded = {};
      data.forEach(op => {
        expanded[op.name] = false; // Set to false to start collapsed
      });
      setExpandedOperators(expanded);
    } catch (err) {
      setError('Failed to load operators');
    }
  }, [navigate]);

  // Optimize fetchTrackerItems with request caching
  const fetchTrackerItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Use AbortController for request cancellation
      const controller = new AbortController();
      const signal = controller.signal;

      // Cache key for the request
      const cacheKey = `jqr_tracker_${selectedOperator}_${masterOperatorFilter}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        // Use cached data if it's less than 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setTrackerItems(data);
          setLoading(false);
          return;
        }
      }

      // Fetch roster data
      const rosterResponse = await fetch(getApiUrl('/team-roster/'), {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });

      if (!rosterResponse.ok) throw new Error('Failed to fetch team roster data');
      const rosterData = await rosterResponse.json();
      setOperators(rosterData);

      // Create operator level mapping
      const operatorLevels = rosterData.reduce((acc, op) => {
        if (op.active) acc[op.name] = op.operator_level;
        return acc;
      }, {});

      const activeOperators = rosterData
        .filter(op => op.active)
        .map(op => op.name);

      // Fetch tracker items
      const url = getApiUrl('/jqr/tracker') + 
        (selectedOperator ? `?operator_name=${encodeURIComponent(selectedOperator)}` : '');

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch JQR tracker items');
      const data = await response.json();

      // Process and filter data
      const filteredData = data
        .filter(item => {
          const isActiveOperator = activeOperators.includes(item.operator_name);
          const matchesFilter = masterOperatorFilter === 'all' || 
                               item.operator_name === masterOperatorFilter;
          return isActiveOperator && matchesFilter;
        })
        .map(item => ({
          ...item,
          operator_level: operatorLevels[item.operator_name] || item.operator_level
        }));

      // Always sort by task number by default
      const sortedData = [...filteredData].sort((a, b) => {
        const aNum = (a.task?.task_number || '').split('.').map(Number);
        const bNum = (b.task?.task_number || '').split('.').map(Number);
        for (let i = 0; i < Math.max(aNum.length, bNum.length); i++) {
          const aVal = aNum[i] || 0;
          const bVal = bNum[i] || 0;
          if (aVal !== bVal) return aVal - bVal;
        }
        return 0;
      });
      setTrackerItems(sortedData);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Error loading tracker data:', err);
      setError('Failed to load JQR tracker items');
    } finally {
      setLoading(false);
    }
  }, [navigate, selectedOperator, masterOperatorFilter]);

  const syncTrackerData = async () => {
    setSyncLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      // First fetch the latest team roster to ensure we have updated operator levels
      const rosterResponse = await fetch(getApiUrl('/team-roster/'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!rosterResponse.ok) {
        throw new Error('Failed to fetch updated team roster data');
      }
      // Update the operators data with fresh data from the server
      const operatorsData = await rosterResponse.json();
      setOperators(operatorsData);
      // Now perform the sync operation
      const response = await fetch(getApiUrl('/jqr/sync-tracker'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to sync JQR tracker');
      }
      const data = await response.json();
      // Clear any cached state to ensure we get fresh data
      dataFetchedRef.current = false;
      // Clear the sessionStorage cache for this filter
      const cacheKey = `jqr_tracker_${selectedOperator}_${masterOperatorFilter}`;
      sessionStorage.removeItem(cacheKey);
      // Refresh user data to get updated levels
      await fetchUserData();
      // Refresh tracker items to reflect changes
      await fetchTrackerItems();
      let successMessage = `Sync completed! ${data.new_entries_created} new entries created.`;
      if (data.orphaned_entries_deleted > 0) {
        successMessage += ` ${data.orphaned_entries_deleted} orphaned entries removed.`;
      }
      successMessage += ' Operator levels have been updated.';
      setSuccess(successMessage);
    } catch (err) {
      setError(err.message || 'Failed to sync JQR tracker');
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => {
    if (!dataFetchedRef.current) {
      fetchUserData();
      fetchOperators();
    }
  }, [fetchUserData, fetchOperators]);

  useEffect(() => {
    fetchTrackerItems();
  }, [fetchTrackerItems]);

  // Find the useEffect that handles expandedOperators and update it
  useEffect(() => {
    // Initialize expandedOperators for any new operators
    const currentOperatorNames = Object.keys(groupedItems);
    const updatedExpandedState = { ...expandedOperators };
    
    // Only set expansion state for new operators
    currentOperatorNames.forEach(name => {
      if (updatedExpandedState[name] === undefined) {
        updatedExpandedState[name] = true; // Default to expanded only for new operators
      }
    });
    
    // Update the state if changed
    if (JSON.stringify(updatedExpandedState) !== JSON.stringify(expandedOperators)) {
      setExpandedOperators(updatedExpandedState);
    }
  }, [trackerItems, groupedItems, expandedOperators]);

  const handleOperatorChange = (event) => {
    setSelectedOperator(event.target.value);
  };

  const handleItemSelect = (item) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.id === item.id);
      if (isSelected) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  // Update handleSelectAllForOperator to support skill-level select all
  const handleSelectAllForOperator = (operatorName, select, overrideSelectedIds = null) => {
    setSelectedItems(prev => {
      if (overrideSelectedIds) {
        // Used for skill-level select all
        return trackerItems.filter(item => overrideSelectedIds.includes(item.id));
      }
      if (select) {
        // Add all items for this operator that aren't already selected
        const operatorItems = groupedItems[operatorName]?.items || [];
        const newSelectedIds = new Set(prev.map(item => item.id));
        operatorItems.forEach(item => {
          newSelectedIds.add(item.id);
        });
        return [...trackerItems.filter(item => newSelectedIds.has(item.id))];
      } else {
        // Remove all items for this operator
        return prev.filter(item => item.operator_name !== operatorName);
      }
    });
  };

  // Helper function to check if the current user can be a trainer for a given task
  const canBeTrainerForTask = (taskSkillLevel, userOperatorLevel) => {
    // Handle null/undefined values
    if (!taskSkillLevel || !userOperatorLevel) {
      
      return false;
    }
    
    // Normalize to lowercase and convert to enum format
    // Convert from "Team Member" -> "team_member" format
    let normalizedTaskLevel = String(taskSkillLevel).toLowerCase();
    let normalizedUserLevel = String(userOperatorLevel).toLowerCase();
    
    // Handle capitalized or display format
    if (normalizedUserLevel.includes(' ')) {
      normalizedUserLevel = normalizedUserLevel.replace(/\s+/g, '_');
    }
    if (normalizedTaskLevel.includes(' ')) {
      normalizedTaskLevel = normalizedTaskLevel.replace(/\s+/g, '_');
    }
    
    
    
    // If the user is admin, they can always be a trainer
    // Guard against userRole not being initialized yet
    if (userRole && userData?.team_role?.includes('ADMIN')) {
      
      return true;
    }
    
    // Direct mapping to the server's _should_assign_item_to_level function logic:
    // Team Member: Can only train member level or lower
    if (normalizedUserLevel === 'team_member') {
      return normalizedTaskLevel === 'member';
    }
    
    // Apprentice: Can only train apprentice level or lower
    if (normalizedUserLevel === 'apprentice') {
      return normalizedTaskLevel === 'apprentice';
    }
    
    // Journeyman: Can train apprentice and journeyman levels or lower
    if (normalizedUserLevel === 'journeyman') {
      return ['apprentice', 'journeyman'].includes(normalizedTaskLevel);
    }
    
    // Master: Can train all levels
    if (normalizedUserLevel === 'master') {
      return ['apprentice', 'journeyman', 'master'].includes(normalizedTaskLevel);
    }
    
    // Default: Cannot train
    return false;
  };

  const handleSingleEditOpen = async (item) => {
    setCurrentItem(item);
    
    try {
      // Fetch user data if not already available
      const user = userData || await fetchUserData();
      if (!user) {
        setError('Could not determine your identity. Please log in again.');
        return;
      }
      
      const isOwnRecord = user.name === item.operator_name;
      
      // Determine if the user can be a trainer for this task
      const canBeTrainer = canBeTrainerForTask(
        item.task_skill_level, 
        user.operator_level
      );
      
      // Show appropriate formatting for dates
      const startDateValue = item.start_date ? new Date(item.start_date).toISOString().split('T')[0] : '';
      const completionDateValue = item.completion_date ? new Date(item.completion_date).toISOString().split('T')[0] : '';
      
      // Initialize form data
      setSingleEditData({
        start_date: startDateValue,
        completion_date: completionDateValue,
        operator_signature: item.operator_signature || (isOwnRecord ? user.name : ''),
        // Only prefill trainer signature if this is not the user's own record and they can be a trainer
        trainer_signature: item.trainer_signature || (!isOwnRecord && canBeTrainer ? user.name : '')
      });
      
      setSingleEditOpen(true);
    } catch (err) {
      console.error('Error opening edit dialog:', err);
      setError('Failed to prepare edit form');
    }
  };

  const handleSingleEditClose = () => {
    setSingleEditOpen(false);
    setCurrentItem(null);
  };

  const handleSingleEditChange = (name, value) => {
    setSingleEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSingleEditSubmit = async () => {
    if (!currentItem) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Check if this is the user's own record
      const isOwnRecord = userData && currentItem.operator_name === userData.name;
      
      // Check if user can be a trainer for this task
      const canBeTrainer = userData && canBeTrainerForTask(
        currentItem.task_skill_level, 
        userData.operator_level
      );
      
      // Only include non-empty values in the update
      const updateData = {};
      
      // For own records, the user can edit all fields except trainer signature
      if (isOwnRecord) {
        // Handle dates properly, including clearing them
        updateData.start_date = singleEditData.start_date || null;
        updateData.completion_date = singleEditData.completion_date || null;
        
        // Format dates only if they are non-empty strings
        if (updateData.start_date) {
          updateData.start_date = new Date(updateData.start_date).toISOString().split('T')[0];
        }
        
        if (updateData.completion_date) {
          updateData.completion_date = new Date(updateData.completion_date).toISOString().split('T')[0];
        }
        
        // Include operator signature (can be empty to clear it)
        updateData.operator_signature = singleEditData.operator_signature;
        
        // Only include trainer signature if user is admin
        if (userRole && userData?.team_role?.includes('ADMIN')) {
          // Only allow trainer signature if operator signature exists
          if (singleEditData.operator_signature) {
            updateData.trainer_signature = singleEditData.trainer_signature;
          } else if (singleEditData.trainer_signature) {
            // If trying to add trainer signature but operator signature is empty
            throw new Error('Operator signature must be filled before adding trainer signature');
          }
        }
      } 
      // For other people's records, operators can only edit trainer signature if they can be a trainer
      else {
        // If the user can be a trainer for this skill level, or is an admin
        if ((canBeTrainer || (userRole && userData?.team_role?.includes('ADMIN'))) && singleEditData.trainer_signature) {
          // Check if operator signature exists (either previously or in current edit)
          const operatorSignatureExists = currentItem.operator_signature || 
            (updateData.operator_signature && updateData.operator_signature.trim() !== '');
          
          // Only allow trainer signature if operator signature exists
          if (operatorSignatureExists) {
            // Non-admins must check level permissions
            if (userRole !== 'ADMIN' && !canBeTrainer) {
              throw new Error(`You must be at least ${currentItem.task_skill_level} level to be a trainer for this task.`);
            }
            
            updateData.trainer_signature = singleEditData.trainer_signature;
          } else if (singleEditData.trainer_signature) {
            // If trying to add trainer signature but operator signature is empty
            throw new Error('Operator signature must be filled before adding trainer signature');
          }
        }
        
        // Admin can edit all fields
        if (userRole && userData?.team_role?.includes('ADMIN')) {
          updateData.start_date = singleEditData.start_date || null;
          updateData.completion_date = singleEditData.completion_date || null;
          updateData.operator_signature = singleEditData.operator_signature;
          
          // Format dates
          if (updateData.start_date) {
            updateData.start_date = new Date(updateData.start_date).toISOString().split('T')[0];
          }
          
          if (updateData.completion_date) {
            updateData.completion_date = new Date(updateData.completion_date).toISOString().split('T')[0];
          }
          
          // Re-check trainer signature constraint for admin
          if (!updateData.operator_signature && singleEditData.trainer_signature) {
            throw new Error('Operator signature must be filled before adding trainer signature');
          }
        }
      }

      
      
      const url = getApiUrl(`/jqr/tracker/${currentItem.id}`);
      
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      
      
      if (!response.ok) {
        let errorMessage = 'Failed to update item';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError);
        }
        throw new Error(errorMessage);
      }

      setSuccess('Item updated successfully');
      setSingleEditOpen(false);
      
      // Refresh tracker items
      fetchTrackerItems();
    } catch (err) {
      console.error('Error updating item:', err);
      setError(err.message || 'Failed to update item');
    }
  };

  const handleRemoveSignature = (field) => {
    if (field === 'operator_signature') {
      setSingleEditData(prev => ({
        ...prev,
        operator_signature: ''
      }));
    } else if (field === 'trainer_signature') {
      setSingleEditData(prev => ({
        ...prev,
        trainer_signature: ''
      }));
    }
  };

  const handleBulkEditOpen = async () => {
    // Don't auto-fill the trainer signature, keep it empty initially
    setBulkEditData({
      start_date: '',
      completion_date: '',
      operator_signature: '',
      trainer_signature: ''  // Keep this empty
    });
    
    setBulkEditOpen(true);
  };

  const handleBulkEditClose = () => {
    setBulkEditOpen(false);
  };

  const handleBulkEditChange = (name, value) => {
    setBulkEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBulkEditSubmit = async () => {
    if (selectedItems.length === 0) {
      setError('No items selected for bulk edit');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Get current user info if needed
      if (!userData) {
        await fetchUserData();
      }

      // Separate selected items into own tasks and other tasks
      const ownTasks = selectedItems.filter(item => userData && item.operator_name === userData.name);
      const otherTasks = selectedItems.filter(item => !userData || item.operator_name !== userData.name);
      
      // Handle differently based on whether we're updating own tasks, other tasks, or both
      if (ownTasks.length > 0 && otherTasks.length > 0) {
        // Mixed update - handle separately
        await handleMixedBulkUpdate(ownTasks, otherTasks);
        return;
      } else if (ownTasks.length > 0) {
        // Only updating own tasks - user is always allowed to do this
        await handleOwnTasksBulkUpdate(ownTasks);
        return;
      } else {
        // Only updating other tasks - need to check permissions for trainer signatures
        await handleOtherTasksBulkUpdate(otherTasks);
        return;
      }
    } catch (err) {
      console.error('Error updating items:', err);
      setError(err.message || 'Failed to update items');
    }
  };

  // Helper function to handle bulk update of user's own tasks
  const handleOwnTasksBulkUpdate = async (ownTasks) => {
    const token = localStorage.getItem('token');
    
    // Prepare update data for own tasks
    const updateData = {
      ids: ownTasks.map(item => item.id)
    };
    
    // Include fields that are set, ensuring proper date formatting and null handling
    if (bulkEditData.start_date !== undefined) {
      updateData.start_date = bulkEditData.start_date ? new Date(bulkEditData.start_date).toISOString().split('T')[0] : null;
    }
    
    if (bulkEditData.completion_date !== undefined) {
      updateData.completion_date = bulkEditData.completion_date ? new Date(bulkEditData.completion_date).toISOString().split('T')[0] : null;
    }
    
    if (bulkEditData.operator_signature !== undefined) {
      updateData.operator_signature = bulkEditData.operator_signature || null;
    }
    
    // Never include trainer signature for own tasks
    
    
    
    const response = await fetch(getApiUrl('/jqr/bulk-tracker'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to update your tasks';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (jsonError) {
        console.error('Error parsing error response:', jsonError);
      }
      throw new Error(errorMessage);
    }
    
    setSuccess(`Successfully updated ${ownTasks.length} items`);
    setBulkEditOpen(false);
    
    // Refresh tracker items
    fetchTrackerItems();
    
    // Clear selection after successful update
    setSelectedItems([]);
  };
  
  // Helper function to handle bulk update of other users' tasks
  const handleOtherTasksBulkUpdate = async (otherTasks) => {
    const token = localStorage.getItem('token');
    
    // Prepare update data for other tasks
    const updateData = {
      ids: otherTasks.map(item => item.id)
    };
    
    // Include fields that are set, ensuring proper date formatting and null handling
    if (bulkEditData.start_date !== undefined) {
      updateData.start_date = bulkEditData.start_date ? new Date(bulkEditData.start_date).toISOString().split('T')[0] : null;
    }
    
    if (bulkEditData.completion_date !== undefined) {
      updateData.completion_date = bulkEditData.completion_date ? new Date(bulkEditData.completion_date).toISOString().split('T')[0] : null;
    }
    
    if (bulkEditData.operator_signature !== undefined) {
      updateData.operator_signature = bulkEditData.operator_signature || null;
    }
    
    // For trainer signature, check level permissions for non-admins
    if (bulkEditData.trainer_signature !== undefined) {
      // Only include trainer signature if operator signature exists
      if (bulkEditData.operator_signature) {
        // For non-admins, check if they have proper level for all selected tasks
        if (userRole !== 'ADMIN') {
          // Filter items where user doesn't have permission to be a trainer
          const unauthorizedItems = otherTasks.filter(
            item => !canBeTrainerForTask(item.task_skill_level, userData.operator_level)
          );

          if (unauthorizedItems.length > 0) {
            throw new Error(`You don't have permission to sign off as trainer on ${unauthorizedItems.length} tasks. You can only sign off on tasks at or below your operator level.`);
          }
        }
        
        updateData.trainer_signature = bulkEditData.trainer_signature || null;
      } else if (bulkEditData.trainer_signature) {
        // If trying to add trainer signature while clearing operator signature
        throw new Error('Operator signature must be filled before adding trainer signature');
      }
    }
    
    
    
    const response = await fetch(getApiUrl('/jqr/bulk-tracker'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to update other users\' tasks';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (jsonError) {
        console.error('Error parsing error response:', jsonError);
      }
      throw new Error(errorMessage);
    }
    
    setSuccess(`Successfully updated ${otherTasks.length} items`);
    setBulkEditOpen(false);
    
    // Refresh tracker items
    fetchTrackerItems();
    
    // Clear selection after successful update
    setSelectedItems([]);
  };
  
  // Helper function to handle bulk update of mixed tasks (own and others)
  const handleMixedBulkUpdate = async (ownTasks, otherTasks) => {
    const token = localStorage.getItem('token');
    
    // First handle own tasks
    const ownTasksData = {
      ids: ownTasks.map(item => item.id)
    };
    
    // Copy relevant fields but NOT trainer signature for own tasks
    if (bulkEditData.start_date !== undefined) {
      ownTasksData.start_date = bulkEditData.start_date || null;
      if (ownTasksData.start_date) {
        ownTasksData.start_date = new Date(ownTasksData.start_date).toISOString().split('T')[0];
      }
    }
    
    if (bulkEditData.completion_date !== undefined) {
      ownTasksData.completion_date = bulkEditData.completion_date || null;
      if (ownTasksData.completion_date) {
        ownTasksData.completion_date = new Date(ownTasksData.completion_date).toISOString().split('T')[0];
      }
    }
    
    if (bulkEditData.operator_signature !== undefined) {
      ownTasksData.operator_signature = bulkEditData.operator_signature;
    }
    
    
    
    const ownTasksResponse = await fetch(getApiUrl('/jqr/bulk-tracker'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(ownTasksData),
    });
    
    if (!ownTasksResponse.ok) {
      let errorMessage = 'Failed to update your own tasks';
      try {
        const errorData = await ownTasksResponse.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (jsonError) {
        console.error('Error parsing error response:', jsonError);
      }
      throw new Error(errorMessage);
    }
    
    // Now handle other operators' tasks
    const otherTasksData = {
      ids: otherTasks.map(item => item.id)
    };
    
    // Copy all fields including trainer signature for other tasks
    if (bulkEditData.start_date !== undefined) {
      otherTasksData.start_date = bulkEditData.start_date || null;
      if (otherTasksData.start_date) {
        otherTasksData.start_date = new Date(otherTasksData.start_date).toISOString().split('T')[0];
      }
    }
    
    if (bulkEditData.completion_date !== undefined) {
      otherTasksData.completion_date = bulkEditData.completion_date || null;
      if (otherTasksData.completion_date) {
        otherTasksData.completion_date = new Date(otherTasksData.completion_date).toISOString().split('T')[0];
      }
    }
    
    if (bulkEditData.operator_signature !== undefined) {
      otherTasksData.operator_signature = bulkEditData.operator_signature;
    }
    
    // Only include trainer signature if operator signature exists
    if (bulkEditData.trainer_signature !== undefined && bulkEditData.trainer_signature !== '') {
      if (bulkEditData.operator_signature !== '') {
        // For non-admins, check if they have proper level for other operators' tasks
        if (userRole !== 'ADMIN') {
          // Filter items where user doesn't have permission to be a trainer
          const unauthorizedItems = otherTasks.filter(
            item => !canBeTrainerForTask(item.task_skill_level, userData.operator_level)
          );

          if (unauthorizedItems.length > 0) {
            throw new Error(`You don't have permission to sign off as trainer on ${unauthorizedItems.length} tasks. You can only sign off on tasks at or below your operator level.`);
          }
        }
        
        otherTasksData.trainer_signature = bulkEditData.trainer_signature;
      } else if (bulkEditData.trainer_signature !== '') {
        // If trying to add trainer signature while clearing operator signature
        throw new Error('Operator signature must be filled before adding trainer signature');
      }
    }
    
    if (otherTasks.length > 0) {
      
      
      const otherTasksResponse = await fetch(getApiUrl('/jqr/bulk-tracker'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(otherTasksData),
      });
      
      if (!otherTasksResponse.ok) {
        let errorMessage = 'Failed to update other operators\' tasks';
        try {
          const errorData = await otherTasksResponse.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError);
        }
        throw new Error(errorMessage);
      }
    }
    
    // Both calls succeeded
    setSuccess(`Successfully updated ${ownTasks.length + otherTasks.length} items`);
    setBulkEditOpen(false);
    
    // Refresh tracker items
    fetchTrackerItems();
    
    // Clear selection after successful update
    setSelectedItems([]);
  };

  const handleRemoveBulkSignature = (field) => {
    if (field === 'operator_signature') {
      setBulkEditData(prev => ({
        ...prev,
        operator_signature: ''
      }));
    } else if (field === 'trainer_signature') {
      setBulkEditData(prev => ({
        ...prev,
        trainer_signature: ''
      }));
    }
  };

  const toggleOperatorExpansion = (operatorName) => {
    setExpandedOperators(prev => ({
      ...prev,
      [operatorName]: !prev[operatorName]
    }));
  };

  // Add single trainer signature function
  const handleSingleTrainerSignature = async (item) => {
    if (!item) {
      return;
    }

    // Check if operator signature is filled
    if (!item.operator_signature) {
      setError('Operator signature must be filled before adding trainer signature');
      return;
    }

    // Make sure we have user data
    if (!userData) {
      await fetchUserData();
    }

    // Prevent signing own tasks as trainer
    if (userData && item.operator_name === userData.name) {
      setError('You cannot sign off as trainer for your own tasks');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const userData = await fetchUserData();
      if (!userData || !userData.name) {
        setError('Could not determine your identity. Please log in again.');
        return;
      }

      // Check if user can be a trainer for this task
      const canBeTrainer = userData && canBeTrainerForTask(
        item.task_skill_level, 
        userData.operator_level
      );

      // Only allow trainer signature if user can be a trainer or is admin
      if (!canBeTrainer && userRole !== 'ADMIN') {
        setError(`You must be at least ${item.task_skill_level} level to be a trainer for this task. Your level: ${userData.operator_level || 'Unknown'}`);
        return;
      }

      // Preserve existing values and update trainer signature
      const updateData = {
        start_date: item.start_date,
        completion_date: item.completion_date,
        operator_signature: item.operator_signature,
        trainer_signature: userData.name
      };
      
      
      
      const url = getApiUrl(`/jqr/tracker/${item.id}`);
      
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      
      
      if (!response.ok) {
        let errorMessage = 'Failed to update trainer signature';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError);
        }
        throw new Error(errorMessage);
      }

      setSuccess('Signed off as trainer successfully');
      
      // Refresh tracker items
      fetchTrackerItems();
    } catch (err) {
      console.error('Error updating trainer signature:', err);
      setError(err.message || 'Failed to update trainer signature');
    }
  };

  // Add delete function
  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete this tracker item?\nTask: ${item.task?.question || 'Unknown Task'}`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const url = getApiUrl(`/jqr/tracker/${item.id}`);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete item';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError);
        }
        throw new Error(errorMessage);
      }

      setSuccess('Item deleted successfully');
      // Clear the sessionStorage cache for this filter
      const cacheKey = `jqr_tracker_${selectedOperator}_${masterOperatorFilter}`;
      sessionStorage.removeItem(cacheKey);
      // Refresh tracker items
      fetchTrackerItems();
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err.message || 'Failed to delete item');
    }
  };

  // Add bulk delete function
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      setError('No items selected for deletion');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} selected items? This action cannot be undone.`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Delete each item individually
      const deletePromises = selectedItems.map(item => {
        const url = getApiUrl(`/jqr/tracker/${item.id}`);
        return fetch(url, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      });

      // Wait for all deletes to complete
      const results = await Promise.all(deletePromises);
      const failedDeletes = results.filter(response => !response.ok).length;
      if (failedDeletes > 0) {
        setError(`Failed to delete ${failedDeletes} items`);
      } else {
        setSuccess(`Successfully deleted ${selectedItems.length} items`);
      }
      setSelectedItems([]);
      // Clear the sessionStorage cache for this filter
      const cacheKey = `jqr_tracker_${selectedOperator}_${masterOperatorFilter}`;
      sessionStorage.removeItem(cacheKey);
      // Refresh tracker items
      fetchTrackerItems();
    } catch (err) {
      console.error('Error deleting items:', err);
      setError(err.message || 'Failed to delete items');
    }
  };

  // Add bulk trainer signature function
  const handleBulkTrainerSignature = async () => {
    if (selectedItems.length === 0) {
      setError('No items selected for trainer signature');
      return;
    }

    // Check if any selected items are missing operator signatures
    const itemsWithoutOperatorSignature = selectedItems.filter(item => !item.operator_signature);
    if (itemsWithoutOperatorSignature.length > 0) {
      setError(`${itemsWithoutOperatorSignature.length} selected items are missing operator signatures. Trainer signature cannot be added until operator signature is filled.`);
      return;
    }

    // Check if any selected tasks are the user's own tasks
    if (!userData) {
      await fetchUserData();
    }
    
    const ownTasks = selectedItems.filter(item => userData && item.operator_name === userData.name);
    if (ownTasks.length > 0) {
      setError(`You cannot sign off as trainer for ${ownTasks.length} of your own tasks. Please select only other operators' tasks.`);
      return;
    }

    // Check if user has permission for all selected items
    if (userRole !== 'ADMIN') {
      const userData = await fetchUserData();
      if (!userData || !userData.operator_level) {
        setError('Could not determine your operator level. Please try again.');
        return;
      }

      // Filter items where user doesn't have permission to be a trainer
      const unauthorizedItems = selectedItems.filter(
        item => !canBeTrainerForTask(item.task_skill_level, userData.operator_level)
      );

      if (unauthorizedItems.length > 0) {
        setError(`You don't have permission to sign off on ${unauthorizedItems.length} selected tasks. You can only sign off on tasks at or below your operator level.`);
        return;
      }
    }

    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const userData = await fetchUserData();
      if (!userData || !userData.name) {
        setError('Could not determine your identity. Please log in again.');
        return;
      }

      // IMPORTANT: Only send the trainer signature field and IDs
      // All other fields should be undefined (not null) so they are not included in the update
      const updateData = {
        ids: selectedItems.map(item => item.id),
        trainer_signature: userData.name
      };
      
      
      
      const url = getApiUrl('/jqr/bulk-tracker');
      
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      
      
      if (!response.ok) {
        let errorMessage = 'Failed to update trainer signatures';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError);
        }
        throw new Error(errorMessage);
      }

      setSuccess(`Successfully signed off as trainer for ${selectedItems.length} items`);
      
      // Refresh tracker items
      fetchTrackerItems();
      
      // Clear selection after successful update
      setSelectedItems([]);
    } catch (err) {
      console.error('Error updating trainer signatures:', err);
      setError(err.message || 'Failed to update trainer signatures');
    }
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Memoize paginated items for each operator
  const getPaginatedItemsForOperator = useCallback((operatorName) => {
    const operatorItems = groupedItems[operatorName]?.items || [];
    return operatorItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [groupedItems, page, rowsPerPage]);

  const isSet = val => val !== null && val !== undefined && String(val).trim() !== '';
  const getOperatorStats = (operatorName) => {
    const items = groupedItems[operatorName]?.items || [];
    let completedItems = 0;
    let pendingTrainerItems = 0;
    let inProgressItems = 0;
    let notStartedItems = 0;

    // Mutually exclusive status assignment: each task is counted in exactly one category
    for (const item of items) {
      let status = '';
      if (isSet(item.completion_date) && isSet(item.operator_signature) && isSet(item.trainer_signature)) {
        completedItems++;
        status = 'Complete';
      } else if (isSet(item.completion_date) && isSet(item.operator_signature) && !isSet(item.trainer_signature)) {
        pendingTrainerItems++;
        status = 'Pending signature';
      } else if (isSet(item.start_date) && (!isSet(item.completion_date) || !isSet(item.operator_signature))) {
        inProgressItems++;
        status = 'In Progress';
      } else {
        // Only count as Not Started if not in any other status
        notStartedItems++;
        status = 'Not Started';
      }
    }

    const totalItems = items.length;
    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    return {
      totalItems,
      completedItems,
      pendingTrainerItems,
      inProgressItems,
      notStartedItems,
      completionPercentage
    };
  };

  return (
    <Container 
      maxWidth={false} 
      sx={{ 
        mt: 4, 
        px: { xs: 1, sm: 1, md: 1, lg: 1 },
        width: '100%',
        maxWidth: '100%'
      }}
    >
      <Paper 
        sx={{ 
          p: 2, 
          width: '100%', 
          maxWidth: '100%',
          overflow: 'hidden',
          backgroundColor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom color="text.primary">
            JQR Admin Tracker
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {userRole && userData?.team_role?.includes('ADMIN') && (
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />} 
                onClick={syncTrackerData}
                disabled={syncLoading}
              >
                {syncLoading ? 'Syncing...' : 'Sync Data'}
              </Button>
            )}
          </Box>
        </Box>

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

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={6} lg={6} xl={6}>
            <FormControl sx={{ minWidth: 250, flexGrow: 1, flexBasis: { xs: '100%', sm: 'auto' } }} fullWidth size="small">
              <InputLabel>Filter by Operator</InputLabel>
              <Select
                value={selectedOperator}
                onChange={handleOperatorChange}
                label="Filter by Operator"
              >
                <MenuItem value="">All Operators</MenuItem>
                {operators.map((operator) => (
                  <MenuItem key={operator.id} value={operator.name}>
                    {operator.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={6} lg={6} xl={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, alignItems: 'center', mt: { xs: 2, sm: 0 } }}>
            {selectedItems.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, width: '100%', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleBulkEditOpen}
                >
                  Bulk Edit ({selectedItems.length} selected)
                </Button>
                {/* Add button for bulk trainer signatures */}
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleBulkTrainerSignature}
                  disabled={
                    selectedItems.some(item => !item.operator_signature) || 
                    (userRole !== 'ADMIN' && 
                      userData && userData.operator_level && 
                      selectedItems.some(item => !canBeTrainerForTask(item.task_skill_level, userData.operator_level))) ||
                    (userData && selectedItems.some(item => item.operator_name === userData.name))
                  }
                  title={
                    selectedItems.some(item => !item.operator_signature) ? 
                      "Some selected items are missing operator signatures" : 
                    (userData && selectedItems.some(item => item.operator_name === userData.name)) ?
                      "You cannot sign off as trainer for your own tasks" :
                    (userRole !== 'ADMIN' && 
                      userData && userData.operator_level && 
                      selectedItems.some(item => !canBeTrainerForTask(item.task_skill_level, userData.operator_level))) ?
                      "You can only sign off on tasks at or below your operator level" :
                      "Sign off as trainer for selected items"
                  }
                >
                  Sign as Trainer
                </Button>
                {userRole && userData?.team_role?.includes('ADMIN') && (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleBulkDelete}
                  >
                    Delete ({selectedItems.length} selected)
                  </Button>
                )}
              </Box>
            )}
          </Grid>
        </Grid>

        <Box
          sx={{
            height: 'calc(100vh - 300px)',
            overflow: 'auto',
            position: 'relative'
          }}
        >
          {loading ? (
            <LinearProgress sx={{ my: 4 }} />
          ) : (
            <Box>
              {Object.keys(groupedItems).length === 0 ? (
                <Alert severity="info">
                  No tracker items found. {userRole && userData?.team_role?.includes('ADMIN') && 'Click "Sync Data" to populate the tracker.'}
                </Alert>
              ) : (
                Object.entries(groupedItems)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([operatorName, operatorData]) => {
                    const stats = getOperatorStats(operatorName);
                    return (
                      <OperatorAccordion
                        key={operatorName}
                        operatorName={operatorName}
                        operatorData={operatorData}
                        items={operatorData.items}
                        isExpanded={expandedOperators[operatorName]}
                        onToggle={toggleOperatorExpansion}
                        onSelectAll={handleSelectAllForOperator}
                        selectedItems={selectedItems}
                        onItemSelect={handleItemSelect}
                        onEdit={handleSingleEditOpen}
                        onTrainerSignature={handleSingleTrainerSignature}
                        onDelete={handleDeleteItem}
                        userData={userData}
                        userRole={userRole}
                        canBeTrainerForTask={canBeTrainerForTask}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        stats={stats}
                      />
                    );
                  })
              )}
            </Box>
          )}
        </Box>

        {/* Bulk Edit Dialog */}
        <Dialog open={bulkEditOpen} onClose={handleBulkEditClose} maxWidth="md" fullWidth>
          <DialogTitle>Bulk Edit ({selectedItems.length} items)</DialogTitle>
          <DialogContent>
            {userData && (
              <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
                {userData && selectedItems.some(item => item.operator_name === userData.name) ? (
                  "Your own tasks are included in this selection. You can update your own tasks, but cannot provide trainer signatures for them."
                ) : userRole !== 'ADMIN' && userData && userData.operator_level && 
                    selectedItems.some(item => !canBeTrainerForTask(item.task_skill_level, userData.operator_level)) ? (
                  `Some tasks are above your operator level (${userData.operator_level}). You can only provide trainer signatures for tasks at or below your level.`
                ) : (
                  "You can update all selected items with the values provided below."
                )}
              </Alert>
            )}
            
            <Box sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Note: Leave a field empty if you don't want to update that field for all selected items.
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={bulkEditData.start_date}
                  onChange={(e) => handleBulkEditChange('start_date', e.target.value)}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Completion Date"
                  type="date"
                  value={bulkEditData.completion_date}
                  onChange={(e) => handleBulkEditChange('completion_date', e.target.value)}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            
            <TextField
              fullWidth
              label="Operator Signature"
              value={bulkEditData.operator_signature}
              onChange={(e) => handleBulkEditChange('operator_signature', e.target.value)}
              margin="normal"
              placeholder="Enter your name as signature"
              InputProps={{
                endAdornment: bulkEditData.operator_signature && (
                  <InputAdornment position="end">
                    <IconButton edge="end" onClick={() => handleRemoveBulkSignature('operator_signature')}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              fullWidth
              label="Trainer Signature"
              value={bulkEditData.trainer_signature}
              onChange={(e) => handleBulkEditChange('trainer_signature', e.target.value)}
              margin="normal"
              placeholder="Enter trainer's name as signature"
              disabled={
                // If no operator signature, disable trainer signature field
                !bulkEditData.operator_signature ||
                // For non-admins, check if any selected tasks are above their level
                (userRole !== 'ADMIN' && userData && userData.operator_level && 
                  selectedItems.some(item => !canBeTrainerForTask(item.task_skill_level, userData.operator_level))) ||
                // Disable if any selected tasks belong to the current user
                (userData && selectedItems.some(item => item.operator_name === userData.name))
              }
              helperText={
                (userData && selectedItems.some(item => item.operator_name === userData.name)) ?
                  "You cannot provide a trainer signature for your own tasks" :
                !bulkEditData.operator_signature ?
                  "Operator signature must be filled before adding trainer signature" : 
                (userRole !== 'ADMIN' && userData && userData.operator_level && 
                  selectedItems.some(item => !canBeTrainerForTask(item.task_skill_level, userData.operator_level))) ?
                  "You can only sign off on tasks at or below your operator level" :
                  ""
              }
              InputProps={{
                endAdornment: bulkEditData.trainer_signature && (
                  <InputAdornment position="end">
                    <IconButton 
                      edge="end" 
                      onClick={() => handleRemoveBulkSignature('trainer_signature')}
                      disabled={
                        // If no operator signature, disable clear button
                        !bulkEditData.operator_signature ||
                        // For non-admins, check if any selected tasks are above their level
                        (userRole !== 'ADMIN' && userData && userData.operator_level && 
                          selectedItems.some(item => !canBeTrainerForTask(item.task_skill_level, userData.operator_level))) ||
                        // Disable if any selected tasks belong to the current user
                        (userData && selectedItems.some(item => item.operator_name === userData.name))
                      }
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleBulkEditClose}>Cancel</Button>
            <Button onClick={handleBulkEditSubmit} variant="contained" color="primary">
              Update {selectedItems.length} Items
            </Button>
          </DialogActions>
        </Dialog>

        {/* Single Edit Dialog */}
        <Dialog open={singleEditOpen} onClose={handleSingleEditClose} maxWidth="md" fullWidth>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {currentItem && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    Task: {currentItem.task?.question || 'Unknown Task'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Task Level: {currentItem.task_skill_level?.toUpperCase() || 'Unknown'} | 
                    Operator: {currentItem.operator_name} |
                    Level: {formatOperatorLevel(currentItem.operator_level)}
                  </Typography>
                </>
              )}
            </Box>
            
            {currentItem && userData && (
              <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
                {currentItem.operator_name === userData.name ? (
                  "This is your record. You can edit start date, completion date, and your signature."
                ) : (
                  canBeTrainerForTask(currentItem.task_skill_level, userData.operator_level) ? 
                    `You can provide a trainer signature for this ${currentItem.task_skill_level} level task as a ${userData.operator_level || 'unknown'} level operator.` : 
                    `You don't have permission to sign off on this ${currentItem.task_skill_level} level task as a ${userData.operator_level || 'unknown'} level operator.`
                )}
              </Alert>
            )}
            
            {/* Show a warning if operator level is missing */}
            {!userData?.operator_level && currentItem && (
              <Alert severity="warning" sx={{ mt: 2, mb: 1 }}>
                Your operator level information is missing. Some permissions may be limited.
              </Alert>
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={singleEditData.start_date}
                  onChange={(e) => handleSingleEditChange('start_date', e.target.value)}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  disabled={currentItem && userData && 
                    currentItem.operator_name !== userData.name && 
                    (userRole && userRole !== 'ADMIN')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Completion Date"
                  type="date"
                  value={singleEditData.completion_date}
                  onChange={(e) => handleSingleEditChange('completion_date', e.target.value)}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  disabled={currentItem && userData && 
                    currentItem.operator_name !== userData.name && 
                    (userRole && userRole !== 'ADMIN')}
                />
              </Grid>
            </Grid>
            
            <TextField
              fullWidth
              label="Operator Signature"
              value={singleEditData.operator_signature}
              onChange={(e) => handleSingleEditChange('operator_signature', e.target.value)}
              margin="normal"
              placeholder="Enter your name as signature"
              disabled={currentItem && userData && 
                currentItem.operator_name !== userData.name && 
                (userRole && userRole !== 'ADMIN')}
              InputProps={{
                endAdornment: singleEditData.operator_signature && (
                  <InputAdornment position="end">
                    <IconButton 
                      edge="end" 
                      onClick={() => handleRemoveSignature('operator_signature')}
                      disabled={currentItem && userData && 
                        currentItem.operator_name !== userData.name && 
                        (userRole && userRole !== 'ADMIN')}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              fullWidth
              label="Trainer Signature"
              value={singleEditData.trainer_signature}
              onChange={(e) => handleSingleEditChange('trainer_signature', e.target.value)}
              margin="normal"
              placeholder="Enter trainer's name as signature"
              disabled={
                currentItem && userData && (
                  // Own record - only admin can provide trainer signature
                  (currentItem.operator_name === userData.name && (userRole && userRole !== 'ADMIN')) ||
                  // Others' records - need sufficient level to be a trainer
                  (currentItem.operator_name !== userData.name && 
                   !canBeTrainerForTask(currentItem.task_skill_level, userData.operator_level) && 
                   (userRole && userRole !== 'ADMIN')) ||
                  // Disable if operator signature is empty
                  !singleEditData.operator_signature
                )
              }
              helperText={
                !singleEditData.operator_signature ?
                  "Operator signature must be filled before adding trainer signature" :
                currentItem && userData && currentItem.operator_name === userData.name && (userRole && userRole !== 'ADMIN') ? 
                  "You cannot provide a trainer signature for your own tasks" : 
                currentItem && userData && currentItem.operator_name !== userData.name && 
                !canBeTrainerForTask(currentItem.task_skill_level, userData.operator_level) && 
                (userRole && userRole !== 'ADMIN') ?
                  `You must be at least ${currentItem.task_skill_level} level to be a trainer for this task. Your level: ${userData.operator_level || 'Unknown'}` :
                  ""
              }
              InputProps={{
                endAdornment: singleEditData.trainer_signature && (
                  <InputAdornment position="end">
                    <IconButton 
                      edge="end" 
                      onClick={() => handleRemoveSignature('trainer_signature')}
                      disabled={
                        currentItem && userData && (
                          // Own record - only admin can provide trainer signature
                          (currentItem.operator_name === userData.name && (userRole && userRole !== 'ADMIN')) ||
                          // Others' records - need sufficient level to be a trainer
                          (currentItem.operator_name !== userData.name && 
                           !canBeTrainerForTask(currentItem.task_skill_level, userData.operator_level) && 
                           (userRole && userRole !== 'ADMIN')) ||
                          // Disable if operator signature is empty
                          !singleEditData.operator_signature
                        )
                      }
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSingleEditClose}>Cancel</Button>
            <Button 
              onClick={handleSingleEditSubmit} 
              variant="contained" 
              color="primary"
              disabled={currentItem && userData && 
                currentItem.operator_name !== userData.name && 
                !canBeTrainerForTask(currentItem.task_skill_level, userData.operator_level) && 
                (userRole && userRole !== 'ADMIN')}
            >
              Update
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default JQRAdminTracker; 