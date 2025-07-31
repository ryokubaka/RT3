import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import {
  Box,
  Button,
  Paper,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress
} from '@mui/material';

const TakeAssessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDialog, setConfirmDialog] = useState(false);

  const checkExistingResponse = async () => {
    try {
      const response = await apiRequest(`/assessments/${id}/responses/current`, 'GET');
      if (response) {
        navigate(`/assessments/${id}/responses/${response.id}`);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error checking existing responses',
        severity: 'error'
      });
    }
  };

  const fetchAssessment = useCallback(async () => {
    try {
      const data = await apiRequest(`/assessments/${id}`);
      if (!data || !data.questions || data.questions.length === 0) {
        throw new Error('No questions found in assessment');
      }
      setAssessment(data);
      // Initialize answers object with empty values for each question
      const initialAnswers = {};
      data.questions.forEach(q => {
        initialAnswers[q.id] = '';
      });
      setAnswers(initialAnswers);

      // Check if user has already submitted a response
      try {
        const myResponses = await apiRequest('/assessments/my-responses');
        const existingResponse = myResponses.find(r => r.assessment_id === parseInt(id, 10));
        if (existingResponse) {
          setError('You have already submitted a response to this assessment');
          return;
        }
      } catch (error) {
        console.error('Error checking existing responses:', error);
      }
    } catch (error) {
      console.error('Error fetching assessment:', error);
      setError(error.message || 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      // Convert answers object to question_responses array
      const question_responses = Object.entries(answers).map(([question_id, answer]) => ({
        question_id: parseInt(question_id),
        answer: answer
      }));

      const response = await apiRequest(`/assessments/${id}/responses`, {
        method: 'POST',
        body: {
          assessment_id: parseInt(id),
          question_responses: question_responses
        }
      });
      navigate(`/assessments/${id}/responses/${response.id}`);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Error submitting assessment',
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

  if (error) {
    return (
      <Box m={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!assessment || !assessment.questions || assessment.questions.length === 0) {
    return (
      <Box m={2}>
        <Alert severity="error">No questions found in assessment</Alert>
      </Box>
    );
  }

  const currentQuestion = assessment.questions[currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <Box m={2}>
        <Alert severity="error">Invalid question index</Alert>
      </Box>
    );
  }

  const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;

  // Group questions by category
  const questionsByCategory = assessment.questions.reduce((acc, question) => {
    const categoryName = question.category?.name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(question);
    return acc;
  }, {});

  // Get current question's category
  const currentCategory = currentQuestion.category?.name || 'Uncategorized';

  return (
    <Box m={2}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {assessment.title}
        </Typography>
        
        <Box my={2}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" color="textSecondary" align="right">
            Question {currentQuestionIndex + 1} of {assessment.questions.length}
          </Typography>
        </Box>

        <Box my={4}>
          <Typography variant="h6" color="primary" gutterBottom>
            {currentCategory}
          </Typography>
          
          <Typography variant="h6" gutterBottom>
            {currentQuestion.question_text}
          </Typography>

          <FormControl component="fieldset" fullWidth>
            {currentQuestion.question_type === 'multiple_choice' ? (
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              >
                {currentQuestion.options.map((option, index) => (
                  <FormControlLabel
                    key={index}
                    value={option}
                    control={<Radio />}
                    label={option}
                  />
                ))}
              </RadioGroup>
            ) : (
              <Box>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  placeholder="Enter your answer here..."
                  sx={{ mb: 2 }}
                />
                {currentQuestion.reference_answer && (
                  <Typography variant="body2" color="textSecondary">
                    Reference Answer: {currentQuestion.reference_answer}
                  </Typography>
                )}
              </Box>
            )}
          </FormControl>
        </Box>

        <Box display="flex" justifyContent="space-between" mt={4}>
          <Button
            variant="outlined"
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          {currentQuestionIndex === assessment.questions.length - 1 ? (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setConfirmDialog(true)}
            >
              Submit Assessment
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>

      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
      >
        <DialogTitle>Submit Assessment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to submit this assessment? You won't be able to change your answers after submission.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TakeAssessment; 