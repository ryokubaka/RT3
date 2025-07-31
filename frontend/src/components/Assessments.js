import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Container,
  Chip,
  CircularProgress,
  DialogContentText,
  FormControl,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import NewTable from './Table';

const Assessments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [myResponses, setMyResponses] = useState([]);
  const [assessmentResponses, setAssessmentResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [createDialog, setCreateDialog] = useState({ open: false, title: '', description: '' });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, assessmentId: null });
  const [deleteResponseDialog, setDeleteResponseDialog] = useState({ open: false, assessmentId: null, responseId: null });
  const [expandedAssessments, setExpandedAssessments] = useState(new Set());
  const [importDialog, setImportDialog] = useState({ 
    open: false, 
    selectedFile: null,
    selectedAssessment: '',
    fileName: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [assessmentsData, myResponsesData] = await Promise.all([
        apiRequest('/assessments'),
        user ? apiRequest('/assessments/my-responses') : Promise.resolve([])
      ]);
      
      setAssessments(assessmentsData);
      setMyResponses(myResponsesData);
      
      if (user?.team_role?.includes('ADMIN')) {
        const responsesPromises = assessmentsData.map(assessment => 
          apiRequest(`/assessments/${assessment.id}/responses`)
        );
        const responsesData = await Promise.all(responsesPromises);
        
        const responsesMap = {};
        assessmentsData.forEach((assessment, index) => {
          responsesMap[assessment.id] = responsesData[index];
        });
        setAssessmentResponses(responsesMap);
        
        // Set all assessments to expanded by default
        setExpandedAssessments(new Set(assessmentsData.map(a => a.id)));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateAssessment = async () => {
    if (!createDialog.title.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a title',
        severity: 'error'
      });
      return;
    }

    try {
      const payload = {
        title: createDialog.title.trim(),
        description: createDialog.description.trim() || null,
        is_active: true,
        questions: []
      };

      await apiRequest('/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      setSnackbar({
        open: true,
        message: 'Assessment created successfully',
        severity: 'success'
      });
      fetchData();
      setCreateDialog({ open: false, title: '', description: '' });
    } catch (error) {
      console.error('Error creating assessment:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Error creating assessment',
        severity: 'error'
      });
    }
  };

  const handleDeleteAssessment = async () => {
    try {
      await apiRequest(`/assessments/${deleteConfirmDialog.assessmentId}`, {
        method: 'DELETE',
      });

      setSnackbar({
        open: true,
        message: 'Assessment deleted successfully',
        severity: 'success'
      });
      fetchData();
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error deleting assessment',
        severity: 'error'
      });
    } finally {
      setDeleteConfirmDialog({ open: false, assessmentId: null });
    }
  };

  const handleDeleteResponse = async () => {
    try {
      await apiRequest(`/assessments/${deleteResponseDialog.assessmentId}/responses/${deleteResponseDialog.responseId}`, {
        method: 'DELETE'
      });

      setSnackbar({
        open: true,
        message: 'Response deleted successfully',
        severity: 'success'
      });

      // Refresh the data
      fetchData();
    } catch (error) {
      console.error('Error deleting response:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Error deleting response',
        severity: 'error'
      });
    } finally {
      setDeleteResponseDialog({ open: false, assessmentId: null, responseId: null });
    }
  };

  const getAssessmentStatus = (assessmentId) => {
    // For admin, show total responses count
    if (user?.team_role?.includes('ADMIN')) {
      const responses = assessmentResponses[assessmentId] || [];
      if (responses.length > 0) {
        const pendingCount = responses.filter(r => r.status === 'pending_review').length;
        const gradedCount = responses.filter(r => r.status === 'graded').length;
        return (
          <Box>
            <Typography variant="body2" color="textSecondary">
              {responses.length} Response{responses.length !== 1 ? 's' : ''}
            </Typography>
            {pendingCount > 0 && (
              <Chip 
                label={`${pendingCount} Pending`} 
                color="warning" 
                size="small" 
                sx={{ mr: 1 }}
              />
            )}
            {gradedCount > 0 && (
              <Chip 
                label={`${gradedCount} Graded`} 
                color="success" 
                size="small"
              />
            )}
          </Box>
        );
      }
      return <Typography variant="body2" color="textSecondary">No responses</Typography>;
    }

    // For regular users, show their response status
    const response = myResponses.find(r => r.assessment_id === assessmentId);
    if (!response) {
      return <Typography variant="body2" color="textSecondary">Not taken</Typography>;
    }
    return getStatusChip(response.status, response.final_score);
  };

  const handleExpandAssessment = async (assessmentId) => {
    setExpandedAssessments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assessmentId)) {
        newSet.delete(assessmentId);
      } else {
        newSet.add(assessmentId);
      }
      return newSet;
    });
  };

  const getStatusChip = (status, score) => {
    switch (status) {
      case 'completed':
        return <Chip label="Completed" color="primary" size="small" />;
      case 'pending_review':
        return <Chip label="Pending Review" color="warning" size="small" />;
      case 'graded':
        return <Chip label={`Score: ${score}%`} color="success" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const renderResponseRow = (response, assessment) => ({
    id: `response-${response.id}`,
    title: (
      <Box sx={{ pl: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2">
          {response.operator?.name || 'Unknown User'}
        </Typography>
        {getStatusChip(response.status, response.final_score)}
      </Box>
    ),
    description: (
      <Box sx={{ pl: 4 }}>
        <Typography variant="body2" color="textSecondary">
          Submitted: {new Date(response.completed_at || response.started_at).toLocaleString()}
        </Typography>
      </Box>
    ),
    status: (
      <Box sx={{ pl: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
        {response.status === 'graded' && (
          <Typography variant="body2" color="textSecondary">
            Score: {response.final_score}%
          </Typography>
        )}
      </Box>
    ),
    actions: (
      <Box sx={{ pl: 4, display: 'flex', gap: 1, minWidth: '200px', justifyContent: 'flex-end' }}>
        {(user?.team_role?.includes('ADMIN') || response.operator_id === user?.id) && (
          <Button
            variant="outlined"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/assessments/${assessment.id}/responses/${response.id}`);
            }}
          >
            Review
          </Button>
        )}
        {user?.team_role?.includes('ADMIN') && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteResponseDialog({ 
                open: true, 
                assessmentId: assessment.id, 
                responseId: response.id 
              });
            }}
          >
            Delete
          </Button>
        )}
      </Box>
    ),
    parentId: `assessment-${assessment.id}`
  });

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImportDialog({
        ...importDialog,
        selectedFile: file,
        fileName: file.name
      });
    }
  };

  const handleImportQuestions = async () => {
    if (!importDialog.selectedFile || !importDialog.selectedAssessment) {
      setSnackbar({
        open: true,
        message: 'Please select both a file and an assessment',
        severity: 'error'
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', importDialog.selectedFile);

    // Validate assessment ID
    if (!importDialog.selectedAssessment) {
      setSnackbar({
        open: true,
        message: 'Please select an assessment',
        severity: 'error'
      });
      return;
    }

    try {
      const endpoint = `/assessments/${importDialog.selectedAssessment}/import-questions`;
            
      await apiRequest(endpoint, {
        method: 'POST',
        body: formData
      });

      setSnackbar({
        open: true,
        message: 'Questions imported successfully',
        severity: 'success'
      });
      setImportDialog({ open: false, selectedFile: null, selectedAssessment: '', fileName: '' });
      fetchData();
    } catch (error) {
      console.error('Error importing questions:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Error importing questions',
        severity: 'error'
      });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Operator Assessments</Typography>
          {user?.team_role?.includes('ADMIN') && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadIcon />}
                onClick={() => setImportDialog({ ...importDialog, open: true })}
              >
                Import Questions
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialog({ open: true, title: '', description: '' })}
              >
                Create Assessment
              </Button>
            </Box>
          )}
        </Box>

        <NewTable
          data={assessments.flatMap(assessment => {
            const responses = assessmentResponses[assessment.id] || [];
            const userResponse = myResponses.find(r => r.assessment_id === assessment.id);
            return [
              {
                id: `assessment-${assessment.id}`,
                title: (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {user?.team_role?.includes('ADMIN') && responses.length > 0 && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpandAssessment(assessment.id);
                        }}
                      >
                        {expandedAssessments.has(assessment.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    )}
                    <Typography>{assessment.title}</Typography>
                  </Box>
                ),
                description: assessment.description,
                status: getAssessmentStatus(assessment.id),
                actions: (
                  <Box sx={{ display: 'flex', gap: 1, minWidth: '150px', justifyContent: 'flex-end' }}>
                    {!userResponse && (
                      <Tooltip title="Take Assessment">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/assessments/${assessment.id}/take`)}
                        >
                          <StartIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {userResponse && !user?.team_role?.includes('ADMIN') && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate(`/assessments/${assessment.id}/responses/${userResponse.id}`)}
                      >
                        REVIEW
                      </Button>
                    )}
                    {user?.team_role?.includes('ADMIN') && (
                      <>
                        <Tooltip title="Edit Assessment">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/assessments/${assessment.id}/edit`)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Assessment">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteConfirmDialog({ open: true, assessmentId: assessment.id })}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                ),
                isParent: true
              },
              ...(user?.team_role?.includes('ADMIN') && expandedAssessments.has(assessment.id)
                ? responses.map(response => renderResponseRow(response, assessment))
                : [])
            ];
          })}
          columns={[
            { id: 'title', label: 'Title', sortable: true, filterable: true, width: '30%' },
            { id: 'description', label: 'Description', sortable: true, filterable: true, width: '30%' },
            { id: 'status', label: 'Status', sortable: true, filterable: true, width: '20%' },
            { id: 'actions', label: 'Actions', sortable: false, filterable: false, width: '20%' }
          ]}
        />

        {/* Create Assessment Dialog */}
        <Dialog
          open={createDialog.open}
          onClose={() => setCreateDialog({ open: false, title: '', description: '' })}
        >
          <DialogTitle>Create New Assessment</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Title"
              fullWidth
              value={createDialog.title}
              onChange={(e) => setCreateDialog({ ...createDialog, title: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={createDialog.description}
              onChange={(e) => setCreateDialog({ ...createDialog, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialog({ open: false, title: '', description: '' })}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAssessment} 
              variant="contained"
              disabled={!createDialog.title.trim()}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmDialog.open}
          onClose={() => setDeleteConfirmDialog({ open: false, assessmentId: null })}
        >
          <DialogTitle>Delete Assessment</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this assessment?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmDialog({ open: false, assessmentId: null })}>
              Cancel
            </Button>
            <Button onClick={handleDeleteAssessment} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={deleteResponseDialog.open}
          onClose={() => setDeleteResponseDialog({ open: false, assessmentId: null, responseId: null })}
        >
          <DialogTitle>Delete Response</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this response? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteResponseDialog({ open: false, assessmentId: null, responseId: null })}>
              Cancel
            </Button>
            <Button onClick={handleDeleteResponse} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Import Questions Dialog */}
        <Dialog
          open={importDialog.open}
          onClose={() => setImportDialog({ open: false, selectedFile: null, selectedAssessment: '', fileName: '' })}
        >
          <DialogTitle>Import Questions</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Select a CSV file containing questions and choose the assessment to import them into.
              The CSV should have columns: question_text, question_type, options, correct_answer, points
            </DialogContentText>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="assessment-select-label">Assessment</InputLabel>
              <Select
                labelId="assessment-select-label"
                value={importDialog.selectedAssessment}
                label="Assessment"
                onChange={(e) => setImportDialog({ ...importDialog, selectedAssessment: e.target.value })}
              >
                {assessments.map((assessment) => (
                  <MenuItem key={assessment.id} value={assessment.id}>
                    {assessment.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ mb: 2 }}>
              <input
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                id="csv-file-input"
                onChange={handleFileSelect}
              />
              <label htmlFor="csv-file-input">
                <Button variant="outlined" component="span">
                  Choose File
                </Button>
              </label>
              {importDialog.fileName && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected file: {importDialog.fileName}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImportDialog({ open: false, selectedFile: null, selectedAssessment: '', fileName: '' })}>
              Cancel
            </Button>
            <Button 
              onClick={handleImportQuestions}
              variant="contained"
              disabled={!importDialog.selectedFile || !importDialog.selectedAssessment}
            >
              Import
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default Assessments; 