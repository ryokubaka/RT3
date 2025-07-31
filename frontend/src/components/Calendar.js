import React from 'react';
import { Container, Paper, Typography } from '@mui/material';

const Calendar = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Calendar
        </Typography>
        <Typography variant="body1">
          Calendar content will be implemented here.
        </Typography>
      </Paper>
    </Container>
  );
};

export default Calendar; 