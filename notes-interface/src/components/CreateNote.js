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
import RichTextEditor from './RichTextEditor';
import '../styles/global.css';

const CreateNote = () => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState({
    type: 'doc',
    content: [{
      type: 'paragraph',
      content: [{ type: 'text', text: '' }]
    }]
  })
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
      console.log("DATOS: ", title, " ", content);
      const newNote = await createNote({ title, content })
      setSuccess('Note created successfully!');
      setTitle('');
      setContent({
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: '' }]
        }]
      });
      //setText('');
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
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        
        <RichTextEditor 
          content={content}
          onChange={setContent}
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