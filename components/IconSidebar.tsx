import React from 'react';
import { ActivePanel } from '../types';

const MediaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const AssetsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

interface IconButtonProps {
  label: string;
  icon: React.ReactNode;
  panel: ActivePanel;
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;
}

const IconButton: React.FC<IconButtonProps> = ({ label, icon, panel, activePanel, setActivePanel }) => {
  const isActive = activePanel === panel;
  const handleClick = () => {
    setActivePanel(isActive ? null : panel);
  }
  return (
    <div className="icon-button-wrapper relative group">
      <button
        aria-label={label}
        aria-pressed={isActive}
        onClick={handleClick}
        className={`icon-sidebar-button relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-accent-red text-white shadow-lg shadow-accent-red/30'
            : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`}
      >
        <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
          {icon}
        </div>
        {isActive && (
          <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent-red rounded-r-full"></div>
        )}
      </button>
      <div className="custom-tooltip">{label}</div>
    </div>
  );
};

interface IconSidebarProps {
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;
}

const IconSidebar: React.FC<IconSidebarProps> = ({ activePanel, setActivePanel }) => {
  return (
    <nav className="w-16 h-full bg-gradient-to-b from-black/40 to-black/30 backdrop-blur-xl border-r border-white/10 flex flex-col items-center py-6 space-y-3 flex-shrink-0">
      <IconButton label="Media Library" icon={<MediaIcon/>} panel="media-library" activePanel={activePanel} setActivePanel={setActivePanel} />
      <IconButton label="Assets" icon={<AssetsIcon/>} panel="assets" activePanel={activePanel} setActivePanel={setActivePanel} />
    </nav>
  );
};

export default IconSidebar;