import React from 'react';

const LlmTextBox = ({ value, onChange }) => {
  return (
    <textarea
      className="ai-text-area"
      placeholder="AI notes will appear here..."
      value={value}
      readOnly
    />
  );
};

export default LlmTextBox;
