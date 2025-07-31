import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Button,
  Alert,
  Snackbar,
  Chip,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import { ArrowBack, Delete } from '@mui/icons-material';

const ViewAssessmentResponse = () => {
  const { assessmentId, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [response, setResponse] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [grades, setGrades] = useState({});
  const [feedback, setFeedback] = useState({});
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isAdmin = user?.team_role?.toUpperCase().includes('ADMIN');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [responseData, assessmentData] = await Promise.all([
        apiRequest(`/assessments/${assessmentId}/responses/${id}`),
        apiRequest(`/assessments/${assessmentId}`)
      ]);

      if (!responseData || !assessmentData) {
        setSnackbar({
          open: true,
          message: 'Invalid response or assessment data',
          severity: 'error'
        });
        return;
      }

      setResponse(responseData);
      setAssessment(assessmentData);
      
      // Create a map of question responses by question ID
      const questionResponseMap = {};
      responseData.question_responses.forEach(qr => {
        if (qr && qr.question && qr.question.id) {
          questionResponseMap[qr.question.id] = qr;
        }
      });

      // Initialize grades and feedback for all questions, including newly added ones
      const initialGrades = {};
      const initialFeedback = {};
      assessmentData.questions.forEach(question => {
        if (!question || !question.id) {
          return;
        }

        const questionResponse = questionResponseMap[question.id];
        if (questionResponse) {
          // Question was answered
          if (questionResponse.points_awarded !== null) {
            initialGrades[questionResponse.id] = questionResponse.points_awarded;
          } else if (questionResponse.question.question_type === 'multiple_choice' && questionResponse.is_correct !== null) {
            initialGrades[questionResponse.id] = questionResponse.is_correct ? question.points : 0;
          } else {
            initialGrades[questionResponse.id] = 0;
          }
          initialFeedback[questionResponse.id] = questionResponse.feedback || '';
        } else {
          // Question was added after submission
          initialGrades[`new_${question.id}`] = 0;
          initialFeedback[`new_${question.id}`] = '';
        }
      });
      setGrades(initialGrades);
      setFeedback(initialFeedback);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error loading assessment response',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [assessmentId, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGradeChange = (questionId, value) => {
    const numValue = parseInt(value) || 0;
    const maxPoints = response.question_responses.find(qr => qr.id === questionId)?.question.points || 0;
    setGrades(prev => ({
      ...prev,
      [questionId]: Math.min(Math.max(0, numValue), maxPoints)
    }));
  };

  const handleFeedbackChange = (questionId, value) => {
    setFeedback(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleApprove = async () => {
    try {
      const gradeData = response.question_responses.map(qr => ({
        question_id: qr.question.id,
        points_awarded: grades[qr.id] || 0,
        feedback: feedback[qr.id] || ''
      }));

      await apiRequest(`/assessments/${assessmentId}/responses/${id}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gradeData)
      });

      setSnackbar({
        open: true,
        message: 'Assessment graded successfully',
        severity: 'success'
      });

      // Refresh the data to show updated grades
      fetchData();
      setConfirmDialog(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Error grading assessment',
        severity: 'error'
      });
    }
  };

  const handleBack = () => {
    navigate('/assessments');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiRequest(`/assessments/${assessmentId}/responses/${id}`, {
        method: 'DELETE'
      });
      setSnackbar({
        open: true,
        message: 'Assessment response deleted successfully',
        severity: 'success'
      });
      navigate('/assessments');
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Error deleting response',
        severity: 'error'
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box m={2}>
        <Alert 
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (!response || !assessment) {
    return null;
  }

  // Create a map of question responses by question ID
  const questionResponseMap = {};
  if (Array.isArray(response.question_responses)) {
    response.question_responses.forEach(qr => {
      if (qr && qr.question && qr.question.id) {
        questionResponseMap[qr.question.id] = qr;
      }
    });
  }

  // Calculate scores only from questions that were answered
  const totalPoints = Array.isArray(response.question_responses) ? 
    response.question_responses.reduce((sum, qr) => {
      if (qr && qr.question && typeof qr.question.points === 'number') {
        return sum + qr.question.points;
      }
      return sum;
    }, 0) : 0;

  const earnedPoints = Array.isArray(response.question_responses) ?
    response.question_responses.reduce((sum, qr) => {
      if (qr && qr.id && typeof grades[qr.id] === 'number') {
        return sum + grades[qr.id];
      } else if (qr && qr.points_awarded !== null) {
        return sum + qr.points_awarded;
      }
      return sum;
    }, 0) : 0;

  const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  // Get a set of question IDs that existed when the assessment was submitted
  const originalQuestionIds = new Set(
    response.question_responses.map(qr => qr.question.id)
  );

  return (
    <Box m={2}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {assessment.title || 'Untitled Assessment'}
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" color="textSecondary">
              Score: {response.status === 'graded' ? `${response.final_score}%` : 'Pending Review'}
            </Typography>
            {isAdmin && (
              <Typography variant="subtitle1" color="textSecondary">
                Current Points: {earnedPoints} / {totalPoints}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" color="textSecondary" align="right">
              Submitted: {new Date(response.completed_at || response.started_at).toLocaleString()}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {Array.isArray(assessment.questions) && assessment.questions.map((question, index) => {
          if (!question || !question.id) {
            return null;
          }

          // Find the response for this question if it exists
          const questionResponse = response.question_responses.find(qr => qr.question.id === question.id);
          
          // A question is new if:
          // 1. It has a created_at timestamp
          // 2. The response has a completed_at timestamp
          // 3. The question was created after the response was completed
          // 4. There is no existing response for this question
          const isNewQuestion = question.created_at && 
            response.completed_at && 
            new Date(question.created_at) > new Date(response.completed_at) &&
            !questionResponse;

          return (
            <Card key={question.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Question {index + 1}: {question.question_text || 'No question text'}
                  </Typography>
                  {isNewQuestion && (
                    <Chip 
                      label="Added after submission" 
                      color="info" 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>

                {isNewQuestion ? (
                  <Box sx={{ my: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      This question was added after the assessment was submitted.
                    </Typography>
                  </Box>
                ) : questionResponse ? (
                  <>
                    <Box sx={{ my: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Your Answer:
                      </Typography>
                      <Typography variant="body1" sx={{ ml: 2 }}>
                        {questionResponse.answer || 'No answer provided'}
                      </Typography>
                    </Box>

                    {question.question_type === 'multiple_choice' && questionResponse.is_correct !== null && (
                      <Box sx={{ mt: 2 }}>
                        <Chip
                          label={questionResponse.is_correct ? 'Correct' : 'Incorrect'}
                          color={questionResponse.is_correct ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                    )}

                    {isAdmin && (
                      <Box sx={{ mt: 2 }}>
                        <Grid container spacing={2} alignItems="center">
                          {question.question_type === 'free_form' && (
                            <Grid item xs={12}>
                              <Paper 
                                sx={{ 
                                  p: 2, 
                                  mb: 2,
                                  bgcolor: 'background.default',
                                  border: 1,
                                  borderColor: 'divider'
                                }}
                                elevation={0}
                              >
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                  Reference Answer:
                                </Typography>
                                <Typography variant="body1">
                                  {question.correct_answer || 'No reference answer provided'}
                                </Typography>
                              </Paper>
                            </Grid>
                          )}
                          <Grid item xs={12} md={4}>
                            <TextField
                              label="Points"
                              type="number"
                              value={grades[questionResponse.id] || 0}
                              onChange={(e) => handleGradeChange(questionResponse.id, e.target.value)}
                              inputProps={{
                                min: 0,
                                max: question.points || 0
                              }}
                              fullWidth
                              helperText={`Maximum points: ${question.points || 0}`}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} md={8}>
                            <TextField
                              label="Feedback"
                              multiline
                              rows={3}
                              value={feedback[questionResponse.id] || ''}
                              onChange={(e) => handleFeedbackChange(questionResponse.id, e.target.value)}
                              fullWidth
                              size="small"
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    )}

                    {!isAdmin && (questionResponse.feedback || questionResponse.points_awarded !== null) && (
                      <>
                        {questionResponse.feedback && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                              Feedback:
                            </Typography>
                            <Typography variant="body1" sx={{ ml: 2 }}>
                              {questionResponse.feedback}
                            </Typography>
                          </Box>
                        )}

                        {questionResponse.points_awarded !== null && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" color="textSecondary">
                              Points: {questionResponse.points_awarded} / {question.points || 0}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}
                  </>
                ) : null}
              </CardContent>
            </Card>
          );
        })}

        {isAdmin && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, mb: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setConfirmDialog(true)}
            >
              {response.status === 'pending_review' ? 'Submit Grading' : 'Update Grades'}
            </Button>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          startIcon={<ArrowBack />}
        >
          Back to Assessments
        </Button>
        {isAdmin && (
          <Button
            variant="contained"
            color="error"
            onClick={() => setShowDeleteDialog(true)}
            startIcon={<Delete />}
            disabled={isDeleting}
          >
            Delete Response
          </Button>
        )}
      </Box>

      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
      >
        <DialogTitle>
          {response.status === 'pending_review' ? 'Approve Assessment' : 'Update Grades'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {response.status === 'pending_review' ? 'approve' : 'update'} this assessment with a score of {finalScore}%?
            {response.status === 'pending_review' ? ' This will mark the assessment as graded.' : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button onClick={handleApprove} color="primary" variant="contained">
            {response.status === 'pending_review' ? 'Approve' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>Delete Assessment Response</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this assessment response? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
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
    </Box>
  );
};

export default ViewAssessmentResponse; 