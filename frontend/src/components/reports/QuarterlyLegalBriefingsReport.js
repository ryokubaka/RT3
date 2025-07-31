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
  Grid,
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

const QuarterlyLegalBriefingsReport = () => {
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
      const response = await fetch(getApiUrl('/reports/quarterly-legal-briefings'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch quarterly report');
      }
      
      const data = await response.json();
      setReport(data);
      
      // Auto-expand current year
      const currentYear = new Date().getFullYear();
      setExpandedYears(new Set([currentYear]));
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
    let content = `QUARTERLY LEGAL BRIEFINGS REPORT\n`;
    content += `Generated: ${new Date(report.generated_at).toLocaleString()}\n\n`;
    content += `SUMMARY:\n`;
    content += `Total Operators: ${report.summary?.total_operators || 0}\n`;
    content += `Completed Records: ${report.summary?.total_completed_records || 0} / ${report.summary?.total_required_records || 0}\n`;
    content += `Not Applicable: ${report.summary?.total_not_applicable || 0}\n`;
    content += `Compliance Rate: ${report.summary?.compliance_rate || 0}%\n\n`;

    // Organize by year, include per-year summary
    (report.years || []).forEach((year, yearIndex) => {
      const yearSummary = getYearSummary(yearIndex);
      const yearData = report.data[yearIndex];
      content += `YEAR: ${year}\n`;
      content += `-----------------------------\n`;
      content += `Report Summary:\n`;
      content += `  Total Operators: ${yearSummary.total_operators}\n`;
      content += `  Required Records: ${yearSummary.required}\n`;
      content += `  Completed Records: ${yearSummary.completed}\n`;
      content += `  Not Applicable: ${yearSummary.notApplicable}\n`;
      content += `  Compliance Rate: ${yearSummary.compliance}%\n\n`;
      Object.entries(yearData.quarters).forEach(([quarter, quarterData]) => {
        content += `  ${quarterData.name}:\n`;
        Object.entries(quarterData.operators).forEach(([operatorName, operatorData]) => {
          content += `    ${operatorName} (${operatorData.operator_handle}): ${operatorData.status}`;
          if (operatorData.reason) {
            content += ` - ${operatorData.reason}`;
          }
          if (operatorData.date_submitted) {
            content += ` (${new Date(operatorData.date_submitted).toLocaleDateString()})`;
          }
          content += `\n`;
        });
        content += `\n`;
      });
      content += `\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quarterly-legal-briefings-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper to compute per-year summary
  const getYearSummary = (yearIndex) => {
    if (!report) return null;
    const yearData = report.data[yearIndex];
    let required = 0, completed = 0, notApplicable = 0;
    Object.values(yearData.quarters).forEach(quarterData => {
      Object.values(quarterData.operators).forEach(status => {
        if (status.status === 'Not Applicable') notApplicable++;
        else {
          required++;
          if (status.status === 'Completed') completed++;
        }
      });
    });
    const compliance = required > 0 ? (completed / required) * 100 : 0;
    return {
      total_operators: report.summary?.total_operators || 0,
      required,
      completed,
      notApplicable,
      compliance: Math.round(compliance * 10) / 10
    };
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

  // Get years from the API response
  const years = report.years || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Quarterly Legal Briefings Report</Typography>
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
      
      {years.map((year, yearIndex) => {
        const yearSummary = getYearSummary(yearIndex);
        const yearData = report.data[yearIndex];
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
                  {yearData.year}
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
                  <Grid container spacing={2} wrap="nowrap" sx={{ width: '100%', overflowX: 'auto' }}>
                    {(() => {
                      const quarters = Object.entries(yearData.quarters);
                      return quarters.map(([quarter, quarterData]) => (
                        <Grid item xs={12} sm={6} md={3} key={quarter} sx={{ minWidth: 300 }}>
                          <Card variant="outlined">
                            <Box
                              sx={{
                                borderTopLeftRadius: 8,
                                borderTopRightRadius: 8,
                                borderBottomLeftRadius: 0,
                                borderBottomRightRadius: 0,
                                px: 3,
                                py: 1.5,
                                background: `${theme.palette.primary.main} !important`,
                                color: `${theme.palette.primary.contrastText} !important`,
                              }}
                            >
                              <Typography variant="h6" gutterBottom sx={{ m: 0 }}>
                                {quarterData.name}
                              </Typography>
                            </Box>
                            <CardContent sx={{ pt: 0 }}>
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell
                                        sx={{
                                          backgroundColor: (theme) =>
                                            theme.palette.mode === 'dark'
                                              ? `${theme.palette.background.paper} !important`
                                              : `${theme.palette.grey[200]} !important`,
                                          color: (theme) =>
                                            theme.palette.mode === 'dark'
                                              ? `${theme.palette.text.primary} !important`
                                              : `${theme.palette.text.primary} !important`,
                                          fontWeight: 'bold',
                                        }}
                                      >
                                        Operator
                                      </TableCell>
                                      <TableCell
                                        sx={{
                                          backgroundColor: (theme) =>
                                            theme.palette.mode === 'dark'
                                              ? `${theme.palette.background.paper} !important`
                                              : `${theme.palette.grey[200]} !important`,
                                          color: (theme) =>
                                            theme.palette.mode === 'dark'
                                              ? `${theme.palette.text.primary} !important`
                                              : `${theme.palette.text.primary} !important`,
                                          fontWeight: 'bold',
                                        }}
                                      >
                                        Status
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {Object.entries(quarterData.operators).map(([operatorName, operatorData]) => (
                                      <TableRow key={operatorName}>
                                        <TableCell>
                                          <Typography variant="body2">
                                            {operatorName}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {operatorData.operator_handle}
                                          </Typography>
                                        </TableCell>
                                        <TableCell>
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
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </CardContent>
                          </Card>
                        </Grid>
                      ));
                    })()}
                  </Grid>
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default QuarterlyLegalBriefingsReport; 