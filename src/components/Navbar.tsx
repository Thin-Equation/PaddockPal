'use client';

import React from 'react';

interface NavbarProps {
  darkMode: boolean;
  toggleTheme: () => void;
}

export default function Navbar({ darkMode, toggleTheme }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="navbar-header">
        <h1>PaddockPal</h1>
        <div className="theme-toggle">
          <button 
            id="themeToggle" 
            className={`theme-toggle-button ${darkMode ? 'dark' : ''}`}
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            <span className="material-icons">
              {darkMode ? 'dark_mode' : 'light_mode'}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}