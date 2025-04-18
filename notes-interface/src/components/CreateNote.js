import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  IconButton,
  CircularProgress
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { createNote } from '../services/api';

const CreateNote = () => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const newNote = await createNote(text);
      setSuccess('Note created successfully!');
      setText('');
    } catch (err) {
      setError(err.message || 'Failed to create note');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, borderRadius: '16px', maxWidth: '800px', mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h2">
          Create a New Note
        </Typography>
      </Box>
      
      <form onSubmit={handleSubmit}>
        <TextField
          label="Note Content"
          multiline
          rows={6}
          fullWidth
          variant="outlined"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          sx={{ mb: 3 }}
        />
        
        <Button 
          type="submit" 
          variant="contained" 
          size="large"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
          sx={{ py: 1.5 }}
        >
          {isLoading ? 'Creating...' : 'Create Note'}
        </Button>
        
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
        
        {success && (
          <Typography color="success.main" sx={{ mt: 2 }}>
            {success}
          </Typography>
        )}
      </form>
    </Paper>
  );
};

export default CreateNote;