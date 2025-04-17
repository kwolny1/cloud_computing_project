import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

export default function App() {
  const [newText, setNewText] = useState('');
  const [noteId, setNoteId] = useState('');
  const [existingText, setExistingText] = useState('');
  const [response, setResponse] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('');

  const showResponse = async (fetchPromise) => {
    try {
      const res = await fetchPromise;
      const contentType = res.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      const data = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        setResponse(`❌ Error ${res.status}:\n${JSON.stringify(data, null, 2)}`);
      } else {
        setResponse(JSON.stringify(data, null, 2));
      }
    } catch (e) {
      setResponse(`💥 Fetch error: ${e.message}`);
    }
  };

  // Note handlers
  const handlePost = () => {
    showResponse(
      fetch(`${API_URL}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText })
      })
    );
  };

  const handleGet = () => {
    showResponse(fetch(`${API_URL}/note?note_id=${noteId}`, { method: 'GET' }));
  };

  const handlePut = () => {
    showResponse(
      fetch(`${API_URL}/note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id: noteId, text: existingText })
      })
    );
  };

  const handleDelete = () => {
    showResponse(fetch(`${API_URL}/note?note_id=${noteId}`, { method: 'DELETE' }));
  };

  // PDF upload handler
  const handleUploadPDF = () => {
    if (!selectedFile) {
      setResponse('❗ Please select a PDF file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    showResponse(
      fetch(`${API_URL}/upload-pdf`, {
        method: 'POST',
        body: formData
      })
    );
  };

  // Event scheduler
  const handleScheduleEvent = () => {
    if (!eventTitle || !eventTime) {
      setResponse('❗ Please fill out both event title and time.');
      return;
    }

    showResponse(
      fetch(`${API_URL}/schedule-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: eventTitle, time: eventTime })
      })
    );
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h2>Create a New Note!</h2>
      <textarea
        rows="4"
        cols="50"
        value={newText}
        onChange={(e) => setNewText(e.target.value)}
        placeholder="Type your note here..."
      />
      <br />
      <button onClick={handlePost}>Submit Note</button>

      <hr />

      <h2>Manage Notes</h2>
      <input
        type="text"
        value={noteId}
        onChange={(e) => setNoteId(e.target.value)}
        placeholder="Note ID"
        style={{ width: '300px', marginRight: '10px' }}
      />
      <br /><br />
      <textarea
        rows="4"
        cols="50"
        value={existingText}
        onChange={(e) => setExistingText(e.target.value)}
        placeholder="Update text (only used for PUT)"
      />
      <br />
      <button onClick={handleGet}>Get Note</button>
      <button onClick={handlePut}>Update Note</button>
      <button onClick={handleDelete}>Delete Note</button>

      <hr />

      <h2>📄 Upload PDF</h2>
      <input type="file" accept="application/pdf" onChange={(e) => setSelectedFile(e.target.files[0])} />
      <br /><br />
      <button onClick={handleUploadPDF}>Upload PDF</button>

      <hr />

      <h2>📅 Schedule Event</h2>
      <input
        type="text"
        placeholder="Event Title"
        value={eventTitle}
        onChange={(e) => setEventTitle(e.target.value)}
        style={{ marginRight: '10px' }}
      />
      <input
        type="datetime-local"
        value={eventTime}
        onChange={(e) => setEventTime(e.target.value)}
      />
      <br /><br />
      <button onClick={handleScheduleEvent}>Schedule</button>

      <hr />

      <h3>Response:</h3>
      <pre>{response}</pre>
    </div>
  );
}
