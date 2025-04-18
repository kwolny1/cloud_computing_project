import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton,
  TextField,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton as ListIconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { 
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { createEvent, getEvents, deleteEvent } from '../services/api';
import { format } from 'date-fns';

const ScheduleEvent = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [events, setEvents] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Event title is required');
      return;
    }

    if (startDate > endDate) {
      setError('End date must be after start date');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const newEvent = await createEvent({
        title,
        description,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString()
      });
      
      setSuccess('Event scheduled successfully!');
      setTitle('');
      setDescription('');
      setEvents(prev => [...prev, newEvent]);
    } catch (err) {
      setError(err.message || 'Failed to schedule event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (event) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    
    try {
      setIsLoading(true);
      await deleteEvent(eventToDelete.id);
      setEvents(events.filter(e => e.id !== eventToDelete.id));
      setDeleteDialogOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to delete event');
    } finally {
      setIsLoading(false);
    }
  };

  // En una aplicación real, cargarías los eventos existentes al montar el componente
  // useEffect(() => {
  //   const fetchEvents = async () => {
  //     try {
  //       const eventsData = await getEvents();
  //       setEvents(eventsData);
  //     } catch (err) {
  //       setError(err.message || 'Failed to fetch events');
  //     }
  //   };
  //   fetchEvents();
  // }, []);

  return (
    <Paper elevation={3} sx={{ p: 4, borderRadius: '16px', maxWidth: '800px', mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h2">
          Schedule Event
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <TextField
          label="Event Title"
          fullWidth
          variant="outlined"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          sx={{ mb: 3 }}
        />

        <TextField
          label="Description"
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
          <DateTimePicker
            label="Start Time"
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
            renderInput={(params) => <TextField {...params} fullWidth />}
        />

        <DateTimePicker
            label="End Time"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            minDateTime={startDate}
            renderInput={(params) => <TextField {...params} fullWidth />}
        />
        </Box>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : <AddIcon />}
          sx={{ py: 1.5 }}
        >
          {isLoading ? 'Scheduling...' : 'Schedule Event'}
        </Button>
      </form>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 3 }}>
          {success}
        </Alert>
      )}

      {events.length > 0 && (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
            Upcoming Events
            </Typography>
            <List>
            {events.map((event) => (
                <ListItem key={`event-${event.event_id}`}> {/* Cambiado a event_id */}
                <ListItemIcon>
                    <EventIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                    primary={event.title}
                    secondary={
                    <>
                        {format(new Date(event.start_time), 'PPPpp')} -{' '}
                        {format(new Date(event.end_time), 'PPPpp')}
                        <br />
                        {event.description}
                    </>
                    }
                />
                <ListItemSecondaryAction>
                    <IconButton 
                    edge="end" 
                    aria-label="delete"
                    onClick={() => handleDeleteClick(event)}
                    color="error"
                    >
                    <DeleteIcon />
                    </IconButton>
                </ListItemSecondaryAction>
                </ListItem>
            ))}
            </List>
        </Box>
        )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this event?
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
    </Paper>
  );
};

export default ScheduleEvent;