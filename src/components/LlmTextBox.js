import React from 'react';

const LlmTextBox = ({ value, onChange }) => {
  return (
    <textarea
      className="llm-text-box"
      placeholder="AI generated text will appear here..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default LlmTextBox;
