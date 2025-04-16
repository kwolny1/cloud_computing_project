import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

export default function App() {
  const [newText, setNewText] = useState('');
  const [noteId, setNoteId] = useState('');
  const [existingText, setExistingText] = useState('');
  const [response, setResponse] = useState('');

  const handlePost = async () => {
    try {
      const res = await fetch(`${API_URL}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText })
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
      if (data.note_id) setNoteId(data.note_id); // auto-fill for testing
    } catch (e) {
      setResponse("POST Error: " + e.message);
    }
  };

  const handleGet = async () => {
    try {
      const res = await fetch(`${API_URL}/note?note_id=${noteId}`, {
        method: 'GET'
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (e) {
      setResponse("GET Error: " + e.message);
    }
  };

  const handlePut = async () => {
    try {
      const res = await fetch(`${API_URL}/note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id: noteId, text: existingText })
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (e) {
      setResponse("PUT Error: " + e.message);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_URL}/note?note_id=${noteId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (e) {
      setResponse("DELETE Error: " + e.message);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h2>Create a New Note</h2>
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

      <h3>Response:</h3>
      <pre>{response}</pre>
    </div>
  );
}
