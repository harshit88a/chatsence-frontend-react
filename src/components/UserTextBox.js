import React from 'react';

const UserTextBox = ({ value, onChange }) => {
  return (
    <textarea
      className="student-text-area"
      placeholder="Start typing your notes here..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export default UserTextBox;
