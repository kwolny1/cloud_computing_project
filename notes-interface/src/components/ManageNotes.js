import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TextField,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { getAllNotes, updateNote, deleteNote } from '../services/api';

const ManageNotes = () => {
  const [notes, setNotes] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [editText, setEditText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotes = async () => {
      setIsLoading(true);
      try {
        // Necesitarías implementar el endpoint /notes en tu backend
        const allNotes = await getAllNotes();
        setNotes(allNotes);
        setFilteredNotes(allNotes);
      } catch (err) {
        setError(err.message || 'Failed to fetch notes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, []);

  useEffect(() => {
    try {
      const term = searchTerm?.toLowerCase() || '';
      const filtered = Array.isArray(notes) 
        ? notes.filter(note => {
            const text = note.original_text?.toLowerCase() || '';
            const phrases = note.key_phrases?.toLowerCase() || '';
            return text.includes(term) || phrases.includes(term);
          })
        : [];
      setFilteredNotes(filtered);
    } catch (error) {
      console.error("Filter error:", error);
      setFilteredNotes([]);
    }
  }, [searchTerm, notes]);

  const handleEdit = (note) => {
    setEditingNote(note);
    setEditText(note.original_text);
  };

  const handleUpdate = async () => {
    if (!editingNote) return;
    
    try {
      setIsLoading(true);
      const updatedNote = await updateNote(editingNote.note_id, editText);
      setNotes(notes.map(n => n.note_id === updatedNote.note_id ? updatedNote : n));
      setEditingNote(null);
    } catch (err) {
      setError(err.message || 'Failed to update note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (note) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    
    try {
      setIsLoading(true);
      await deleteNote(noteToDelete.note_id);
      setNotes(notes.filter(n => n.note_id !== noteToDelete.note_id));
      setDeleteDialogOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to delete note');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h2">
          Manage Notes
        </Typography>
      </Box>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search notes..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
        }}
        sx={{ mb: 3 }}
      />

      {isLoading && !notes.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Content</TableCell>
                <TableCell>Key Phrases</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(filteredNotes) && filteredNotes.map((note) => (
                <TableRow key={note.note_id}>
                  <TableCell>{note.note_id.substring(0, 8)}...</TableCell>
                  <TableCell>
                    {editingNote?.note_id === note.note_id ? (
                      <TextField
                        fullWidth
                        multiline
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                    ) : (
                      note.original_text
                    )}
                  </TableCell>
                  <TableCell>{note.key_phrases || 'N/A'}</TableCell>
                  <TableCell>
                    {new Date(note.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {editingNote?.note_id === note.note_id ? (
                      <>
                        <IconButton onClick={handleUpdate} color="primary">
                          <CheckIcon />
                        </IconButton>
                        <IconButton onClick={() => setEditingNote(null)}>
                          <CloseIcon />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton onClick={() => handleEdit(note)} color="primary">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteClick(note)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this note?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ManageNotes;