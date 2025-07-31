import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  Description as TextIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { getApiUrl } from '../../utils/apiConfig';
import { useTheme } from '@mui/material/styles';

const AnnualRedTeamTrainingReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedYears, setExpandedYears] = useState(new Set());
  const theme = useTheme();

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getApiUrl('/reports/annual-red-team-training'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch annual report');
      }
      
      const data = await response.json();
      setReport(data);
      
      // Auto-expand current year
      setExpandedYears(new Set([data.current_year]));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Missing':
        return 'error';
      case 'Not Applicable':
        return 'default';
      default:
        return 'default';
    }
  };

  const toggleYearExpansion = (year) => {
    const newExpandedYears = new Set(expandedYears);
    if (newExpandedYears.has(year)) {
      newExpandedYears.delete(year);
    } else {
      newExpandedYears.add(year);
    }
    setExpandedYears(newExpandedYears);
  };

  const exportToText = () => {
    if (!report) return;
    let content = `ANNUAL RED TEAM TRAINING REPORT\n`;
    content += `Generated: ${new Date(report.generated_at).toLocaleString()}\n`;
    content += `Current Year: ${report.current_year}\n\n`;
    content += `Required Training Types (current):\n`;
    report.required_training_types.forEach(type => {
      content += `- ${type}\n`;
    });
    content += `\n`;
    
    report.data.forEach((yearData) => {
      const year = yearData.year;
      const yearSummary = getYearSummary(yearData);
      const yearRequiredTypes = yearData.required_training_types;
      
      content += `${year} Required Training\n`;
      content += `-----------------------------\n`;
      content += `Report Summary:\n`;
      content += `  Total Operators: ${yearSummary.total_operators}\n`;
      content += `  Required Records: ${yearSummary.required}\n`;
      content += `  Completed Records: ${yearSummary.completed}\n`;
      content += `  Not Applicable: ${yearSummary.notApplicable}\n`;
      content += `  Compliance Rate: ${yearSummary.compliance}%\n`;
      content += `  Required Training Types:\n`;
      yearRequiredTypes.forEach(type => {
        content += `    - ${type}\n`;
      });
      content += `\n`;
      
      yearRequiredTypes.forEach(trainingType => {
        content += `  ${trainingType}:\n`;
        const trainingTypeData = yearData.training_types[trainingType];
        if (trainingTypeData && trainingTypeData.operators) {
          Object.entries(trainingTypeData.operators).forEach(([operatorName, operatorData]) => {
            content += `    ${operatorName} (${operatorData.operator_handle}): ${operatorData.status}`;
            if (operatorData.reason) {
              content += ` - ${operatorData.reason}`;
            }
            if (operatorData.date_submitted) {
              content += ` (${new Date(operatorData.date_submitted).toLocaleDateString()})`;
            }
            content += `\n`;
          });
        }
        content += `\n`;
      });
      content += `\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annual-red-team-training-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper to compute per-year summary
  const getYearSummary = (yearData) => {
    if (!yearData) return null;
    let required = 0, completed = 0, notApplicable = 0;
    
    Object.values(yearData.training_types).forEach(trainingTypeData => {
      Object.values(trainingTypeData.operators).forEach(operatorData => {
        if (operatorData.status === 'Not Applicable') {
          notApplicable++;
        } else {
          required++;
          if (operatorData.status === 'Completed') {
            completed++;
          }
        }
      });
    });
    
    const compliance = required > 0 ? (completed / required) * 100 : 0;
    return {
      total_operators: Object.keys(yearData.training_types[Object.keys(yearData.training_types)[0]]?.operators || {}).length,
      required,
      completed,
      notApplicable,
      compliance: Math.round(compliance * 10) / 10
    };
  };

  // Helper to get all unique operators across all years
  const getAllOperators = () => {
    if (!report) return [];
    const operatorSet = new Set();
    report.data.forEach(yearData => {
      Object.values(yearData.training_types).forEach(trainingTypeData => {
        Object.keys(trainingTypeData.operators).forEach(operatorName => {
          operatorSet.add(operatorName);
        });
      });
    });
    return Array.from(operatorSet).sort();
  };

  // Helper to get operator data for a specific year and training type
  const getOperatorData = (yearData, trainingType, operatorName) => {
    const trainingTypeData = yearData.training_types[trainingType];
    if (!trainingTypeData || !trainingTypeData.operators) return null;
    return trainingTypeData.operators[operatorName] || null;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!report) {
    return null;
  }

  const allOperators = getAllOperators();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Annual Red Team Training Report</Typography>
        <Box>
          <Tooltip title="Refresh Report">
            <IconButton onClick={fetchReport} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export as Text">
            <IconButton onClick={exportToText}>
              <TextIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {report.data.map((yearData) => {
        const year = yearData.year;
        const yearSummary = getYearSummary(yearData);
        const yearRequiredTypes = yearData.required_training_types;
        
        return (
          <Card key={year} sx={{ mb: 2 }}>
            <CardContent sx={{ p: 0 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  px: 3,
                  py: 1.5,
                  background: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  cursor: 'pointer',
                }}
                onClick={() => toggleYearExpansion(year)}
              >
                <Typography variant="h5" sx={{ m: 0 }}>
                  {year}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2">
                    Compliance: {yearSummary.compliance}%
                  </Typography>
                  {expandedYears.has(year) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>
              </Box>
              <Collapse in={expandedYears.has(year)}>
                <Box sx={{ p: 3 }}>
                  {/* Per-year summary */}
                  <Box
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      p: 2,
                      background: theme.palette.mode === 'dark'
                        ? theme.palette.info.dark
                        : theme.palette.info.light,
                      color: theme.palette.mode === 'dark'
                        ? theme.palette.info.contrastText
                        : theme.palette.info.contrastText,
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom>Report Summary</Typography>
                    <Typography variant="body2">Total Operators: {yearSummary.total_operators}</Typography>
                    <Typography variant="body2">Required Records: {yearSummary.required}</Typography>
                    <Typography variant="body2">Completed Records: {yearSummary.completed}</Typography>
                    <Typography variant="body2">Not Applicable: {yearSummary.notApplicable}</Typography>
                    <Typography variant="body2">Compliance Rate: {yearSummary.compliance}%</Typography>
                  </Box>
                  
                  {/* Main table with operators as rows and training types as columns */}
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell
                            sx={{
                              fontWeight: 'bold',
                              backgroundColor: `${theme.palette.primary.main} !important`,
                              color: `${theme.palette.primary.contrastText} !important`,
                            }}
                          >
                            Operator
                          </TableCell>
                          {yearRequiredTypes.map((trainingType, typeIndex) => (
                            <TableCell
                              key={typeIndex}
                              sx={{
                                fontWeight: 'bold',
                                backgroundColor: `${theme.palette.primary.main} !important`,
                                color: `${theme.palette.primary.contrastText} !important`,
                                maxWidth: 200,
                                wordWrap: 'break-word',
                              }}
                            >
                              {trainingType}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allOperators.map((operatorName, operatorIndex) => {
                          // Check if this operator has any data for this year
                          const hasDataForYear = yearRequiredTypes.some(trainingType => {
                            const operatorData = getOperatorData(yearData, trainingType, operatorName);
                            return operatorData !== null;
                          });
                          
                          if (!hasDataForYear) return null;
                          
                          return (
                            <TableRow key={operatorIndex}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {operatorName}
                                </Typography>
                                {(() => {
                                  // Find the operator handle from any training type
                                  for (const trainingType of yearRequiredTypes) {
                                    const operatorData = getOperatorData(yearData, trainingType, operatorName);
                                    if (operatorData) {
                                      return (
                                        <Typography variant="caption" color="text.secondary">
                                          {operatorData.operator_handle}
                                        </Typography>
                                      );
                                    }
                                  }
                                  return null;
                                })()}
                              </TableCell>
                              {yearRequiredTypes.map((trainingType, typeIndex) => {
                                const operatorData = getOperatorData(yearData, trainingType, operatorName);
                                
                                if (!operatorData) {
                                  return (
                                    <TableCell key={typeIndex}>
                                      <Typography variant="body2" color="text.secondary">
                                        -
                                      </Typography>
                                    </TableCell>
                                  );
                                }
                                
                                return (
                                  <TableCell key={typeIndex}>
                                    <Chip
                                      label={operatorData.status}
                                      color={getStatusColor(operatorData.status)}
                                      size="small"
                                      variant="outlined"
                                    />
                                    {operatorData.reason && (
                                      <Typography variant="caption" display="block">
                                        {operatorData.reason}
                                      </Typography>
                                    )}
                                    {operatorData.date_submitted && (
                                      <Typography variant="caption" display="block">
                                        {new Date(operatorData.date_submitted).toLocaleDateString()}
                                      </Typography>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default AnnualRedTeamTrainingReport; 