import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField,
  Divider,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { extractText, summarizeText, createNote, getPDFData } from '../services/api';

const ProcessPDF = () => {
  const { pdf_id } = useParams();
  const [pdfData, setPdfData] = useState(null);
  const [isLoading, setIsLoading] = useState({
    extract: false,
    summarize: false
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Implementa esta función en api.js
        
        const response = await getPDFData(pdf_id); 
        setPdfData(response.data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchData();
  }, [pdf_id]);

  const handleExtract = async () => {
    setIsLoading({...isLoading, extract: true});
    try {
      const response = await extractText(pdf_id);
      console.log(response)
      setPdfData({
        ...pdfData,
        extracted: response.extracted_text
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading({...isLoading, extract: false});
    }
  };

  const handleSummarize = async () => {
    setIsLoading({...isLoading, summarize: true});
    try {
      const response = await summarizeText(pdf_id);
      setPdfData({
        ...pdfData,
        summarized: response.summarized
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading({...isLoading, summarize: false});
    }
  };

  const handleAddToNotes = () => {
    if (pdfData?.summarized) {
      createNote(pdfData.summarized); // Implementa esta función
    }
  };

  return (

    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/upload-pdf')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h2">
          Back
        </Typography>
      </Box>

      <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          {pdfData?.filename || "Processing PDF"}
        </Typography>

        {/* Sección Extracción */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>Extract Text</Typography>
          <Button
            variant="contained"
            onClick={handleExtract}
            disabled={isLoading.extract}
            sx={{ mb: 2 }}
          >
            {isLoading.extract ? <CircularProgress size={24} /> : "Extract Text"}
          </Button>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={pdfData?.extracted || "No text extracted yet"}
            variant="outlined"
            InputProps={{ readOnly: true }}
          />
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Sección Resumen */}
        <Box sx={{ opacity: pdfData?.extracted ? 1 : 0.5 }}>
          <Typography variant="h6" gutterBottom>Summarize with AI</Typography>
          <Button
            variant="contained"
            onClick={handleSummarize}
            disabled={!pdfData?.extracted || isLoading.summarize}
            sx={{ mb: 2 }}
          >
            {isLoading.summarize ? <CircularProgress size={24} /> : "Summarize"}
          </Button>
          <TextField
            fullWidth
            multiline
            rows={5}
            value={pdfData?.summarized || "Extract text first to enable summarization"}
            variant="outlined"
            InputProps={{ readOnly: true }}
          />
          {pdfData?.summarized && (
            <Button
              variant="outlined"
              onClick={handleAddToNotes}
              sx={{ mt: 2 }}
            >
              Add Summary to Notes
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ProcessPDF;