import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

const DarkModeToggle: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 group">
      <button
        onClick={toggleDarkMode}
        className="flex items-center space-x-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
        aria-label="Toggle dark mode"
      >
        {/* Minimized state - just the toggle switch */}
        <div className="flex items-center space-x-2 p-2">
          <Sun className={`w-4 h-4 transition-colors duration-200 ${!isDarkMode ? 'text-yellow-500' : 'text-gray-400'}`} />
          <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
          <Moon className={`w-4 h-4 transition-colors duration-200 ${isDarkMode ? 'text-blue-400' : 'text-gray-400'}`} />
        </div>
        
        {/* Expanded state - appears on hover */}
        <div className="hidden group-hover:flex items-center space-x-2 px-3 py-2 border-l border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            {isDarkMode ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>
      </button>
    </div>
  );
};

export default DarkModeToggle;
