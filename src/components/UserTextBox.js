import React from 'react';

const UserTextBox = ({ value, onChange }) => {
  return (
    <div className="user-text-box-wrapper">
      <textarea
        className="user-text-box"
        placeholder="Enter your notes here..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="char-counter">{value.length} characters</div>
    </div>
  );
};

export default UserTextBox;
