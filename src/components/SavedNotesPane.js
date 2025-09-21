import React, { useState, useMemo } from 'react';

const SavedNotesPane = ({ savedNotes, onDeleteNote, onSelectNote, selectedNoteId, collapsed, onToggleCollapse }) => {
  const [expandedSubjects, setExpandedSubjects] = useState(new Set(['Machine Learning', 'Mathematics', 'Physics']));

  // Group notes by subject/tone
  const groupedNotes = useMemo(() => {
    const groups = {};
    
    savedNotes.forEach(note => {
      let subject;
      
      // Map tones to subjects for better organization
      switch(note.tone) {
        case 'lecture':
          // Try to extract subject from topic or default to 'Machine Learning'
          if (note.topic.toLowerCase().includes('ml') || note.topic.toLowerCase().includes('machine')) {
            subject = 'Machine Learning';
          } else if (note.topic.toLowerCase().includes('math')) {
            subject = 'Mathematics';
          } else if (note.topic.toLowerCase().includes('physics')) {
            subject = 'Physics';
          } else {
            subject = 'General Lectures';
          }
          break;
        case 'formal-meeting':
        case 'informal-meeting':
          subject = 'Meetings';
          break;
        case 'business-plan':
          subject = 'Business';
          break;
        case 'scientific-talk':
          subject = 'Research';
          break;
        default:
          subject = 'General';
      }
      
      if (!groups[subject]) {
        groups[subject] = [];
      }
      groups[subject].push(note);
    });

    // Sort notes within each subject by date (newest first)
    Object.keys(groups).forEach(subject => {
      groups[subject].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });

    return groups;
  }, [savedNotes]);

  const toggleSubject = (subject) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject)) {
      newExpanded.delete(subject);
    } else {
      newExpanded.add(subject);
    }
    setExpandedSubjects(newExpanded);
  };

  const getSubjectIcon = (subject) => {
    switch(subject) {
      case 'Machine Learning': return '🤖';
      case 'Mathematics': return '📐';
      case 'Physics': return '⚛️';
      case 'Business': return '💼';
      case 'Meetings': return '👥';
      case 'Research': return '🔬';
      default: return '📁';
    }
  };

  return (
    <div className={`saved-notes-pane ${collapsed ? 'collapsed' : ''}`}>
      <div className="files-header">
        <h2>Files</h2>
        <button 
          className="panel-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand Files' : 'Collapse Files'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>
      
      <div className="files-content">
        <div className="file-tree">
          {Object.keys(groupedNotes).length === 0 ? (
            <p style={{ 
              color: '#9ca3af', 
              fontSize: '13px', 
              textAlign: 'center', 
              marginTop: '40px',
              padding: '0 16px'
            }}>
              No saved notes yet
            </p>
          ) : (
            Object.entries(groupedNotes).map(([subject, notes]) => (
              <div key={subject} className={`subject-folder ${expandedSubjects.has(subject) ? 'expanded' : ''}`}>
                <div className="subject-header" onClick={() => toggleSubject(subject)}>
                  <span className="subject-icon">▶</span>
                  <span className="subject-emoji">{getSubjectIcon(subject)}</span>
                  <span className="subject-name">{subject}</span>
                  <span className="note-count">({notes.length})</span>
                </div>
                
                {expandedSubjects.has(subject) && (
                  <ul className="lecture-list">
                    {notes.map((note) => (
                      <li 
                        key={note.id} 
                        className={`note-item ${selectedNoteId === note.id ? 'selected' : ''}`}
                        onClick={() => onSelectNote(note)}
                      >
                        <div className="note-info">
                          <div className="note-topic">{note.topic || 'Untitled'}</div>
                          <div className="note-date">{new Date(note.createdAt).toLocaleDateString()}</div>
                        </div>
                        <button 
                          className="delete-note-button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(note.id);
                          }}
                          title="Delete note"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
        
        <button className="add-subject-button">
          + Add Subject
        </button>
      </div>
    </div>
  );
};

export default SavedNotesPane;
