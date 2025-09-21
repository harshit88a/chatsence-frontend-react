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

  // Auto-save functionality
  const [autoSaveTimeout, setAutoSaveTimeout] = useState(null);

  // Collapsible panels state
  const [filesCollapsed, setFilesCollapsed] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);

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

  // Auto-save when user stops typing
  useEffect(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    if (userText.length > 100 && isFinished && llmText.trim() !== '' && !loading) {
      const timeout = setTimeout(() => {
        handleAutoSave();
      }, 2000); // Auto-save after 2 seconds of inactivity
      
      setAutoSaveTimeout(timeout);
    }

    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [userText, llmText, isFinished]);

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

  const handleAutoSave = () => {
    if (llmText.trim() !== '' && !loading && !savedNotes.find(note => 
      note.topic === (topic || 'Untitled') && 
      note.userScribbles === userText &&
      note.generatedNotes === llmText
    )) {
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
    }
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

  // Count words in text
  const countWords = (text) => {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  };

  // Formatting states
  const [boldActive, setBoldActive] = useState(false);
  const [italicActive, setItalicActive] = useState(false);
  const [underlineActive, setUnderlineActive] = useState(false);

  // Text formatting functions
  const handleFormat = (type) => {
    switch(type) {
      case 'bold':
        setBoldActive(!boldActive);
        break;
      case 'italic':
        setItalicActive(!italicActive);
        break;
      case 'underline':
        setUnderlineActive(!underlineActive);
        break;
      case 'bullet':
        // Add bullet point at current cursor position
        const bulletText = userText + '\n• ';
        setUserText(bulletText);
        break;
      case 'number':
        // Add numbered list at current cursor position
        const numberText = userText + '\n1. ';
        setUserText(numberText);
        break;
      default:
        break;
    }
  };

  const renderEditView = () => (
    <div className="three-panel-container">
      {/* Student Notes Panel */}
      <div className="student-notes-panel">
        <div className="panel-header">
          <h2 className="panel-title">Student Notes</h2>
          <div className="word-count">{countWords(userText)} words</div>
        </div>
        
        {/* Topic and Tone Controls moved to top */}
        <div className="controls-section" style={{borderBottom: '1px solid #f3f4f6', borderTop: 'none'}}>
          <input
            type="text"
            className="control-input"
            placeholder="Enter your topic here..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <select 
            className="control-input"
            value={tone} 
            onChange={(e) => setTone(e.target.value)}
          >
            <option value="lecture">Class Lecture</option>
            <option value="formal-meeting">Formal Meeting</option>
            <option value="informal-meeting">Informal Meeting</option>
            <option value="scientific-talk">Scientific Talk</option>
            <option value="business-plan">Business Plan</option>
          </select>
        </div>
        
        <div className="formatting-toolbar">
          <button 
            className={`format-button ${boldActive ? 'active' : ''}`}
            onClick={() => handleFormat('bold')}
            title="Bold"
          >
            B
          </button>
          <button 
            className={`format-button ${italicActive ? 'active' : ''}`}
            onClick={() => handleFormat('italic')}
            title="Italic"
          >
            I
          </button>
          <button 
            className={`format-button ${underlineActive ? 'active' : ''}`}
            onClick={() => handleFormat('underline')}
            title="Underline"
          >
            U
          </button>
          <button 
            className="format-button"
            onClick={() => handleFormat('bullet')}
            title="Bullet List"
          >
            •
          </button>
          <button 
            className="format-button"
            onClick={() => handleFormat('number')}
            title="Numbered List"
          >
            1.
          </button>
        </div>
        
        <div className="panel-content">
          <textarea
            className="student-text-area"
            placeholder="Start typing your notes here..."
            value={userText}
            onChange={(e) => handleUserTextChange(e.target.value)}
          />
          
          <div className="tips-section">
            <div className="tips-title">Tips:</div>
            <ul className="tips-list">
              <li>Type quick fragments or shorthand</li>
              <li>Use line breaks to separate different ideas</li>
              <li>The AI will enhance your notes in real-time</li>
            </ul>
          </div>
        </div>
        
        <div className="controls-section">
          <button 
            className="primary-button" 
            onClick={handleFinish} 
            disabled={!canFinish || loading}
          >
            {loading && !isFinished ? 'Processing...' : 'Finish'}
          </button>
        </div>
      </div>

      {/* AI Notes Panel */}
      <div className="ai-notes-panel">
        <div className="ai-panel-header">
          <div>
            <h2 className="panel-title">AI Notes</h2>
            <div className="word-count">{countWords(llmText)} enhanced notes</div>
          </div>
          <div className="ai-panel-actions">
            <button className="action-button">
              <span>📤</span> Upload Slides
            </button>
            <button className="action-button">
              <span>📥</span> Export
            </button>
          </div>
        </div>
        
        <div className="panel-content">
          {loading ? (
            <div className="loading-indicator">
              <div className="loading-spinner"></div>
              Generating intelligent notes...
            </div>
          ) : (
            <textarea
              className="ai-text-area"
              placeholder="AI notes will appear here..."
              value={llmText}
              readOnly
            />
          )}
        </div>
        
        <div className="controls-section">
          <button 
            className="secondary-button" 
            onClick={handleSaveNote} 
            disabled={!canSave}
          >
            Save Note
          </button>
        </div>
      </div>

      {/* Smart Suggestions Panel */}
      <div className={`smart-suggestions-panel ${suggestionsCollapsed ? 'collapsed' : ''}`}>
        <div className="suggestions-header">
          <h2 className="panel-title">Smart Suggestions</h2>
          <button 
            className="suggestions-toggle"
            onClick={() => setSuggestionsCollapsed(!suggestionsCollapsed)}
          >
            {suggestionsCollapsed ? '◀' : '▶'}
          </button>
        </div>
        
        <div className="suggestions-content">
          {llmResponseData ? (
            <>
              {llmResponseData.tasks && llmResponseData.tasks.length > 0 && (
                <div className="suggestion-item">
                  <h3>Tasks & Reminders</h3>
                  <p>Do you want to create reminders for these tasks?</p>
                  <ul>
                    {llmResponseData.tasks.map((task, index) => <li key={index}>{task}</li>)}
                  </ul>
                  <button className="suggestion-button">Create Reminders</button>
                </div>
              )}
              
              {llmResponseData.meeting && llmResponseData.meeting.length > 0 && (
                <div className="suggestion-item">
                  <h3>Meeting Information</h3>
                  <p>Do you want to schedule a meeting with this information?</p>
                  <ul>
                    {llmResponseData.meeting.map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
                  <button className="suggestion-button">Schedule Meeting</button>
                </div>
              )}
              
              {(!llmResponseData.tasks || llmResponseData.tasks.length === 0) && 
               (!llmResponseData.meeting || llmResponseData.meeting.length === 0) && 
               tone === 'lecture' && (
                <div className="suggestion-item">
                  <h3>Learning Materials</h3>
                  <p>Would you like to generate learning materials?</p>
                  <button className="suggestion-button">Create Quiz</button>
                  <button className="suggestion-button">Create Flashcards</button>
                </div>
              )}
            </>
          ) : (
            <div className="suggestions-empty">
              <p>No suggestions yet</p>
              <p>Keep typing to get smart suggestions</p>
            </div>
          )}
        </div>
      </div>
      
      {error && <div className="error-message">Error: {error}</div>}
    </div>
  );

  const renderDisplayView = () => (
    <div className="display-view">
      <div className="display-header">
        <h1 className="display-title">{activeNote.topic}</h1>
        <p className="display-meta">
          Created on {new Date(activeNote.createdAt).toLocaleDateString()} • {activeNote.tone}
        </p>
      </div>
      
      <div className="display-content">
        <h2>Generated Notes</h2>
        <pre>{activeNote.generatedNotes}</pre>
      </div>
      
      <div className="display-suggestions">
        <h2>Intelligent Suggestions</h2>
        {activeNote.tasks && activeNote.tasks.length > 0 && (
          <div className="suggestion-item">
            <h3>Tasks & Reminders</h3>
            <p>Do you want to create reminders for these tasks?</p>
            <ul>
              {activeNote.tasks.map((task, index) => <li key={index}>{task}</li>)}
            </ul>
            <button className="suggestion-button">Create Reminders</button>
          </div>
        )}
        {activeNote.meeting && activeNote.meeting.length > 0 && (
          <div className="suggestion-item">
            <h3>Meeting Information</h3>
            <p>Do you want to schedule a meeting with this information?</p>
            <ul>
              {activeNote.meeting.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
            <button className="suggestion-button">Schedule Meeting</button>
          </div>
        )}
        {(!activeNote.tasks || activeNote.tasks.length === 0) && 
         (!activeNote.meeting || activeNote.meeting.length === 0) && (
          activeNote.tone === 'lecture' ? (
            <div className="suggestion-item">
              <h3>Learning Materials</h3>
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
      <header className="App-header">
        <div className="header-left">
          <div className="logo-container">
            <div className="logo-icon">S</div>
            <h1>ScribeSense</h1>
          </div>
        </div>
        
        <div className="header-center">
          {topic && (
            <p className="topic-display">
              {tone === 'lecture' && topic.toLowerCase().includes('ml') ? 'Machine Learning - ' : ''}
              {topic}
            </p>
          )}
        </div>
        
        <div className="header-right">
          <button 
            className={`smart-suggestions-toggle ${!suggestionsCollapsed ? 'active' : ''}`}
            onClick={() => setSuggestionsCollapsed(!suggestionsCollapsed)}
          >
            <span className="bulb-icon">💡</span>
            Smart Suggestions
          </button>
        </div>
      </header>
      
      <div className="main-layout">
        <SavedNotesPane 
          savedNotes={savedNotes} 
          onDeleteNote={handleDeleteNote}
          onSelectNote={handleSelectNote}
          selectedNoteId={activeNote?.id}
          collapsed={filesCollapsed}
          onToggleCollapse={() => setFilesCollapsed(!filesCollapsed)}
        />
        <div className="main-content">
          {viewMode === 'edit' ? renderEditView() : renderDisplayView()}
        </div>
      </div>
    </div>
  );
}

export default App;
