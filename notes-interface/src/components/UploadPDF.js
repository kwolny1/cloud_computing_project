import React, { useState } from 'react';
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
  ListItemIcon
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { uploadPDF, extractPDFText } from '../services/api';

const UploadPDF = () => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const navigate = useNavigate();

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
      const uploadResponse = await uploadPDF(file);
      console.log("llega")
      //const textResponse = await extractPDFText(uploadResponse.id);
      
      setSuccess('PDF uploaded and processed successfully!');
      setUploadedFiles(prev => [
        ...prev,
        {
          name: file.name,
          id: uploadResponse.id,
          //text: textResponse.text
        }
      ]);
      setFile(null);
    } catch (err) {
      setError(err.message || 'Failed to upload PDF');
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
          Upload PDF
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
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
          <Typography variant="body1" sx={{ mt: 1 }}>
            Selected: {file.name}
          </Typography>
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {uploadedFiles.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Uploaded PDFs
          </Typography>
          <List>
            {uploadedFiles.map((pdf, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <PdfIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={pdf.name}
                  secondary={`ID: ${pdf.id}`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Paper>
  );
};

export default UploadPDF;