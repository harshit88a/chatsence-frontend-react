import React from 'react';

const LlmTextBox = ({ value, onChange }) => {
  return (
    <textarea
      className="ai-text-area"
      placeholder="AI notes will appear here..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default LlmTextBox;
