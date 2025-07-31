# Reports Module

This directory contains individual report components for the RT3 application. Each report is a self-contained React component that handles its own data fetching, state management, and UI rendering.

## Structure

```
reports/
├── index.js                           # Export file for all report components
├── AnnualRedTeamTrainingReport.js     # Annual Red Team Training report
├── QuarterlyLegalBriefingsReport.js   # Quarterly Legal Briefings report
└── README.md                          # This file
```

## Adding a New Report

To add a new report component:

1. **Create the report component file** (e.g., `NewReportType.js`):
   ```javascript
   import React, { useState, useEffect } from 'react';
   import { /* Material-UI components */ } from '@mui/material';
   import { getApiUrl } from '../../utils/apiConfig';

   const NewReportType = () => {
     const [report, setReport] = useState(null);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState(null);

     const fetchReport = async () => {
       setLoading(true);
       setError(null);
       try {
         const token = localStorage.getItem('token');
         const response = await fetch(getApiUrl('/reports/new-report-endpoint'), {
           headers: {
             'Authorization': `Bearer ${token}`,
             'Content-Type': 'application/json'
           }
         });
         
         if (!response.ok) {
           throw new Error('Failed to fetch report');
         }
         
         const data = await response.json();
         setReport(data);
       } catch (err) {
         setError(err.message);
       } finally {
         setLoading(false);
       }
     };

     useEffect(() => {
       fetchReport();
     }, []);

     // Add your report-specific logic here
     
     return (
       <Box>
         {/* Your report UI */}
       </Box>
     );
   };

   export default NewReportType;
   ```

2. **Add the export to `index.js`**:
   ```javascript
   export { default as NewReportType } from './NewReportType';
   ```

3. **Update the main Reports component** (`../Reports.js`) to include the new report:
   ```javascript
   import { AnnualRedTeamTrainingReport, QuarterlyLegalBriefingsReport, NewReportType } from './reports/index';
   
   // Add a new tab for your report
   <Tabs value={activeTab} onChange={handleTabChange}>
     <Tab label="Annual Red Team Training" />
     <Tab label="Quarterly Legal Briefings" />
     <Tab label="New Report Type" />
   </Tabs>
   
   // Add the conditional rendering
   {activeTab === 2 && <NewReportType />}
   ```

## Report Component Guidelines

Each report component should follow these conventions:

### Required Features
- **Data Fetching**: Use the `fetchReport` pattern with loading/error states
- **Authentication**: Include Bearer token in API requests
- **Error Handling**: Display user-friendly error messages
- **Loading States**: Show loading indicators during data fetch
- **Export Functionality**: Provide text export capability (optional)

### UI Patterns
- **Summary Card**: Display key metrics at the top
- **Data Tables**: Use Material-UI Table components for data display
- **Status Chips**: Use color-coded chips for status indicators
- **Action Buttons**: Include refresh and export buttons in the header

### API Integration
- Use the `getApiUrl` utility for API endpoints
- Include proper error handling for network requests
- Handle authentication tokens from localStorage

### Styling
- Use Material-UI components for consistency
- Follow the existing design patterns
- Use responsive design principles

## Example Report Structure

```javascript
const ExampleReport = () => {
  // State management
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data fetching
  const fetchReport = async () => { /* ... */ };

  // Helper functions
  const getStatusColor = (status) => { /* ... */ };
  const exportToText = () => { /* ... */ };

  // Loading and error states
  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!report) return null;

  // Main render
  return (
    <Box>
      {/* Header with actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Report Title</Typography>
        <Box>
          <IconButton onClick={fetchReport}><RefreshIcon /></IconButton>
          <IconButton onClick={exportToText}><TextIcon /></IconButton>
        </Box>
      </Box>
      
      {/* Summary card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* Summary metrics */}
        </CardContent>
      </Card>
      
      {/* Data display */}
      {/* Tables, charts, etc. */}
    </Box>
  );
};
```

## Backend Integration

Each report component should have a corresponding backend endpoint:

1. **Create the endpoint** in `backend/app/routes/reports.py`
2. **Add the route** to the main router
3. **Implement the logic** to query the database and return structured data
4. **Test the endpoint** to ensure it returns the expected format

## Testing

When adding a new report:

1. Test the backend endpoint independently
2. Test the frontend component with mock data
3. Test the full integration
4. Verify export functionality works correctly
5. Test error handling scenarios 