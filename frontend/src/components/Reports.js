import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Box,
  Divider
} from '@mui/material';
import { AnnualRedTeamTrainingReport, QuarterlyLegalBriefingsReport } from './reports/index';

const Reports = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Reports
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Generate and view compliance reports for team training and legal briefings.
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Annual Red Team Training" />
            <Tab label="Quarterly Legal Briefings" />
          </Tabs>
        </Box>
        
        {activeTab === 0 && <AnnualRedTeamTrainingReport />}
        {activeTab === 1 && <QuarterlyLegalBriefingsReport />}
      </Paper>
    </Container>
  );
};

export default Reports; 