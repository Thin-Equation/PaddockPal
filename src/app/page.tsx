'use client';

import React, { useState, useEffect } from 'react';
import ChatUI from '@/components/ChatUI';
import Navbar from '@/components/Navbar';

export default function Home() {
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Check for system preference or saved preference on component mount
  useEffect(() => {
    const savedPreference = localStorage.getItem('darkMode');
    if (savedPreference !== null) {
      setDarkMode(savedPreference === 'true');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  // Update body class when darkMode changes
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
  };

  return (
    <div className="app-container">
      <Navbar darkMode={darkMode} toggleTheme={toggleTheme} />
      <main className="main-content">
        <ChatUI />
        <div className="disclaimer-container">
          <p className="ai-disclaimer">AI responses may contain inaccuracies. Please verify important information from official Formula 1 sources.</p>
          <div className="copyright">
            <p>© 2025 PaddockPal. All rights reserved.</p>
            <p>Formula 1, F1 and related marks are trademarks of Formula One Licensing BV.</p>
          </div>
        </div>
      </main>
    </div>
  );
}