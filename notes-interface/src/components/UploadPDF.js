import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Chip
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  PlayCircle as ProcessIcon
} from '@mui/icons-material';
import { uploadPDF, getPDFs, deletePDF } from '../services/api';

const UploadPDF = () => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [pdfs, setPdfs] = useState([]);
  const navigate = useNavigate();

  // Cargar PDFs al montar el componente
  useEffect(() => {
    fetchPDFs();
  }, []);

  const fetchPDFs = async () => {
    try {
      const response = await getPDFs();
      setPdfs(response.files || []);
    } catch (err) {
      setError('Failed to fetch PDFs');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a PDF file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await uploadPDF(file);
      setSuccess('PDF uploaded successfully!');
      setFile(null);
      fetchPDFs(); // Actualizar la lista
    } catch (err) {
      setError(err.message || 'Failed to upload PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (pdfId) => {
    try {
      await deletePDF(pdfId);
      setPdfs(pdfs.filter(pdf => pdf.id !== pdfId));
      setSuccess('PDF deleted successfully!');
    } catch (err) {
      setError('Failed to delete PDF');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, borderRadius: '16px', maxWidth: '800px', mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h2">
          PDF Management
        </Typography>
      </Box>

      {/* Sección de subida */}
      <Box sx={{ mb: 4, p: 3, border: '1px dashed #ccc', borderRadius: '8px' }}>
        <Typography variant="h6" gutterBottom>Upload New PDF</Typography>
        <input
          accept="application/pdf"
          style={{ display: 'none' }}
          id="pdf-upload"
          type="file"
          onChange={handleFileChange}
        />
        <label htmlFor="pdf-upload">
          <Button
            variant="outlined"
            component="span"
            startIcon={<CloudUploadIcon />}
            sx={{ mr: 2 }}
          >
            Select PDF
          </Button>
        </label>
        
        {file && (
          <Chip 
            label={file.name} 
            onDelete={() => setFile(null)} 
            sx={{ ml: 1 }} 
          />
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={!file || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
          sx={{ mt: 2, display: 'block' }}
        >
          {isLoading ? 'Uploading...' : 'Upload PDF'}
        </Button>
      </Box>

      {/* Sección de PDFs existentes */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>Existing PDFs</Typography>
        <List dense>
          {pdfs.map((pdf) => (
            <ListItem 
              key={pdf.id}
              secondaryAction={
                <Box>
                  <IconButton 
                    edge="end" 
                    onClick={() => navigate(`/process-pdf/${pdf.id}`)}
                    color="primary"
                  >
                    <ProcessIcon />
                  </IconButton>
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDelete(pdf.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            >
              <ListItemIcon>
                <PdfIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={pdf.name}
                secondary={`Uploaded: ${new Date(pdf.uploadDate).toLocaleString()}`}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Mensajes de estado */}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
    </Paper>
  );
};

export default UploadPDF;