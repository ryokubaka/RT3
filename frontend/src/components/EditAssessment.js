import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ListItemSecondaryAction,
  Divider,
  Alert,
  Snackbar,
  Container,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowUpward as MoveUpIcon,
  ArrowDownward as MoveDownIcon,
  Edit as EditIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const EditAssessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assessment, setAssessment] = useState({
    title: '',
    description: '',
    is_active: true,
    questions: []
  });
  const [currentQuestion, setCurrentQuestion] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', ''],
    correct_answer: '',
    points: 1,
    order: 0,
    category_id: null,
    category_name: ''
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiRequest('/assessments/categories', 'GET');
      setCategories(response || []);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to load categories',
        severity: 'error'
      });
    }
  }, []);

  const fetchAssessment = useCallback(async () => {
    try {
      const data = await apiRequest(`/assessments/${id}`, 'GET');
      
      if (!data) {
        throw new Error('No assessment data received');
      }

      // Ensure questions array exists and is properly formatted
      const formattedQuestions = (data.questions || []).map((q, index) => {
        return {
          ...q,
          id: q.id,
          question_text: q.question_text || '',
          question_type: q.question_type || 'multiple_choice',
          options: Array.isArray(q.options) ? q.options : ['', ''],
          correct_answer: q.correct_answer || '',
          points: q.points || 1,
          order: q.order || index,
          category_id: q.category?.id || null,
          category_name: q.category?.name || ''
        };
      });

      setAssessment({
        title: data.title || '',
        description: data.description || '',
        is_active: data.is_active ?? true,
        questions: formattedQuestions
      });
    } catch (error) {
      setError(error.message || 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCategories();
    fetchAssessment();
  }, [fetchCategories, fetchAssessment]);

  const handleEditQuestion = (question) => {
    const questionToEdit = {
        id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        options: Array.isArray(question.options) ? question.options : [],
        correct_answer: question.correct_answer,
        points: question.points || 1,
        order: question.order,
        category_id: question.category?.id || question.category_id || null,
        category_name: question.category?.name || question.category_name || ''
    };
    setCurrentQuestion(questionToEdit);
    setEditingQuestionId(question.id);
    setIsEditModalOpen(true);
  };

  const handleSaveQuestionChanges = async () => {
    // Validate required fields
    if (!currentQuestion.question_text || !currentQuestion.question_type) {
        setSnackbar({
            open: true,
            message: 'Please fill in all required fields',
            severity: 'error'
        });
        return;
    }

    try {
        const formattedQuestion = {
            question_text: currentQuestion.question_text,
            question_type: currentQuestion.question_type,
            options: Array.isArray(currentQuestion.options) ? currentQuestion.options.filter(opt => opt.trim()) : [],
            correct_answer: currentQuestion.correct_answer,
            points: currentQuestion.points || 1,
            order: currentQuestion.order,
            category_id: currentQuestion.category_id
        };

        if (editingQuestionId) {
            // Update existing question
            await apiRequest(`/assessments/${id}/questions/${editingQuestionId}`, {
                method: 'PATCH',
                body: formattedQuestion
            });
        } else {
            // Add new question
            await apiRequest(`/assessments/${id}/questions`, {
                method: 'POST',
                body: formattedQuestion
            });
        }

        // Refresh the assessment data to get the updated state from the server
        await fetchAssessment();

        // Reset form and close modal
        setCurrentQuestion({
            question_text: '',
            question_type: 'multiple_choice',
            options: ['', ''],
            correct_answer: '',
            points: 1,
            order: assessment.questions.length + 1,
            category_id: null,
            category_name: ''
        });
        setEditingQuestionId(null);
        setIsEditModalOpen(false);

        setSnackbar({
            open: true,
            message: editingQuestionId ? 'Question updated successfully' : 'Question added successfully',
            severity: 'success'
        });
    } catch (error) {
        setSnackbar({
            open: true,
            message: error.message || 'Error saving question',
            severity: 'error'
        });
    }
  };

  const handleCancelEdit = () => {
    setCurrentQuestion({
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', ''],
      correct_answer: '',
      points: 1,
      order: assessment.questions.length + 1,
      category_id: null,
      category_name: ''
    });
    setEditingQuestionId(null);
    setIsEditModalOpen(false);
  };

  const handleMoveQuestion = async (index, direction) => {
    try {
        const newQuestions = [...assessment.questions];
        const temp = newQuestions[index];
        newQuestions[index] = newQuestions[index + direction];
        newQuestions[index + direction] = temp;
        
        // Update orders
        newQuestions.forEach((q, i) => q.order = i);
        
        // Update orders on the backend
        const updates = [
            {
                id: newQuestions[index].id,
                order: newQuestions[index].order
            },
            {
                id: newQuestions[index + direction].id,
                order: newQuestions[index + direction].order
            }
        ];
        
        await apiRequest(`/assessments/${id}/questions/reorder`, {
            method: 'PATCH',
            body: { updates }
        });

        setAssessment({ ...assessment, questions: newQuestions });
    } catch (error) {
        setSnackbar({
            open: true,
            message: error.message || 'Error reordering questions',
            severity: 'error'
        });
    }
  };

  const handleRemoveQuestion = async (index) => {
    try {
        const questionId = assessment.questions[index].id;
        
        await apiRequest(`/assessments/${id}/questions/${questionId}`, {
            method: 'DELETE'
        });

        // Update local state
        const newQuestions = assessment.questions.filter((_, i) => i !== index);
        newQuestions.forEach((q, i) => q.order = i);
        setAssessment({ ...assessment, questions: newQuestions });

        setSnackbar({
            open: true,
            message: 'Question removed successfully',
            severity: 'success'
        });
    } catch (error) {
        setSnackbar({
            open: true,
            message: error.message || 'Error removing question',
            severity: 'error'
        });
    }
  };

  const handleSubmit = async (e) => {
    if (e) {
        e.preventDefault();
    }
    
    if (!assessment.title) {
        setSnackbar({
            open: true,
            message: 'Please enter a title',
            severity: 'error'
        });
        return;
    }

    try {
        // Only update assessment metadata, not questions
        const data = {
            title: assessment.title,
            description: assessment.description || '',
            is_active: assessment.is_active
        };

        await apiRequest(`/assessments/${id}`, {
            method: 'PATCH',
            body: data
        });

        setSnackbar({
            open: true,
            message: 'Assessment updated successfully',
            severity: 'success'
        });

        navigate('/assessments');
    } catch (error) {
        setSnackbar({
            open: true,
            message: error.message || 'Error updating assessment',
            severity: 'error'
        });
    }
  };

  // Redirect if not admin
  if (!user?.team_role?.includes('ADMIN')) {
    navigate('/assessments');
    return null;
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>Loading...</Typography>
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Edit Assessment
        </Typography>

        <Box sx={{ mb: 4 }}>
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
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Questions</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setCurrentQuestion({
                question_text: '',
                question_type: 'multiple_choice',
                options: ['', ''],
                correct_answer: '',
                points: 1,
                order: assessment.questions.length + 1,
                category_id: null,
                category_name: ''
              });
              setEditingQuestionId(null);
              setIsEditModalOpen(true);
            }}
          >
            New Question
          </Button>
        </Box>

        <List>
          {assessment.questions.map((question, index) => (
            <React.Fragment key={index}>
              <ListItem>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" component="span">
                      {`${index + 1}. ${question.question_text}`}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" component="span">
                      ({question.points} points)
                    </Typography>
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="textSecondary" component="span">
                      Type: {question.question_type}
                    </Typography>
                    {question.category?.name && (
                      <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block' }}>
                        Category: {question.category.name}
                      </Typography>
                    )}
                    {question.question_type === 'multiple_choice' && (
                      <>
                        <Typography variant="body2" color="textSecondary" component="span" sx={{ display: 'block' }}>
                          Options: {question.options?.join(', ')}
                        </Typography>
                        <Typography variant="body2" color="success.main" component="span" sx={{ display: 'block' }}>
                          Correct Answer: {question.correct_answer}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleEditQuestion(question)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveQuestion(index)}
                    sx={{ mr: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleMoveQuestion(index, -1)}
                    disabled={index === 0}
                    sx={{ mr: 1 }}
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
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>

        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={() => navigate('/assessments')}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!assessment.title || assessment.questions.length === 0}
          >
            Save Assessment
          </Button>
        </Box>
      </Paper>

      <Dialog
        open={isEditModalOpen}
        onClose={handleCancelEdit}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingQuestionId ? 'Edit Question' : 'Add Question'}
          <IconButton
            aria-label="close"
            onClick={handleCancelEdit}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Question Text"
              value={currentQuestion.question_text}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Question Type</InputLabel>
              <Select
                value={currentQuestion.question_type}
                onChange={(e) => {
                  const newType = e.target.value;
                  setCurrentQuestion({
                    ...currentQuestion,
                    question_type: newType,
                    // Reset options and correct_answer based on type
                    options: newType === 'multiple_choice' ? ['', ''] : [],
                    correct_answer: ''  // Reset for both types
                  });
                }}
                label="Question Type"
              >
                <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                <MenuItem value="free_form">Free Form</MenuItem>
              </Select>
            </FormControl>

            <Autocomplete
              freeSolo
              options={categories}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option?.name || '';
              }}
              value={currentQuestion.category_name ? {
                id: currentQuestion.category_id,
                name: currentQuestion.category_name
              } : null}
              onChange={(event, newValue) => {
                setCurrentQuestion({
                  ...currentQuestion,
                  category_id: newValue?.id || null,
                  category_name: typeof newValue === 'string' ? newValue : newValue?.name || ''
                });
              }}
              renderInput={(params) => (
                <TextField {...params} label="Category" sx={{ mb: 2 }} />
              )}
            />

            <TextField
              type="number"
              label="Points"
              value={currentQuestion.points || 1}
              onChange={(e) => setCurrentQuestion({ 
                ...currentQuestion, 
                points: parseInt(e.target.value) || 1 
              })}
              sx={{ mb: 2 }}
              fullWidth
            />

            {currentQuestion.question_type === 'multiple_choice' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Options</Typography>
                {currentQuestion.options.map((option, index) => (
                  <Box key={index} sx={{ display: 'flex', mb: 1 }}>
                    <TextField
                      fullWidth
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...currentQuestion.options];
                        newOptions[index] = e.target.value;
                        setCurrentQuestion({ ...currentQuestion, options: newOptions });
                      }}
                      label={`Option ${String.fromCharCode(97 + index)}`}
                    />
                    <IconButton 
                      onClick={() => {
                        const newOptions = currentQuestion.options.filter((_, i) => i !== index);
                        setCurrentQuestion({ ...currentQuestion, options: newOptions });
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  onClick={() => setCurrentQuestion({
                    ...currentQuestion,
                    options: [...currentQuestion.options, '']
                  })}
                  sx={{ mt: 1 }}
                >
                  Add Option
                </Button>

                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Correct Answer</InputLabel>
                  <Select
                    value={currentQuestion.correct_answer || ''}
                    onChange={(e) => setCurrentQuestion({
                      ...currentQuestion,
                      correct_answer: e.target.value
                    })}
                    label="Correct Answer"
                  >
                    {currentQuestion.options.map((option, index) => (
                      <MenuItem key={index} value={option}>
                        {option || `Option ${String.fromCharCode(97 + index)}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {currentQuestion.question_type === 'free_form' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Reference Answer</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={currentQuestion.correct_answer || ''}
                  onChange={(e) => setCurrentQuestion({
                    ...currentQuestion,
                    correct_answer: e.target.value
                  })}
                  label="Enter the reference answer for graders"
                  helperText="This answer will be shown to graders when they are reviewing responses"
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit}>Cancel</Button>
          <Button onClick={handleSaveQuestionChanges} variant="contained" color="primary">
            {editingQuestionId ? 'Save Changes' : 'Add Question'}
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
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EditAssessment; 