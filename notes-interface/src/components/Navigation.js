import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Paper, Typography, styled } from '@mui/material';
import {
  NoteAdd as CreateNoteIcon,
  ManageSearch as ManageNotesIcon,
  PictureAsPdf as UploadPDFIcon,
  CalendarToday as ScheduleEventIcon
} from '@mui/icons-material';

const MenuItem = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  borderRadius: '16px',
  cursor: 'pointer',
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8],
    backgroundColor: theme.palette.action.hover,
  },
}));

const IconContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  color: theme.palette.primary.main,
}));

const Navigation = () => {
  const navigate = useNavigate();

  const menuItems = [
    { 
      title: 'Create a Note', 
      icon: <CreateNoteIcon fontSize="large" />, 
      path: '/create-note' 
    },
    { 
      title: 'Manage Notes', 
      icon: <ManageNotesIcon fontSize="large" />, 
      path: '/manage-notes' 
    },
    { 
      title: 'Upload PDF', 
      icon: <UploadPDFIcon fontSize="large" />, 
      path: '/upload-pdf' 
    },
    { 
      title: 'Schedule Event', 
      icon: <ScheduleEventIcon fontSize="large" />, 
      path: '/schedule-event' 
    },
  ];

  return (
    <Box sx={{ flexGrow: 1, p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 6 }}>
        Notes Interface
      </Typography>
      <Grid container spacing={4} justifyContent="center">
        {menuItems.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.title}>
            <MenuItem elevation={4} onClick={() => navigate(item.path)}>
              <IconContainer>
                {item.icon}
              </IconContainer>
              <Typography variant="h6">{item.title}</Typography>
            </MenuItem>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Navigation;