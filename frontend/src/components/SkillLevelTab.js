import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import NewTable from './NewTable';
import DocumentCell from './DocumentCell';

const SkillLevelTab = ({
  data,
  columns,
  loading,
  onAdd,
  onEdit,
  onDelete,
  isAdmin,
  currentUser,
  operators,
  dialogOpen,
  formData,
  setFormData,
  handleInputChange,
  handleDialogClose,
  handleSave,
  defaultSortColumn = '',
  defaultSortDirection = 'asc'
}) => {
  // Add custom sortComparator to columns
  const columnsWithSort = useMemo(() => columns.map(col => {
    if (col.id === 'skill_level') {
      return {
        ...col,
        sortComparator: (a, b) => a.skill_level.localeCompare(b.skill_level)
      };
    }
    return col;
  }), [columns]);

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2',
            fontWeight: 'bold',
            backgroundColor: theme => theme.palette.mode === 'dark' ? '#262626' : '#e3f2fd',
            p: 2,
            borderRadius: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            '&:hover': {
              backgroundColor: theme => theme.palette.mode === 'dark' ? '#333333' : '#bbdefb'
            }
          }}
        >
          Skill Level History
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAdd}
            sx={{ 
              bgcolor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : 'white',
              color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2',
              '&:hover': {
                bgcolor: theme => theme.palette.mode === 'dark' ? '#262626' : '#e3f2fd'
              }
            }}
          >
            Add Entry
          </Button>
        </Typography>
      </Box>
      <NewTable 
        columns={columnsWithSort} 
        rows={data} 
        title="Skill Level History" 
        groupByOperator={true}
        defaultSortColumn={defaultSortColumn}
        defaultSortDirection={defaultSortDirection}
      />
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>{formData.id ? 'Edit' : 'Add'} Skill Level History</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel id="operator-select-label">Operator</InputLabel>
            <Select
              labelId="operator-select-label"
              name="operator_name"
              value={formData.operator_name || ''}
              onChange={handleInputChange}
              label="Operator"
            >
              {isAdmin ? (
                operators.map(op => (
                  <MenuItem key={op.id} value={op.name}>{op.name}</MenuItem>
                ))
              ) : (
                <MenuItem value={currentUser?.name}>{currentUser?.name}</MenuItem>
              )}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" required error={!formData.skill_level}>
            <InputLabel id="skill-level-select-label">Skill Level</InputLabel>
            <Select
              labelId="skill-level-select-label"
              name="skill_level"
              value={formData.skill_level || ''}
              onChange={handleInputChange}
              label="Skill Level"
              required
            >
              <MenuItem value="team_member">Team Member</MenuItem>
              <MenuItem value="apprentice">Apprentice</MenuItem>
              <MenuItem value="journeyman">Journeyman</MenuItem>
              <MenuItem value="master">Master</MenuItem>
            </Select>
            {!formData.skill_level && (
              <Typography variant="caption" color="error">
                Skill Level is required
              </Typography>
            )}
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            name="date_assigned"
            label="Date Assigned"
            type="date"
            value={formData.date_assigned || ''}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Signed Memo
            </Typography>
            {formData.operator_name ? (
              <DocumentCell
                row={formData}
                isAdmin={isAdmin}
                onUpload={(data) => {
                  setFormData(prev => ({
                    ...prev,
                    tempFile: data.tempFile
                  }));
                }}
                onDelete={() => {
                  setFormData(prev => ({
                    ...prev,
                    tempFile: null,
                    signed_memo_url: ""
                  }));
                }}
                documentType="skill_level"
                currentUser={currentUser}
              />
            ) : (
              <Alert severity="info">
                Please select an operator before uploading a document
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SkillLevelTab; 