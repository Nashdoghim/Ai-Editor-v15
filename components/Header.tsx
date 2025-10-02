import React from 'react';

const ExportIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 mr-1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-4 h-14 bg-slate-900/30 backdrop-blur-lg border-b border-white/5 shadow-md z-10 flex-shrink-0">
      <h1 className="text-md font-medium text-slate-200">Video Editor</h1>
      <button className="flex items-center justify-center text-sm font-bold bg-white text-black px-4 py-2 rounded-md hover:bg-slate-200 transition-colors duration-200">
        <ExportIcon />
        Export
      </button>
    </header>
  );
};

export default Header;