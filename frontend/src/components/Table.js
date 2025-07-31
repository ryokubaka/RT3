import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import {
  Box,
  TextField,
  IconButton,
  InputAdornment,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Checkbox,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import ClearIcon from '@mui/icons-material/Clear';

const ROW_HEIGHT = 48; // px, adjust as needed
const VISIBLE_COUNT = 12; // Number of rows to render at once
const BUFFER = 6; // Extra rows above and below

const VirtualizedTableRow = memo(({ row, columns, getColumnWidth, index }) => (
  <TableRow key={row.id || index} hover>
    {columns.map(column => (
      <TableCell 
        key={column.id} 
        sx={{ 
          width: getColumnWidth(column.id),
          padding: '8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'normal'
        }}
      >
        {column.renderCell ? column.renderCell(row) : row[column.id]}
      </TableCell>
    ))}
  </TableRow>
));

const Table = ({ 
  data, 
  columns, 
  onSelectAll, 
  selectedItems = [],
  defaultSortColumn = '',
  defaultSortDirection = 'asc'
}) => {
  // State management
  const [sortConfig, setSortConfig] = useState({ 
    key: defaultSortColumn, 
    direction: defaultSortDirection 
  });

  // Effect to update sort config when default props change
  useEffect(() => {
    setSortConfig({
      key: defaultSortColumn,
      direction: defaultSortDirection
    });
  }, [defaultSortColumn, defaultSortDirection]);

  const [searchTerm, setSearchTerm] = useState('');
  const [columnWidths, setColumnWidths] = useState({});
  const [resizingColumn, setResizingColumn] = useState(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const tableRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const bodyRef = useRef(null);

  // Helper function to get value from nested object path
  const getNestedValue = useCallback((obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }, []);

  // Get initial column width based on content type and expected data
  const getInitialColumnWidth = useCallback((columnId) => {
    const column = columns.find(col => col.id === columnId);
    if (column && column.width) {
      return column.width;
    }
    
    switch (columnId) {
      case 'actions':
        return 120;
      case 'email':
        return '20%';
      case 'created_at':
      case 'onboarding_date':
        return 160;
      case 'username':
      case 'name':
        return '15%';
      case 'team_role':
      case 'operators':
        return '20%';
      default:
        return 'auto';
    }
  }, [columns]);

  // Initialize column widths on first render
  useEffect(() => {
    const initialWidths = {};
    columns.forEach(column => {
      initialWidths[column.id] = getInitialColumnWidth(column.id);
    });
    setColumnWidths(initialWidths);
  }, [columns, getInitialColumnWidth]);

  // Handle mouse move during column resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (resizingColumn) {
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + deltaX);
        
        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn]: newWidth,
        }));
      }
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, startX, startWidth]);

  // Event handlers
  const startResizing = (columnId, e) => {
    e.stopPropagation();
    setResizingColumn(columnId);
    setStartX(e.clientX);
    setStartWidth(columnWidths[columnId] || getInitialColumnWidth(columnId));
  };

  const handleSort = (columnId) => {
    setSortConfig(prev => {
      if (prev.key === columnId) {
        return { key: columnId, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: columnId, direction: 'asc' };
    });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSelectAllFiltered = (event) => {
    if (event.target.checked) {
      const filteredIds = sortedFilteredData.map(item => item.id);
      onSelectAll(filteredIds);
    } else {
      const filteredIds = sortedFilteredData.map(item => item.id);
      const remainingSelected = selectedItems.filter(id => !filteredIds.includes(id));
      onSelectAll(remainingSelected);
    }
  };

  // Get column width from state or fallback to initial width
  const getColumnWidth = useCallback((columnId) => {
    if (columnWidths[columnId]) {
      return `${columnWidths[columnId]}px`;
    }
    const column = columns.find(col => col.id === columnId);
    return column?.width || 'auto';
  }, [columnWidths, columns]);

  // Memoized data processing
  const sortedFilteredData = useMemo(() => {
    let filteredData = data;

    // Apply global search
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filteredData = filteredData.filter(item =>
        columns.some(column => {
          const value = column.id.includes('.') 
            ? getNestedValue(item, column.id)
            : item[column.id];
            
          if (value === null || value === undefined) return false;
          
          const renderedValue = column.renderCell ? column.renderCell(item) : value;
          
          if (Array.isArray(renderedValue)) {
            return renderedValue.some(v => String(v).toLowerCase().includes(lowercasedTerm));
          }
          
          if (renderedValue instanceof Date) {
            return renderedValue.toLocaleDateString().toLowerCase().includes(lowercasedTerm);
          }
          
          if (typeof renderedValue === 'object' && renderedValue !== null) {
            if (renderedValue.props && renderedValue.props.label) {
              return String(renderedValue.props.label).toLowerCase().includes(lowercasedTerm);
            }
            return Object.values(renderedValue).some(v => 
              String(v).toLowerCase().includes(lowercasedTerm)
            );
          }
          
          return String(renderedValue).toLowerCase().includes(lowercasedTerm);
        })
      );
    }

    // Always apply sorting if defaultSortColumn is provided
    const sortKey = sortConfig.key || defaultSortColumn;
    const sortDirection = sortConfig.direction || defaultSortDirection;

    if (sortKey) {
      const column = columns.find(col => col.id === sortKey);
      
      filteredData.sort((a, b) => {
        // If column has a custom sortComparator, use it
        if (column && column.sortComparator) {
          return sortDirection === 'asc' 
            ? column.sortComparator(a, b)
            : column.sortComparator(b, a);
        }
        
        // Otherwise use default sorting logic
        const aValue = sortKey.includes('.') 
          ? getNestedValue(a, sortKey)
          : a[sortKey];
        const bValue = sortKey.includes('.') 
          ? getNestedValue(b, sortKey)
          : b[sortKey];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortDirection === 'asc' 
            ? aValue - bValue 
            : bValue - aValue;
        }
        
        if (Array.isArray(aValue) && Array.isArray(bValue)) {
          return sortDirection === 'asc'
            ? aValue.join(', ').localeCompare(bValue.join(', '))
            : bValue.join(', ').localeCompare(aValue.join(', '));
        }
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filteredData;
  }, [data, searchTerm, sortConfig, columns, getNestedValue, defaultSortColumn, defaultSortDirection]);

  // Selection state calculations
  const allFilteredSelected = useMemo(() => {
    if (!sortedFilteredData.length) return false;
    return sortedFilteredData.every(item => selectedItems.includes(item.id));
  }, [sortedFilteredData, selectedItems]);

  const someFilteredSelected = useMemo(() => {
    if (!sortedFilteredData.length) return false;
    return sortedFilteredData.some(item => selectedItems.includes(item.id));
  }, [sortedFilteredData, selectedItems]);

  // Virtualization calculations
  const totalRows = sortedFilteredData.length;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
  const endIdx = Math.min(totalRows, startIdx + VISIBLE_COUNT + 2 * BUFFER);
  const visibleRows = sortedFilteredData.slice(startIdx, endIdx);

  const handleBodyScroll = (e) => {
    setScrollTop(e.target.scrollTop);
  };

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2,
        gap: 2
      }}>
        <Typography variant="body2" color="text.secondary">
          {sortedFilteredData.length} records found
        </Typography>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search all columns..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ) : null,
            sx: { 
              backgroundColor: theme => theme.palette.mode === 'dark' ? '#262626' : '#ffffff',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.23)'
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.87)'
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1976d2'
              },
              '& .MuiInputAdornment-root': {
                color: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.54)'
              }
            }
          }}
          sx={{ minWidth: 250 }}
        />
      </Box>
      <TableContainer 
        component={Paper} 
        sx={{ 
          width: '100%',
          position: 'relative',
          cursor: resizingColumn ? 'col-resize' : 'default',
          overflow: 'unset',
          border: 'none',
          boxShadow: 'none'
        }}
        ref={tableRef}
      >
        <MuiTable 
          stickyHeader 
          sx={{ 
            width: '100%',
            tableLayout: 'fixed',
            '& .MuiTableHead-root': {
              '& .MuiTableCell-root': {
                backgroundColor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#e3f2fd',
                borderBottom: theme => `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#90caf9'}`,
                fontWeight: 'bold',
                color: theme => theme.palette.mode === 'dark' ? '#ffffff' : '#1976d2'
              },
              '& .MuiTableCell-stickyHeader': {
                backgroundColor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#e3f2fd'
              }
            },
            '& .MuiTableBody-root': {
              '& .MuiTableRow-root:nth-of-type(even)': {
                backgroundColor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#fafafa'
              },
              '& .MuiTableRow-root:nth-of-type(odd)': {
                backgroundColor: theme => theme.palette.mode === 'dark' ? '#262626' : '#ffffff'
              },
              '& .MuiTableRow-root:hover': {
                backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f5f5f5'
              },
              '& .MuiTableCell-root': {
                borderBottom: theme => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#e0e0e0'}`
              }
            }
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map(column => (
                <TableCell 
                  key={column.id} 
                  sx={{ 
                    width: getColumnWidth(column.id),
                    position: 'relative',
                    padding: '16px 8px',
                    userSelect: 'none',
                    backgroundColor: theme => theme.palette.mode === 'dark' ? '#1e1e1e !important' : '#e3f2fd !important'
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 0.5
                  }}>
                    {column.id === 'checkbox' ? (
                      <Checkbox
                        checked={allFilteredSelected}
                        indeterminate={someFilteredSelected && !allFilteredSelected}
                        onChange={handleSelectAllFiltered}
                        color="primary"
                        size="small"
                      />
                    ) : (
                      <>
                        <Typography 
                          onClick={() => column.sortable !== false && handleSort(column.id)}
                          sx={{ 
                            fontWeight: 'bold',
                            cursor: column.sortable !== false ? 'pointer' : 'default',
                            flexGrow: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {column.label}
                        </Typography>
                        {column.sortable !== false && (
                          <SortIcon
                            fontSize="small"
                            sx={{ 
                              opacity: sortConfig.key === column.id ? 1 : 0.3,
                              color: sortConfig.key === column.id ? 'primary.main' : 'inherit'
                            }}
                          />
                        )}
                      </>
                    )}
                  </Box>
                  <Box 
                    sx={{
                      position: 'absolute',
                      right: -3,
                      top: 0,
                      bottom: 0,
                      width: '6px',
                      cursor: 'col-resize',
                      zIndex: 10,
                      '&:hover': {
                        backgroundColor: '#1976d2',
                        opacity: 0.2
                      },
                      ...(resizingColumn === column.id && {
                        backgroundColor: '#1976d2',
                        opacity: 0.4
                      })
                    }}
                    onMouseDown={(e) => startResizing(column.id, e)}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        </MuiTable>
        {/* Virtualized Table Body */}
        <div
          ref={bodyRef}
          style={{
            maxHeight: `${VISIBLE_COUNT * ROW_HEIGHT}px`,
            overflowY: 'auto',
            position: 'relative',
            width: '100%'
          }}
          onScroll={handleBodyScroll}
        >
          <MuiTable sx={{ width: '100%', tableLayout: 'fixed' }}>
            <TableBody>
              <tr style={{ height: `${startIdx * ROW_HEIGHT}px` }} />
              {visibleRows.map((row, idx) => (
                <VirtualizedTableRow
                  key={row.id || (startIdx + idx)}
                  row={row}
                  columns={columns}
                  getColumnWidth={getColumnWidth}
                  index={startIdx + idx}
                />
              ))}
              <tr style={{ height: `${(totalRows - endIdx) * ROW_HEIGHT}px` }} />
            </TableBody>
          </MuiTable>
        </div>
      </TableContainer>
    </Box>
  );
};

export default Table; 