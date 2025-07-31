import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  Button
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import Table from './Table';

const NewTable = ({ 
  columns, 
  rows, 
  title, 
  groupByOperator = false,
  filterOperator = 'all',
  expandFilteredOperator = false,
  onSelectAll,
  selectedItems = [],
  defaultSortColumn = '',
  defaultSortDirection = 'asc'
}) => {
  // State management
  const [groupedData, setGroupedData] = useState({});
  const [expandedOperators, setExpandedOperators] = useState({});
  const [selectedOperator, setSelectedOperator] = useState(filterOperator);
  const [operators, setOperators] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Track hasBeenExpanded for each operator
  const [hasBeenExpanded, setHasBeenExpanded] = useState({});
  
  // Update selected operator when filterOperator prop changes
  useEffect(() => {
    setSelectedOperator(filterOperator);
  }, [filterOperator]);
  
  // Format and group data
  useEffect(() => {
    if (!rows || rows.length === 0) {
      setGroupedData({});
      setOperators([]);
      return;
    }
    
    // Get unique operators
    const uniqueOperators = [...new Set(rows.map(row => row.operator_name))].filter(Boolean);
    setOperators(uniqueOperators);
    
    if (groupByOperator) {
      // Group data by operator
      const grouped = rows.reduce((acc, row) => {
        const operatorName = row.operator_name || 'Unassigned';
        
        if (!acc[operatorName]) {
          acc[operatorName] = [];
        }
        
        // Format the data
        const formattedRow = { ...row };
        columns.forEach(column => {
          if (column.format && formattedRow[column.id] !== undefined) {
            formattedRow[column.id] = column.format(formattedRow[column.id]);
          }
        });
        
        acc[operatorName].push(formattedRow);
        return acc;
      }, {});
      
      setGroupedData(grouped);
      
      // Only set initial expanded state if it hasn't been set yet
      if (Object.keys(expandedOperators).length === 0) {
        const expanded = {};
        Object.keys(grouped).forEach(op => {
          expanded[op] = false;
        });
        setExpandedOperators(expanded);
      }
    } else {
      // Just format the data without grouping
      const formattedRows = rows.map(row => {
        const formattedRow = { ...row };
        
        columns.forEach(column => {
          if (column.format && formattedRow[column.id] !== undefined) {
            formattedRow[column.id] = column.format(formattedRow[column.id]);
          }
        });
        
        return formattedRow;
      });
      
      setGroupedData({ all: formattedRows });
    }
    
    // Reset pagination when data changes
    setPage(0);
  }, [rows, columns, groupByOperator, expandedOperators]);
  
  // Preserve expanded state when data changes
  useEffect(() => {
    if (groupByOperator && Object.keys(groupedData).length > 0) {
      const currentExpanded = { ...expandedOperators };
      const newOperators = Object.keys(groupedData);
      
      // Keep existing expanded states for operators that still exist
      const updatedExpanded = {};
      newOperators.forEach(op => {
        // Preserve the existing expanded state if it exists, otherwise use the default
        updatedExpanded[op] = currentExpanded[op] ?? false;
      });
      
      // Only update if there are actual changes to prevent unnecessary re-renders
      const hasChanges = Object.keys(updatedExpanded).some(op => 
        updatedExpanded[op] !== currentExpanded[op]
      );
      
      if (hasChanges) {
        setExpandedOperators(updatedExpanded);
      }
    }
  }, [groupedData, groupByOperator, expandedOperators]);

  // Handle operator filter change
  useEffect(() => {
    if (filterOperator !== 'all' && expandFilteredOperator) {
      setExpandedOperators(prev => ({
        ...prev,
        [filterOperator]: true
      }));
    }
  }, [filterOperator, expandFilteredOperator]);
  
  // Event handlers
  const handleOperatorChange = useCallback((event) => {
    setSelectedOperator(event.target.value);
    setPage(0); // Reset pagination when filter changes
  }, []);
  
  const handleAccordionToggle = useCallback((operator) => (event, isExpanded) => {
    setExpandedOperators(prev => ({
      ...prev,
      [operator]: isExpanded
    }));
    if (isExpanded) {
      setHasBeenExpanded(prev => ({ ...prev, [operator]: true }));
    }
  }, []);
  
  const toggleAllAccordions = useCallback((expanded) => {
    const newState = {};
    const newHasBeenExpanded = { ...hasBeenExpanded };
    Object.keys(groupedData).forEach(op => {
      newState[op] = expanded;
      if (expanded) {
        newHasBeenExpanded[op] = true;
      }
    });
    setExpandedOperators(newState);
    setHasBeenExpanded(newHasBeenExpanded);
  }, [groupedData, hasBeenExpanded]);
  
  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);
  
  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);
  
  // Memoized calculations
  const displayedRows = useMemo(() => {
    let filteredRows = [];
    
    if (!groupByOperator || selectedOperator === 'all') {
      // When not grouping or showing all, return all rows flattened
      filteredRows = Object.values(groupedData).flat();
    } else {
      // Return just the rows for the selected operator
      filteredRows = groupedData[selectedOperator] || [];
    }
    
    // Apply pagination
    return filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [groupedData, groupByOperator, selectedOperator, page, rowsPerPage]);
  
  const totalRowCount = useMemo(() => {
    if (!groupByOperator || selectedOperator === 'all') {
      return Object.values(groupedData).flat().length;
    } else {
      return (groupedData[selectedOperator] || []).length;
    }
  }, [groupedData, groupByOperator, selectedOperator]);
  
  // Render functions
  const renderPagination = useCallback(() => {
    return (
      <TablePagination
        component="div"
        count={totalRowCount}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    );
  }, [totalRowCount, page, rowsPerPage, handleChangePage, handleChangeRowsPerPage]);
  
  const renderTableView = useCallback(() => {
    return (
      <Box sx={{ mt: 2 }}>
        <Table 
          columns={columns} 
          data={displayedRows}
          onSelectAll={onSelectAll}
          selectedItems={selectedItems}
          defaultSortColumn={defaultSortColumn}
          defaultSortDirection={defaultSortDirection}
        />
        {renderPagination()}
      </Box>
    );
  }, [columns, displayedRows, renderPagination, onSelectAll, selectedItems, defaultSortColumn, defaultSortDirection]);
  
  const renderGroupedView = useCallback(() => {
    return (
      <Box>
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <Button 
            size="small" 
            variant="outlined" 
            onClick={() => toggleAllAccordions(true)}
          >
            Expand All
          </Button>
          <Button 
            size="small" 
            variant="outlined" 
            onClick={() => toggleAllAccordions(false)}
          >
            Collapse All
          </Button>
        </Box>
        {Object.keys(groupedData)
          .sort((a, b) => a.localeCompare(b))
          .map(operator => {
            if (selectedOperator !== 'all' && operator !== selectedOperator) {
              return null;
            }
            return (
              <Accordion 
                key={operator} 
                expanded={expandedOperators[operator] || false}
                onChange={handleAccordionToggle(operator)}
                sx={{ 
                  mb: 2,
                  backgroundColor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff',
                  '& .MuiAccordionSummary-root': {
                    backgroundColor: theme => theme.palette.mode === 'dark' ? '#262626' : '#e3f2fd',
                    '&:hover': {
                      backgroundColor: theme => theme.palette.mode === 'dark' ? '#333333' : '#bbdefb'
                    }
                  }
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" color="text.primary">
                    {operator} ({groupedData[operator].length} items)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {hasBeenExpanded[operator] ? (
                    <Table 
                      columns={columns} 
                      data={groupedData[operator]}
                      onSelectAll={onSelectAll}
                      selectedItems={selectedItems}
                      defaultSortColumn={defaultSortColumn}
                      defaultSortDirection={defaultSortDirection}
                    />
                  ) : null}
                </AccordionDetails>
              </Accordion>
            );
          })}
      </Box>
    );
  }, [groupedData, expandedOperators, selectedOperator, handleAccordionToggle, toggleAllAccordions, columns, onSelectAll, selectedItems, defaultSortColumn, defaultSortDirection, hasBeenExpanded]);
  
  return (
    <Paper sx={{ p: 2, mb: 3, backgroundColor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#ffffff' }} elevation={2}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 2
        }}
      >
        <Typography variant="h6" color="text.primary">{title}</Typography>
        
        {groupByOperator && operators.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="operator-select-label">Filter by Operator</InputLabel>
            <Select
              labelId="operator-select-label"
              id="operator-select"
              value={selectedOperator}
              label="Filter by Operator"
              onChange={handleOperatorChange}
            >
              <MenuItem value="all">All Operators</MenuItem>
              {operators.map(op => (
                <MenuItem key={op} value={op}>{op}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>
      
      {groupByOperator ? renderGroupedView() : renderTableView()}
    </Paper>
  );
};

export default NewTable; 