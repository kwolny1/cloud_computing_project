import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Notes API
export const createNote = async (text) => {
  try {
    const response = await api.post('/summarize', { text });
    return response.data;
  } catch (error) {
    console.error('Error creating note:', error);
    throw error.response?.data || error.message;
  }
};

export const getNote = async (noteId) => {
  try {
    const response = await api.get('/note', { params: { note_id: noteId } });
    return response.data;
  } catch (error) {
    console.error('Error getting note:', error);
    throw error.response?.data || error.message;
  }
};

export const getAllNotes = async () => {
    try {
      const response = await api.get('/notes');
      return response.data?.notes || []; // Asegura que sea array
    } catch (error) {
      console.error('Error getting all notes:', error);
      return []; // Devuelve array vacío en caso de error
    }
  };

export const updateNote = async (noteId, text) => {
  try {
    const response = await api.put('/note', { note_id: noteId, text });
    return response.data;
  } catch (error) {
    console.error('Error updating note:', error);
    throw error.response?.data || error.message;
  }
};

export const deleteNote = async (noteId) => {
  try {
    const response = await api.delete('/note', { params: { note_id: noteId } });
    return response.data;
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error.response?.data || error.message;
  }
};

// PDF API (necesitarías implementar estos endpoints en el backend)
export const uploadPDF = async (file) => {
  try {
    const formData = new FormData();
    formData.append('pdf', file);
    const response = await api.post('/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error.response?.data || error.message;
  }
};

export const extractPDFText = async (pdfId) => {
  try {
    const response = await api.get(`/pdf/${pdfId}/text`);
    return response.data;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw error.response?.data || error.message;
  }
};

// Schedule API (necesitarías implementar estos endpoints en el backend)
export const createEvent = async (eventData) => {
  try {
    const response = await api.post('/schedule-event', eventData);
    return response.data;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error.response?.data || error.message;
  }
};

export const getEvents = async () => {
  try {
    const response = await api.get('/events');
    return response.data;
  } catch (error) {
    console.error('Error getting events:', error);
    throw error.response?.data || error.message;
  }
};

export const deleteEvent = async (eventId) => {
  try {
    const response = await api.delete(`/events/${eventId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error.response?.data || error.message;
  }
};