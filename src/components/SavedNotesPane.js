import React from 'react';

const SavedNotesPane = ({ savedNotes, onDeleteNote, onSelectNote, selectedNoteId }) => {
  return (
    <div className="saved-notes-pane">
      <h2>Saved Notes</h2>
      <ul>
        {savedNotes.map((note) => (
          <li 
            key={note.id} 
            className={`note-item ${selectedNoteId === note.id ? 'selected' : ''}`}
            onClick={() => onSelectNote(note)}
          >
            <div className="note-info">
              <span className="note-topic">{note.topic}</span>
              <span className="note-date">{new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
            <button 
              className="delete-note-button" 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteNote(note.id);
              }}
            >
              &times;
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SavedNotesPane;
