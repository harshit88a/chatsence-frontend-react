import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import UserTextBox from './components/UserTextBox';
import LlmTextBox from './components/LlmTextBox';
import SavedNotesPane from './components/SavedNotesPane';

const WORD_THRESHOLD = 50;

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

  // Function to create Google Calendar URL
  const createGoogleCalendarUrl = (meetingDetails) => {
    // Parse meeting details from the LLM response
    const parseMeetingInfo = (details) => {
      let title = topic || 'Meeting';
      let description = '';
      let startTime = null;
      let endTime = null;
      let location = '';
      let duration = 60; // Default duration in minutes

      console.log('🔍 Parsing meeting details:', details);

      // Helper function to convert month names to numbers
      const getMonthNumber = (monthStr) => {
        const months = {
          'january': 1, 'jan': 1,
          'february': 2, 'feb': 2,
          'march': 3, 'mar': 3,
          'april': 4, 'apr': 4,
          'may': 5,
          'june': 6, 'jun': 6,
          'july': 7, 'jul': 7,
          'august': 8, 'aug': 8,
          'september': 9, 'sep': 9, 'sept': 9,
          'october': 10, 'oct': 10,
          'november': 11, 'nov': 11,
          'december': 12, 'dec': 12
        };
        return months[monthStr.toLowerCase()] || 1;
      };

      // Helper function to convert written numbers to digits
      const convertWrittenNumbers = (str) => {
        const numberMap = {
          'first': '1st', 'second': '2nd', 'third': '3rd', 'fourth': '4th', 'fifth': '5th',
          'sixth': '6th', 'seventh': '7th', 'eighth': '8th', 'ninth': '9th', 'tenth': '10th',
          'eleventh': '11th', 'twelfth': '12th', 'thirteenth': '13th', 'fourteenth': '14th',
          'fifteenth': '15th', 'sixteenth': '16th', 'seventeenth': '17th', 'eighteenth': '18th',
          'nineteenth': '19th', 'twentieth': '20th', 'twenty-first': '21st', 'twenty-second': '22nd',
          'twenty-third': '23rd', 'twenty-fourth': '24th', 'twenty-fifth': '25th', 'twenty-sixth': '26th',
          'twenty-seventh': '27th', 'twenty-eighth': '28th', 'twenty-ninth': '29th', 'thirtieth': '30th',
          'thirty-first': '31st',
          'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7',
          'eight': '8', 'nine': '9', 'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
          'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17', 'eighteen': '18',
          'nineteen': '19', 'twenty': '20'
        };

        let result = str.toLowerCase();
        Object.keys(numberMap).forEach(word => {
          result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), numberMap[word]);
        });
        return result;
      };

      // Extract information from meeting details array
      details.forEach((detail, index) => {
        const lowerDetail = detail.toLowerCase();
        console.log(`📝 Processing detail ${index}: "${detail}"`);

        // Extract title/subject
        if (lowerDetail.includes('subject:') || lowerDetail.includes('title:') || lowerDetail.includes('meeting:')) {
          title = detail.split(':')[1]?.trim() || title;
          console.log(`📋 Found title: ${title}`);
        }

        // Extract date and time - look for date indicators more broadly
        if (lowerDetail.includes('date:') || lowerDetail.includes('time:') || lowerDetail.includes('when:') ||
          lowerDetail.includes('scheduled:') || lowerDetail.includes('on:') ||
          // Also check if the entire detail contains date-like words without colons
          lowerDetail.includes('today') || lowerDetail.includes('tomorrow') ||
          lowerDetail.includes('monday') || lowerDetail.includes('tuesday') || lowerDetail.includes('wednesday') ||
          lowerDetail.includes('thursday') || lowerDetail.includes('friday') || lowerDetail.includes('saturday') || lowerDetail.includes('sunday') ||
          lowerDetail.includes('jan') || lowerDetail.includes('feb') || lowerDetail.includes('mar') ||
          lowerDetail.includes('apr') || lowerDetail.includes('may') || lowerDetail.includes('jun') ||
          lowerDetail.includes('jul') || lowerDetail.includes('aug') || lowerDetail.includes('sep') ||
          lowerDetail.includes('oct') || lowerDetail.includes('nov') || lowerDetail.includes('dec') ||
          lowerDetail.includes('january') || lowerDetail.includes('february') || lowerDetail.includes('march') ||
          lowerDetail.includes('april') || lowerDetail.includes('june') || lowerDetail.includes('july') ||
          lowerDetail.includes('august') || lowerDetail.includes('september') || lowerDetail.includes('october') ||
          lowerDetail.includes('november') || lowerDetail.includes('december')) {

          // Use the full detail if it doesn't contain a colon, otherwise use the part after the colon
          const dateStr = detail.includes(':') ? detail.split(':')[1]?.trim() : detail.trim();
          console.log(`📅 Found potential date string: "${dateStr}"`);

          if (dateStr) {
            let parsedDate = null;

            // Convert written numbers first
            const normalizedDateStr = convertWrittenNumbers(dateStr);
            console.log(`🔄 Normalized date string: "${normalizedDateStr}"`);

            // Try direct parsing first
            parsedDate = new Date(normalizedDateStr);
            console.log(`🎯 Direct parsing result: ${parsedDate}, Valid: ${!isNaN(parsedDate.getTime())}`);

            if (isNaN(parsedDate.getTime())) {
              // Handle relative dates
              const today = new Date();
              const lowerNormalized = normalizedDateStr.toLowerCase();

              console.log(`🔍 Checking relative dates for: "${lowerNormalized}"`);

              if (lowerNormalized.includes('today')) {
                parsedDate = new Date(today);
                console.log(`📅 Set to today: ${parsedDate}`);
              } else if (lowerNormalized.includes('tomorrow')) {
                parsedDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
                console.log(`📅 Set to tomorrow: ${parsedDate}`);
              } else if (lowerNormalized.includes('yesterday')) {
                parsedDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                console.log(`📅 Set to yesterday: ${parsedDate}`);
              } else if (lowerNormalized.includes('next week')) {
                parsedDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                console.log(`📅 Set to next week: ${parsedDate}`);
              } else if (lowerNormalized.includes('next month')) {
                parsedDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
                console.log(`📅 Set to next month: ${parsedDate}`);
              } else {
                // Handle day names (next friday, this monday, etc.)
                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const foundDay = dayNames.find(day => lowerNormalized.includes(day));

                if (foundDay) {
                  console.log(`📅 Found day name: ${foundDay}`);
                  const targetDay = dayNames.indexOf(foundDay);
                  const currentDay = today.getDay();
                  let daysUntilTarget = targetDay - currentDay;

                  if (lowerNormalized.includes('next')) {
                    if (daysUntilTarget <= 0) daysUntilTarget += 7;
                  } else if (lowerNormalized.includes('last')) {
                    if (daysUntilTarget >= 0) daysUntilTarget -= 7;
                  } else if (daysUntilTarget < 0) {
                    daysUntilTarget += 7; // Default to next occurrence
                  }

                  parsedDate = new Date(today.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000);
                  console.log(`📅 Set to ${foundDay}: ${parsedDate} (${daysUntilTarget} days from now)`);
                }
              }
            }

            // If still no luck, try more specific patterns
            if (isNaN(parsedDate.getTime())) {
              console.log(`🔍 Trying pattern matching for: "${normalizedDateStr}"`);

              const datePatterns = [
                // Month name patterns: "October 5th, 2024"
                /(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2}(?:st|nd|rd|th)?),?\s*(\d{4})?/i,
                // Short month patterns: "Oct 5", "Dec 25th"  
                /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}(?:st|nd|rd|th)?)/i,
                // Day first patterns: "5th October", "25 Dec"
                /(\d{1,2}(?:st|nd|rd|th)?)\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)/i,
                // Numeric date patterns
                /(\d{1,2})[\/\-\.]\s*(\d{1,2})[\/\-\.]\s*(\d{2,4})/,
                /(\d{4})[\/\-\.]\s*(\d{1,2})[\/\-\.]\s*(\d{1,2})/
              ];

              for (let i = 0; i < datePatterns.length; i++) {
                const pattern = datePatterns[i];
                const match = normalizedDateStr.match(pattern);
                console.log(`🔍 Pattern ${i} match:`, match);

                if (match) {
                  let testDate;

                  if (i === 0 || i === 1) {
                    // Month name first: "October 5th" or "Oct 5"
                    const monthStr = match[1];
                    const day = parseInt(match[2]);
                    const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();

                    testDate = new Date(year, getMonthNumber(monthStr) - 1, day);
                    console.log(`📅 Month-day pattern: ${monthStr} ${day}, ${year} → ${testDate}`);
                  } else if (i === 2) {
                    // Day first: "5th October"
                    const day = parseInt(match[1]);
                    const monthStr = match[2];
                    const year = new Date().getFullYear();

                    testDate = new Date(year, getMonthNumber(monthStr) - 1, day);
                    console.log(`📅 Day-month pattern: ${day} ${monthStr} → ${testDate}`);
                  } else if (i === 3) {
                    // Numeric: "10/5/2024" 
                    const part1 = parseInt(match[1]);
                    const part2 = parseInt(match[2]);
                    const part3 = parseInt(match[3]);

                    // Assume MM/DD/YYYY format
                    testDate = new Date(part3, part1 - 1, part2);
                    console.log(`📅 Numeric pattern MM/DD/YYYY: ${part1}/${part2}/${part3} → ${testDate}`);
                  } else if (i === 4) {
                    // Year first: "2024/10/5"
                    const year = parseInt(match[1]);
                    const month = parseInt(match[2]);
                    const day = parseInt(match[3]);

                    testDate = new Date(year, month - 1, day);
                    console.log(`📅 Year-first pattern: ${year}/${month}/${day} → ${testDate}`);
                  }

                  if (testDate && !isNaN(testDate.getTime())) {
                    parsedDate = testDate;
                    console.log(`✅ Successfully parsed date: ${parsedDate}`);
                    break;
                  }
                }
              }
            }

            // Extract time if present and combine with date
            const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?|(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)/i;
            const timeMatch = normalizedDateStr.match(timePattern);

            if (timeMatch && parsedDate && !isNaN(parsedDate.getTime())) {
              let hours = parseInt(timeMatch[1] || timeMatch[4]);
              let minutes = parseInt(timeMatch[2]) || 0;
              const ampm = (timeMatch[3] || timeMatch[5] || '').toLowerCase().replace(/\./g, '');

              if (ampm === 'pm' && hours !== 12) hours += 12;
              if (ampm === 'am' && hours === 12) hours = 0;

              parsedDate.setHours(hours, minutes, 0, 0);
              console.log(`🕐 Added time ${hours}:${minutes} ${ampm} → ${parsedDate}`);
            }

            if (parsedDate && !isNaN(parsedDate.getTime())) {
              startTime = parsedDate;
              console.log(`✅ Final parsed start time: ${startTime}`);
            } else {
              console.log(`❌ Failed to parse date from: "${dateStr}"`);
            }
          }
        }

        // Extract duration
        if (lowerDetail.includes('duration:') || lowerDetail.includes('length:')) {
          const durationStr = detail.split(':')[1]?.trim();
          console.log(`⏱️ Found duration string: "${durationStr}"`);

          if (durationStr) {
            // Extract number from duration string
            const durationMatch = durationStr.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
            if (durationMatch) {
              const num = parseInt(durationMatch[1]);
              const unit = durationMatch[2].toLowerCase();
              if (unit.includes('hour') || unit.includes('hr')) {
                duration = num * 60;
              } else {
                duration = num;
              }
              console.log(`⏱️ Parsed duration: ${duration} minutes`);
            } else {
              // Just extract the first number if no unit specified
              const numMatch = durationStr.match(/\d+/);
              if (numMatch) {
                duration = parseInt(numMatch[0]);
                console.log(`⏱️ Parsed duration (no unit): ${duration} minutes`);
              }
            }
          }
        }

        // Extract location
        if (lowerDetail.includes('location:') || lowerDetail.includes('venue:') || lowerDetail.includes('where:') || lowerDetail.includes('room:')) {
          location = detail.split(':')[1]?.trim() || '';
          console.log(`📍 Found location: "${location}"`);
        }

        // Use as description if no specific field identified
        if (!lowerDetail.includes(':')) {
          description += detail + '\n';
          console.log(`📝 Added to description: "${detail}"`);
        }
      });

      // If no specific date was found, default to current date but show a warning
      if (!startTime) {
        startTime = new Date();
        console.warn('⚠️ No specific date found in meeting details, using current date');
        description = `Note: No specific date was provided in meeting details.\n\n${description}`;
      }

      // Calculate end time based on start time and duration
      endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      console.log(`📊 Final parsing results:
        Title: ${title}
        Start: ${startTime}
        End: ${endTime} 
        Duration: ${duration} minutes
        Location: ${location}
        Description: ${description.substring(0, 100)}...`);

      return { title, description, startTime, endTime, location };
    };

    const { title, description, startTime, endTime, location } = parseMeetingInfo(meetingDetails);

    // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
    const formatGoogleCalendarDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    // Build Google Calendar URL
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatGoogleCalendarDate(startTime)}/${formatGoogleCalendarDate(endTime)}`,
      details: `${description.trim()}\n\nGenerated from ScribeSense notes`,
      location: location,
      sf: 'true',
      output: 'xml'
    });

    return `${baseUrl}?${params.toString()}`;
  };

  // Handle schedule meeting button click - opens Google Calendar
  // Handle create reminders button click
  const handleCreateReminders = (tasks) => {
    if (!tasks || tasks.length === 0) {
      alert('No tasks available to create reminders.');
      return;
    }
    // For now, just show a success message (could integrate with a calendar/reminder API)
    alert(`Reminders created for tasks:\n${tasks.join('\n')}`);
    console.log('Reminders created for tasks:', tasks);
  }

  const handleScheduleMeeting = (meetingDetails) => {
    if (!meetingDetails || meetingDetails.length === 0) {
      alert('No meeting details available to schedule.');
      return;
    }

    try {
      const googleCalendarUrl = createGoogleCalendarUrl(meetingDetails);

      // Open Google Calendar in a new tab
      window.open(googleCalendarUrl, '_blank', 'noopener,noreferrer');

      // Optional: Show success message
      console.log('Opening Google Calendar with meeting details...');
    } catch (error) {
      console.error('Error creating Google Calendar link:', error);
      alert('Error opening Google Calendar. Please try again.');
    }
  };

  const getLlmUpdate = async (isFinal = false) => {
    const wordCount = userText.trim().split(/\s+/).length;
    if (wordCount - lastApiCallLength.current < WORD_THRESHOLD && !isFinal) {
      return;
    }

    setError('');
    setLoading(true);
    if (!isFinal) {
      setLlmText(llmText + '...');
      lastApiCallLength.current = wordCount;
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
    switch (type) {
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
        <div className="controls-section" style={{ borderBottom: '1px solid #f3f4f6', borderTop: 'none' }}>
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
              onChange={e => setLlmText(e.target.value)}
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
                  <button
                    className="suggestion-button"
                    onClick={() => handleScheduleMeeting(llmResponseData.meeting)}
                  >
                    Schedule Meeting
                  </button>
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
            <button
              className="suggestion-button"
              onClick={() => handleCreateReminders(activeNote.tasks)}
            >
              Create Reminders
            </button>
          </div>
        )}
        {activeNote.meeting && activeNote.meeting.length > 0 && (
          <div className="suggestion-item">
            <h3>Meeting Information</h3>
            <p>Do you want to schedule a meeting with this information?</p>
            <ul>
              {activeNote.meeting.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
            <button
              className="suggestion-button"
              onClick={() => handleScheduleMeeting(activeNote.meeting)}
            >
              Schedule Meeting
            </button>
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