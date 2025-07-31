import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/api';
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Snackbar,
  Container
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowUpward as MoveUpIcon,
  ArrowDownward as MoveDownIcon
} from '@mui/icons-material';

const CreateAssessment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assessment, setAssessment] = useState({
    title: '',
    description: '',
    questions: []
  });
  const [currentQuestion, setCurrentQuestion] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', ''],
    correct_answer: '',
    points: 1,
    order: 0
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Redirect if not admin
  if (!user?.team_role?.includes('ADMIN')) {
    navigate('/assessments');
    return null;
  }

  const handleAddOption = () => {
    setCurrentQuestion({
      ...currentQuestion,
      options: [...currentQuestion.options, '']
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({
      ...currentQuestion,
      options: newOptions
    });
  };

  const handleRemoveOption = (index) => {
    const newOptions = currentQuestion.options.filter((_, i) => i !== index);
    setCurrentQuestion({
      ...currentQuestion,
      options: newOptions,
      correct_answer: currentQuestion.correct_answer === currentQuestion.options[index] ? '' : currentQuestion.correct_answer
    });
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.question_text) {
      setSnackbar({
        open: true,
        message: 'Please enter a question',
        severity: 'error'
      });
      return;
    }

    if (currentQuestion.question_type === 'multiple_choice') {
      if (currentQuestion.options.some(opt => !opt)) {
        setSnackbar({
          open: true,
          message: 'Please fill in all options',
          severity: 'error'
        });
        return;
      }
      if (!currentQuestion.correct_answer) {
        setSnackbar({
          open: true,
          message: 'Please select a correct answer',
          severity: 'error'
        });
        return;
      }
    }

    setAssessment({
      ...assessment,
      questions: [...assessment.questions, { ...currentQuestion, order: assessment.questions.length }]
    });

    setCurrentQuestion({
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', ''],
      correct_answer: '',
      points: 1,
      order: assessment.questions.length + 1
    });
  };

  const handleMoveQuestion = (index, direction) => {
    const newQuestions = [...assessment.questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[index + direction];
    newQuestions[index + direction] = temp;
    newQuestions.forEach((q, i) => q.order = i);
    setAssessment({ ...assessment, questions: newQuestions });
  };

  const handleRemoveQuestion = (index) => {
    const newQuestions = assessment.questions.filter((_, i) => i !== index);
    newQuestions.forEach((q, i) => q.order = i);
    setAssessment({ ...assessment, questions: newQuestions });
  };

  const handleSubmit = async () => {
    if (!assessment.title) {
      setSnackbar({
        open: true,
        message: 'Please enter a title',
        severity: 'error'
      });
      return;
    }

    if (assessment.questions.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please add at least one question',
        severity: 'error'
      });
      return;
    }

    try {
      await apiRequest('/assessments', {
        method: 'POST',
        body: JSON.stringify(assessment),
      });

      setSnackbar({
        open: true,
        message: 'Assessment created successfully',
        severity: 'success'
      });
      navigate('/assessments');
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error creating assessment',
        severity: 'error'
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Create Assessment</Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Assessment Details</Typography>
          <TextField
            fullWidth
            label="Title"
            value={assessment.title}
            onChange={(e) => setAssessment({ ...assessment, title: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            value={assessment.description}
            onChange={(e) => setAssessment({ ...assessment, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Add Question</Typography>
          <TextField
            fullWidth
            label="Question Text"
            value={currentQuestion.question_text}
            onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Question Type</InputLabel>
            <Select
              value={currentQuestion.question_type}
              onChange={(e) => setCurrentQuestion({
                ...currentQuestion,
                question_type: e.target.value,
                options: e.target.value === 'multiple_choice' ? ['', ''] : [],
                correct_answer: ''
              })}
            >
              <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
              <MenuItem value="free_form">Free Form</MenuItem>
            </Select>
          </FormControl>

          {currentQuestion.question_type === 'multiple_choice' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Options</Typography>
              {currentQuestion.options.map((option, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    label={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                  />
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveOption(index)}
                    disabled={currentQuestion.options.length <= 2}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddOption}
                sx={{ mt: 1 }}
              >
                Add Option
              </Button>

              <FormControl fullWidth margin="normal">
                <InputLabel>Correct Answer</InputLabel>
                <Select
                  value={currentQuestion.correct_answer}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
                >
                  {currentQuestion.options.map((option, index) => (
                    <MenuItem key={index} value={option}>
                      {option || `Option ${index + 1}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          <TextField
            fullWidth
            label="Points"
            type="number"
            value={currentQuestion.points}
            onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 1 })}
            margin="normal"
            inputProps={{ min: 1 }}
          />

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddQuestion}
            sx={{ mt: 2 }}
          >
            Add Question
          </Button>
        </Paper>

        {assessment.questions.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Questions</Typography>
            <List>
              {assessment.questions.map((question, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={`${index + 1}. ${question.question_text}`}
                      secondary={
                        question.question_type === 'multiple_choice'
                          ? `Type: Multiple Choice | Points: ${question.points}`
                          : `Type: Free Form | Points: ${question.points}`
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleMoveQuestion(index, -1)}
                        disabled={index === 0}
                      >
                        <MoveUpIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleMoveQuestion(index, 1)}
                        disabled={index === assessment.questions.length - 1}
                      >
                        <MoveDownIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => handleRemoveQuestion(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < assessment.questions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/assessments')}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
          >
            Create Assessment
          </Button>
        </Box>
      </Paper>

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
    </Container>
  );
};

export default CreateAssessment; 