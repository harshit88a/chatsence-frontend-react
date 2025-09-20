import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import UserTextBox from './components/UserTextBox';
import LlmTextBox from './components/LlmTextBox';
import SavedNotesPane from './components/SavedNotesPane';

const CHAR_THRESHOLD = 250;

function App() {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('lecture');
  const [userText, setUserText] = useState('');
  const [llmText, setLlmText] = useState('');
  const [savedNotes, setSavedNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  const lastApiCallLength = useRef(0);
  const [llmResponseData, setLlmResponseData] = useState(null);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'display'
  const [activeNote, setActiveNote] = useState(null); // Note being displayed

  useEffect(() => {
    let notes = JSON.parse(localStorage.getItem('savedNotes') || '[]');
    let updated = false;
    notes = notes.map((note, index) => {
      if (!note.id) {
        updated = true;
        return { ...note, id: Date.now() + index };
      }
      return note;
    });
    setSavedNotes(notes);
    if (updated) {
      localStorage.setItem('savedNotes', JSON.stringify(notes));
    }
  }, []);

  const getLlmUpdate = async (isFinal = false) => {
    if (userText.length - lastApiCallLength.current < CHAR_THRESHOLD && !isFinal) {
      return;
    }

    setError('');
    setLoading(true);
    if (!isFinal) {
      setLlmText(llmText + '...');
    } else {
      setLlmText('Processing final notes...');
    }

    try {
      const res = await fetch("http://localhost:5002/api/process_notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic, notes: userText, tone: tone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      
      setLlmResponseData(data); // Store the full response
      let newLlmText = data.expandedNotes || '';

      if (isFinal) {
        if (data.important && data.important.length > 0) {
          newLlmText += '\n\n**Important Points:**\n';
          data.important.forEach(point => {
            newLlmText += `- ${point}\n`;
          });
        }
        if (data.explain && data.explain.length > 0) {
          newLlmText += '\n\n**Further Explanation:**\n';
          data.explain.forEach(item => {
            newLlmText += `- ${item}\n`;
          });
        }
      }

      setLlmText(newLlmText);
      lastApiCallLength.current = userText.length;
    } catch (error) {
      console.error(error);
      setError(error.message);
      setLlmText('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserTextChange = (text) => {
    setUserText(text);
    if (!isFinished) {
      getLlmUpdate();
    }
  };

  const handleFinish = () => {
    setIsFinished(true);
    getLlmUpdate(true);
  };

  const handleSaveNote = () => {
    if (llmText.trim() !== '' && !loading) {
      const newNote = {
        id: Date.now(),
        topic: topic || 'Untitled',
        tone: tone,
        userScribbles: userText,
        generatedNotes: llmText,
        tasks: llmResponseData?.tasks || [],
        meeting: llmResponseData?.meeting || [],
        createdAt: new Date().toISOString(),
        editedAt: new Date().toISOString(),
      };
      const updatedNotes = [...savedNotes, newNote];
      setSavedNotes(updatedNotes);
      localStorage.setItem('savedNotes', JSON.stringify(updatedNotes));
      
      // Transition to display view
      setActiveNote(newNote);
      setViewMode('display');
    }
  };

  const handleDeleteNote = (id) => {
    const updatedNotes = savedNotes.filter(note => note.id !== id);
    setSavedNotes(updatedNotes);
    localStorage.setItem('savedNotes', JSON.stringify(updatedNotes));
  };

  const handleCreateNewNote = () => {
    setTopic('');
    setUserText('');
    setLlmText('');
    setIsFinished(false);
    setLlmResponseData(null);
    setActiveNote(null);
    setViewMode('edit');
  };

  const canFinish = userText.length >= 100;
  const canSave = isFinished && llmText.trim() !== '' && !loading;

  const renderEditView = () => (
    <>
      <div className="top-controls">
        <header className="App-header">
          <h1>ScribeSence</h1>
        </header>
        <div className="input-row">
          <input
            type="text"
            className="topic-input"
            placeholder="Enter your topic here..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <select className="tone-select" value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="lecture">Class Lecture</option>
            <option value="formal-meeting">Formal Meeting</option>
            <option value="informal-meeting">Informal Meeting</option>
            <option value="scientific-talk">Scientific Talk</option>
            <option value="business-plan">Business Plan</option>
          </select>
        </div>
      </div>
      <div className="text-boxes-container">
        <div className="text-box-wrapper">
          <UserTextBox value={userText} onChange={handleUserTextChange} />
          <div className="button-wrapper" title={!canFinish ? "Please type more for response" : ""}>
            <button 
              className="convert-button" 
              onClick={handleFinish} 
              disabled={!canFinish || loading}
            >
              {loading && !isFinished ? 'Processing...' : 'Finish'}
            </button>
          </div>
        </div>
        <div className={`text-box-wrapper ${loading ? 'loading-llm' : ''}`}>
          <LlmTextBox value={llmText} onChange={setLlmText} />
          <div className="button-wrapper" title={!canSave ? "There is nothing to save" : ""}>
            <button 
              className="save-button" 
              onClick={handleSaveNote} 
              disabled={!canSave}
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
      {loading && <p className="loading-message">Generating intelligent notes...</p>}
      {error && <p className="error-message">Error: {error}</p>}
    </>
  );

  const renderDisplayView = () => (
    <div className="display-view">
      <header className="App-header">
        <h1>{activeNote.topic}</h1>
      </header>
      <div className="note-content">
        <h2>Generated Notes</h2>
        <pre>{activeNote.generatedNotes}</pre>
      </div>
      <div className="suggestions">
        <h2>Intelligent Suggestions</h2>
        {activeNote.tasks && activeNote.tasks.length > 0 && (
          <div className="suggestion-item">
            <p>Do you want to create reminders for these tasks?</p>
            <ul>
              {activeNote.tasks.map((task, index) => <li key={index}>{task}</li>)}
            </ul>
          </div>
        )}
        {activeNote.meeting && activeNote.meeting.length > 0 && (
          <div className="suggestion-item">
            <p>Do you want to schedule a meeting with this information?</p>
            <ul>
              {activeNote.meeting.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </div>
        )}
        {(!activeNote.tasks || activeNote.tasks.length === 0) && (!activeNote.meeting || activeNote.meeting.length === 0) && (
          activeNote.tone === 'lecture' ? (
            <div className="suggestion-item interactive-buttons">
              <p>Would you like to generate learning materials?</p>
              <button className="suggestion-button">Create Quiz</button>
              <button className="suggestion-button">Create Flashcards</button>
            </div>
          ) : <p>No suggestions available.</p>
        )}
      </div>
      <button className="new-note-button" onClick={handleCreateNewNote}>
        Make a New Note
      </button>
    </div>
  );

  const handleSelectNote = (note) => {
    setActiveNote(note);
    setViewMode('display');
  };

  return (
    <div className="app-container">
      <SavedNotesPane 
        savedNotes={savedNotes} 
        onDeleteNote={handleDeleteNote}
        onSelectNote={handleSelectNote}
        selectedNoteId={activeNote?.id}
      />
      <div className="main-content">
        {viewMode === 'edit' ? renderEditView() : renderDisplayView()}
      </div>
    </div>
  );
}

export default App;
