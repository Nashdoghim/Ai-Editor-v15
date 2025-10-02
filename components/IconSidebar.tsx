import React from 'react';
import { ActivePanel } from '../types';

const MediaIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25-2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5a.75.75 0 00.75-.75v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" /></svg>;
const AssetsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M9 4.5a.75.75 0 01.75.75l.001 3.744c.483.132.936.335 1.355.596l2.126-2.126a.75.75 0 111.06 1.06l-2.126 2.126c.262.42.464.872.596 1.355l3.744.001a.75.75 0 010 1.5l-3.744-.001c-.132.483-.335.936-.596 1.355l2.126 2.126a.75.75 0 11-1.06 1.06l-2.126-2.126a4.473 4.473 0 01-1.355.596l-.001 3.744a.75.75 0 01-1.5 0l.001-3.744a4.473 4.473 0 01-1.355-.596l-2.126 2.126a.75.75 0 11-1.06-1.06l2.126-2.126a4.473 4.473 0 01-.596-1.355l-3.744-.001a.75.75 0 010-1.5l3.744.001c.132-.483.335.936.596-1.355L4.09 8.68a.75.75 0 111.06-1.06l2.126 2.126c.42-.262.872-.464 1.355-.596L8.63 5.25a.75.75 0 01.75-.75zm-3.122 8.016a3 3 0 116 0 3 3 0 01-6 0z" clipRule="evenodd" /></svg>;

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
    <div className="icon-button-wrapper relative">
      <button
        aria-label={label}
        aria-pressed={isActive}
        onClick={handleClick}
        className="icon-sidebar-button relative flex items-center justify-center w-12 h-12 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
      >
        {icon}
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
    <nav className="w-16 h-full bg-black/30 backdrop-blur-lg border-r border-white/5 flex flex-col items-center py-4 space-y-2 flex-shrink-0">
      <IconButton label="Media Library" icon={<MediaIcon/>} panel="media-library" activePanel={activePanel} setActivePanel={setActivePanel} />
      <IconButton label="Assets" icon={<AssetsIcon/>} panel="assets" activePanel={activePanel} setActivePanel={setActivePanel} />
    </nav>
  );
};

export default IconSidebar;