import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import TimelineClip from './TimelineClip';
import { Track, Clip, MediaAsset, StockAsset, Group, EditorTool } from '../types';

// --- CONTEXT MENU COMPONENT ---
export interface MenuItem {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'separator';
  icon?: React.ReactNode;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x, visibility: 'hidden' as 'hidden' | 'visible' });

  useLayoutEffect(() => {
    if (menuRef.current) {
        const { innerWidth, innerHeight } = window;
        const { offsetWidth, offsetHeight } = menuRef.current;
        let newTop = y;
        let newLeft = x;
        if (y + offsetHeight > innerHeight) {
            newTop = y - offsetHeight;
        }
        if (x + offsetWidth > innerWidth) {
            newLeft = x - offsetWidth;
        }
        setPosition({ top: newTop, left: newLeft, visibility: 'visible' });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
  
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: `${position.top}px`,
    left: `${position.left}px`,
    visibility: position.visibility,
    zIndex: 50,
  };

  return (
    <div ref={menuRef} style={menuStyle} className="w-56 bg-panel-bg/80 backdrop-blur-xl border border-white/10 rounded-md shadow-2xl p-1 text-sm text-text-primary"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={`sep-${index}`} className="h-px bg-white/10 my-1" />;
        }
        
        const handleClick = (e: React.MouseEvent) => {
          e.preventDefault();
          if (!item.disabled && item.onClick) {
            item.onClick();
            onClose();
          }
        };

        return (
          <button
            key={item.label || index}
            onClick={handleClick}
            disabled={item.disabled}
            className={`w-full text-left flex items-center px-3 py-1.5 rounded-sm transition-colors ${
              item.disabled 
              ? 'text-text-tertiary cursor-not-allowed' 
              : 'hover:bg-accent-red hover:text-white'
            }`}
          >
            {item.icon && <span className="mr-3 w-4 h-4 opacity-80">{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

// --- ICONS ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm14.024-1.243a.75.75 0 010 1.486l-6.25 3.571a.75.75 0 01-1.124-.633V8.308a.75.75 0 011.124-.633l6.25 3.57z" clipRule="evenodd" /></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM9 8.25a.75.75 0 00-1.5 0v7.5a.75.75 0 001.5 0v-7.5zm6 0a.75.75 0 00-1.5 0v7.5a.75.75 0 001.5 0v-7.5z" clipRule="evenodd" /></svg>;
const AddTrackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const ZoomInIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5zm8.25-3.75a.75.75 0 01.75.75v2.25h2.25a.75.75 0 010 1.5h-2.25v2.25a.75.75 0 01-1.5 0v-2.25h-2.25a.75.75 0 010-1.5h2.25V7.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>;
const ZoomOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5zM6.75 9.75a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5h-7.5z" clipRule="evenodd" /></svg>;
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 mr-2 text-text-tertiary flex-shrink-0"><path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" /></svg>;
const TextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 mr-2 text-text-tertiary flex-shrink-0"><path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>;
const AudioIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 mr-2 text-text-tertiary flex-shrink-0"><path fillRule="evenodd" d="M19.952 1.651a.75.75 0 01.298.599v16.5a3 3 0 01-5.603 2.048l-5.625-3.375a3 3 0 01-1.32-2.572V9.602a3 3 0 011.32-2.572l5.625-3.375a3 3 0 015.603 2.048zM15 4.832l-5.042 3.025a1.5 1.5 0 00-.659 1.286v4.695c0 .641.348 1.214.91 1.492l5.042 3.025V4.832z" clipRule="evenodd" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
const SplitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h6.75v4.5H3.75z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 9.75h6.75v4.5H13.5z" /></svg>;
const UndoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>;
const RedoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg>;
const MagnetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19.5H4.5V8.25A5.25 5.25 0 019.75 3h4.5a5.25 5.25 0 015.25 5.25v11.25H15" /></svg>;
const LockClosedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" /></svg>;
const LockOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12.75 1.5a.75.75 0 00-1.5 0v2.25H9a2.25 2.25 0 00-2.25 2.25v.75a.75.75 0 001.5 0v-.75a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v-.75a.75.75 0 001.5 0v.75a2.25 2.25 0 00-2.25-2.25h-2.25V1.5z" /><path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 00-3.75 3.75v6.75a3.75 3.75 0 003.75 3.75h7.5a3.75 3.75 0 003.75-3.75v-6.75a3.75 3.75 0 00-3.75-3.75h-7.5zM12 8.25a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" /></svg>;
const EyeOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113zM15.75 12c0 .18-.013.357-.037.53l-1.66-1.66A5.25 5.25 0 0012 5.25c-1.55 0-2.958.68-3.952 1.75l-.738-.738a11.21 11.21 0 00-4.242.827.75.75 0 00-.256 1.478c.244.042.489.09.732.144l3.085 3.085a5.25 5.25 0 006.71 6.71l3.099 3.099c.533.25.994.463 1.42.645a.75.75 0 00.957-1.141l-1.543-1.543c.355-.26.69-.533 1.012-.82a11.247 11.247 0 002.631-4.31 1.762 1.762 0 000-1.113z" /></svg>;
const SelectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 13l6 6" /></svg>;
const SlipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75h15v10.5h-15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 12h-3m0 0l1.5-1.5M7.5 12l1.5 1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 12h3m0 0l-1.5-1.5m1.5 1.5l-1.5 1.5" /></svg>;
const AdjustmentLayerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 mr-2 text-text-tertiary flex-shrink-0"><path d="M10.5 4.5a.75.75 0 00-1.5 0v15a.75.75 0 001.5 0v-15z" /><path d="M3.75 4.5a.75.75 0 00-1.5 0v15a.75.75 0 001.5 0v-15zM17.25 4.5a.75.75 0 00-1.5 0v15a.75.75 0 001.5 0v-15z" /><path fillRule="evenodd" d="M0 8.25a.75.75 0 01.75-.75h22.5a.75.75 0 010 1.5H.75a.75.75 0 01-.75-.75zM0 15.75a.75.75 0 01.75-.75h22.5a.75.75 0 010 1.5H.75a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>;
const EffectsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 mr-1.5"><path fillRule="evenodd" d="M9 4.5a.75.75 0 01.75.75l.001 3.744c.483.132.936.335 1.355.596l2.126-2.126a.75.75 0 111.06 1.06l-2.126 2.126c.262.42.464.872.596 1.355l3.744.001a.75.75 0 010 1.5l-3.744-.001c-.132.483-.335.936-.596 1.355l2.126 2.126a.75.75 0 11-1.06 1.06l-2.126-2.126a4.473 4.473 0 01-1.355.596l-.001 3.744a.75.75 0 01-1.5 0l.001-3.744a4.473 4.473 0 01-1.355-.596l-2.126 2.126a.75.75 0 11-1.06-1.06l2.126-2.126a4.473 4.473 0 01-.596-1.355l-3.744-.001a.75.75 0 010-1.5l3.744.001c.132-.483.335.936.596-1.355L4.09 8.68a.75.75 0 111.06-1.06l2.126 2.126c.42-.262.872-.464 1.355-.596L8.63 5.25a.75.75 0 01.75-.75zm-3.122 8.016a3 3 0 116 0 3 3 0 01-6 0z" clipRule="evenodd" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>;
const PasteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>;
const GroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.596.484-1.08 1.08-1.08h.36c.596 0 1.08.484 1.08 1.08v.36c0 .596-.484 1.08-1.08 1.08h-.36c-.596 0-1.08-.484-1.08-1.08v-.36zM14.25 12c0-.596.484-1.08 1.08-1.08h.36c.596 0 1.08.484 1.08 1.08v.36c0 .596-.484 1.08-1.08 1.08h-.36c-.596 0-1.08-.484-1.08-1.08v-.36zM14.25 17.913c0-.596.484-1.08 1.08-1.08h.36c.596 0 1.08.484 1.08 1.08v.36c0 .596-.484 1.08-1.08 1.08h-.36c-.596 0-1.08-.484-1.08-1.08v-.36zM8.25 6.087c0-.596.484-1.08 1.08-1.08h.36c.596 0 1.08.484 1.08 1.08v.36c0 .596-.484 1.08-1.08 1.08h-.36c-.596 0-1.08-.484-1.08-1.08v-.36zM8.25 12c0-.596.484-1.08 1.08-1.08h.36c.596 0 1.08.484 1.08 1.08v.36c0 .596-.484 1.08-1.08 1.08h-.36c-.596 0-1.08-.484-1.08-1.08v-.36zM8.25 17.913c0-.596.484-1.08 1.08-1.08h.36c.596 0 1.08.484 1.08 1.08v.36c0 .596-.484 1.08-1.08 1.08h-.36c-.596 0-1.08-.484-1.08-1.08v-.36z" /></svg>;
const UngroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" /></svg>;

interface TimelineProps {
  currentTime: number;
  duration: number;
  tracks: Track[];
  onSeek: (time: number) => void;
  onPlayPause: () => void;
  isPlaying: boolean;
  onUpdateClip: (trackId: string, clipId: string, newProps: Partial<Clip>) => void;
  onUpdateClipLive: (clipId: string | null, newProps: Partial<Clip> | null) => void;
  onSelectClip: (trackId: string, clipId: string, isMultiSelectKey: boolean) => void;
  onDeselectAll: () => void;
  selectedClipIds: string[];
  groups: Group[];
  onAddTextClip: () => void;
  onAddAdjustmentClip: () => void;
  onAddClip: (trackId: string | null, asset: MediaAsset, startTime: number) => void;
  onAddTrack: (type: 'video' | 'text' | 'adjustment' | 'audio') => void;
  onDeleteTrack: (trackId: string) => void;
  onUpdateTrack: (trackId: string, newProps: Partial<Track>) => void;
  onSplitClip: () => void;
  mediaLibrary: MediaAsset[];
  onAddStockClip: (trackId: string | null, stockAsset: StockAsset, startTime: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isMagnetic: boolean;
  onToggleMagnetic: (isMagnetic: boolean) => void;
  draggingAsset: { asset: MediaAsset | StockAsset; type: 'local' | 'stock' } | null;
  activeTool: EditorTool;
  onSetTool: (tool: EditorTool) => void;
  onCopyClip: () => void;
  onPasteClip: () => void;
  onGroupClips: () => void;
  onUngroupClips: () => void;
  onDeleteSelectedClip: () => void;
  copiedClip: Clip | null;
}

const generateColorFromId = (id: string): string => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
};

const Timeline: React.FC<TimelineProps> = ({ currentTime, duration, tracks, onSeek, onPlayPause, isPlaying, onUpdateClip, onUpdateClipLive, onSelectClip, onDeselectAll, selectedClipIds, groups, onAddTextClip, onAddAdjustmentClip, onAddClip, onAddTrack, onDeleteTrack, onUpdateTrack, onSplitClip, mediaLibrary, onAddStockClip, onUndo, onRedo, canUndo, canRedo, isMagnetic, onToggleMagnetic, draggingAsset, activeTool, onSetTool, onCopyClip, onPasteClip, onGroupClips, onUngroupClips, onDeleteSelectedClip, copiedClip }) => {
  const [zoom, setZoom] = useState(1);
  
  const mainScrollContainerRef = useRef<HTMLDivElement>(null);
  const rulerContainerRef = useRef<HTMLDivElement>(null);
  const headersContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const isSeekingRef = useRef(false);
  const newScrollLeftRef = useRef<number | null>(null);
  const [showAddTrackMenu, setShowAddTrackMenu] = useState(false);
  const addTrackMenuRef = useRef<HTMLDivElement>(null);
  const isInteractingWithClip = useRef(false);
  const [snapLinePosition, setSnapLinePosition] = useState<number | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [ghostPreview, setGhostPreview] = useState<{ clip: Omit<Clip, 'id'>, trackId: string | null } | null>(null);
  const [showGhostTrack, setShowGhostTrack] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, items: MenuItem[] } | null>(null);
  
  // Get container width for dynamic calculations
  useEffect(() => {
    const container = mainScrollContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
        if (entries[0]) {
            setContainerWidth(entries[0].contentRect.width - (12 * 16)); // subtract header width
        }
    });

    resizeObserver.observe(container);
    setContainerWidth(container.clientWidth - (12*16));

    return () => resizeObserver.disconnect();
  }, []);

  const minZoomLevel = useMemo(() => {
    if (containerWidth > 0 && duration > 0) {
        const requiredPixelsPerSecond = containerWidth / duration;
        return requiredPixelsPerSecond / 100;
    }
    return 0.1;
  }, [containerWidth, duration]);

  useEffect(() => {
    if (zoom < minZoomLevel) {
      setZoom(minZoomLevel);
    }
  }, [zoom, minZoomLevel]);
  
  const PIXELS_PER_SECOND = 100 * zoom;
  const timelineWidth = duration * PIXELS_PER_SECOND;

  const gridInterval = useMemo(() => {
    const minGridLinePixels = 75; // Aim for at least 75px between grid lines
    const niceIntervals = [1, 2, 5, 10, 15, 30, 60]; // in seconds
    
    for (const interval of niceIntervals) {
        if (interval * PIXELS_PER_SECOND >= minGridLinePixels) {
            return interval;
        }
    }
    
    // For very zoomed-out views, keep increasing the interval
    let lastInterval = niceIntervals[niceIntervals.length - 1];
    while (lastInterval * PIXELS_PER_SECOND < minGridLinePixels) {
        lastInterval *= 2;
    }
    return lastInterval;
  }, [PIXELS_PER_SECOND]);

  const gridLines = useMemo(() => {
      const lines = [];
      if (gridInterval > 0 && duration > 0) {
          // Start from the first interval, not from 0
          for (let time = gridInterval; time < duration; time += gridInterval) {
              lines.push(time);
          }
      }
      return lines;
  }, [gridInterval, duration]);

  const snapPoints = useMemo(() => {
    if (!isMagnetic) return [];
    const points = new Set<number>();
    tracks.forEach(track => {
      if (track.isVisible) {
        track.clips.forEach(clip => {
          points.add(clip.start);
          points.add(clip.start + clip.duration);
        });
      }
    });
    return Array.from(points);
  }, [tracks, isMagnetic]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addTrackMenuRef.current && !addTrackMenuRef.current.contains(event.target as Node)) {
        setShowAddTrackMenu(false);
      }
      if (contextMenu) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);
  
  const calculateDropTime = (e: React.MouseEvent | React.DragEvent) => {
    if (mainScrollContainerRef.current) {
        const rect = mainScrollContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const scrollLeft = mainScrollContainerRef.current.scrollLeft;
        return (x + scrollLeft) / PIXELS_PER_SECOND;
    }
    return 0;
  };

  const handleRulerSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainScrollContainerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const scrollLeft = mainScrollContainerRef.current.scrollLeft;
    const time = (x + scrollLeft) / PIXELS_PER_SECOND;
    onSeek(Math.max(0, Math.min(time, duration)));
  };

  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    isSeekingRef.current = true;
    handleRulerSeek(e);
  };
  
  const handleContentMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-clip-id]')) return;
    onDeselectAll();
    setContextMenu(null);
  };
  
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isSeekingRef.current && mainScrollContainerRef.current && rulerContainerRef.current) {
        const rect = rulerContainerRef.current.getBoundingClientRect();
        const scrollLeft = mainScrollContainerRef.current.scrollLeft;
        const x = e.clientX - rect.left;
        const time = (x + scrollLeft) / PIXELS_PER_SECOND;
        onSeek(Math.max(0, Math.min(time, duration)));
      }
    };
    const onMouseUp = () => { 
      isSeekingRef.current = false;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [duration, onSeek, PIXELS_PER_SECOND]);

  useEffect(() => {
    const container = mainScrollContainerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const scrollLeft = container.scrollLeft;
        setZoom(currentZoom => {
            const oldZoom = currentZoom;
            const zoomFactor = -0.002;
            const zoomChange = e.deltaY * zoomFactor;
            const newZoom = Math.max(minZoomLevel, Math.min(oldZoom + zoomChange, 10));
            if (newZoom.toFixed(4) === oldZoom.toFixed(4)) return oldZoom;
            const newScrollLeft = ((scrollLeft + mouseX) * (newZoom / oldZoom)) - mouseX;
            newScrollLeftRef.current = newScrollLeft;
            return newZoom;
        });
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [minZoomLevel]);

  useLayoutEffect(() => {
    if (newScrollLeftRef.current !== null && mainScrollContainerRef.current) {
        mainScrollContainerRef.current.scrollLeft = newScrollLeftRef.current;
        newScrollLeftRef.current = null;
    }
  }, [zoom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (rulerContainerRef.current) {
      rulerContainerRef.current.scrollLeft = scrollLeft;
    }
    if (headersContainerRef.current) {
      headersContainerRef.current.scrollTop = scrollTop;
    }
  };

  const handleDrop = (e: React.DragEvent, trackId: string | null) => {
    e.preventDefault();
    setDragOverTrackId(null);
    setGhostPreview(null);
    setShowGhostTrack(false);

    const stockAssetString = e.dataTransfer.getData('application/vnd.stock-asset+json');
    const localAssetString = e.dataTransfer.getData('application/vnd.local-asset+json');
    const dropTime = Math.max(0, calculateDropTime(e));

    if (stockAssetString) {
        const stockAsset: StockAsset = JSON.parse(stockAssetString);
        onAddStockClip(trackId, stockAsset, dropTime);
    } else if (localAssetString) {
        const asset: MediaAsset = JSON.parse(localAssetString);
        onAddClip(trackId, asset, dropTime);
    }
  };

  const handleDragOver = (e: React.DragEvent, track: Track | null) => {
    const isAsset = e.dataTransfer.types.some(t => t.includes('asset+json'));
    if (!isAsset || !draggingAsset) return;

    const assetType = draggingAsset.asset.type;
    const targetTrackType = (assetType === 'image' || assetType === 'video') ? 'video' : 'audio';

    if (!track || (track.type === targetTrackType && !track.isLocked)) {
      e.preventDefault();
      setDragOverTrackId(track ? track.id : null);

      if (mainScrollContainerRef.current) {
        let startTime = calculateDropTime(e);
        const assetDuration = draggingAsset.asset.duration || 5;
        
        if (isMagnetic) {
          const snapThreshold = 8 / PIXELS_PER_SECOND;
          let closestSnap = -1;
          let minDistance = Infinity;
          
          snapPoints.forEach(p => {
              let dist = Math.abs(p - startTime);
              if (dist < minDistance && dist < snapThreshold) { minDistance = dist; closestSnap = p; }
              dist = Math.abs(p - (startTime + assetDuration));
              if (dist < minDistance && dist < snapThreshold) { minDistance = dist; closestSnap = p - assetDuration; }
          });

          if (closestSnap !== -1) { startTime = closestSnap; }
        }
        
        const ghostClipData: Omit<Clip, 'id'> = {
          name: draggingAsset.asset.name, start: Math.max(0, startTime), duration: assetDuration, type: assetType, assetId: draggingAsset.asset.id, trimStart: 0,
        };
        
        const newTrackId = track ? track.id : null;
        if (ghostPreview?.trackId !== newTrackId || Math.abs((ghostPreview.clip.start - ghostClipData.start) * PIXELS_PER_SECOND) > 2) {
          setGhostPreview({ clip: ghostClipData, trackId: newTrackId });
        }
      }
    }
  };

  const handleMainDragOver = (e: React.DragEvent) => {
    const isAsset = e.dataTransfer.types.some(t => t.includes('asset+json'));
    const assetType = draggingAsset?.asset.type;
    const targetTrackType = (assetType === 'image' || assetType === 'video') ? 'video' : 'audio';

    if (isAsset && !tracks.some(t => t.type === targetTrackType)) {
      setShowGhostTrack(true);
      handleDragOver(e, null);
    }
  };
  
  const handleDragLeave = () => {
    setDragOverTrackId(null);
    setGhostPreview(null);
    setShowGhostTrack(false);
  };

  const formatTime = (time: number) => new Date(time * 1000).toISOString().slice(11, 19);

  const getRulerMarkers = useCallback(() => {
    const markers = [];
    if (PIXELS_PER_SECOND <= 0) return [];

    const minMajorMarkerPixels = 80;

    const niceIntervals = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    
    let majorUnit = niceIntervals[0];
    for (const interval of niceIntervals) {
        majorUnit = interval;
        if (interval * PIXELS_PER_SECOND >= minMajorMarkerPixels) {
            break;
        }
    }
    
    if (majorUnit * PIXELS_PER_SECOND < minMajorMarkerPixels) {
        majorUnit = niceIntervals[niceIntervals.length - 1];
        while (majorUnit * PIXELS_PER_SECOND < minMajorMarkerPixels) {
            majorUnit *= 2;
        }
    }

    let minorUnitDivisions = 1;
    const majorWidth = majorUnit * PIXELS_PER_SECOND;
    const minMinorMarkerPixels = 10;
    if (majorWidth / 10 >= minMinorMarkerPixels) {
      minorUnitDivisions = 10;
    } else if (majorWidth / 5 >= minMinorMarkerPixels) {
      minorUnitDivisions = 5;
    } else if (majorWidth / 2 >= minMinorMarkerPixels) {
      minorUnitDivisions = 2;
    }
    
    const minorUnit = minorUnitDivisions > 1 ? majorUnit / minorUnitDivisions : majorUnit;
    const epsilon = 0.0001;

    for (let i = 0; i <= duration + 1; i += minorUnit) {
        if (i > duration + 1) continue;
        
        const isMajor = i % majorUnit < epsilon || Math.abs((i % majorUnit) - majorUnit) < epsilon;
        
        let label: string | null = null;
        if (isMajor) {
          const hours = Math.floor(i / 3600);
          const minutes = Math.floor((i % 3600) / 60);
          const seconds = Math.floor(i % 60);

          if (majorUnit < 1) {
            label = i.toFixed(1);
          } else if (duration >= 3600 || i >= 3600) {
            label = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          } else {
            label = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          }
        }

        markers.push({ time: i, isMajor: isMajor, label: label });
    }
    return markers;
  }, [duration, PIXELS_PER_SECOND]);

  const isSplittingDisabled = useMemo(() => {
    const activeClip = tracks.flatMap(t => t.clips).find(c => currentTime > c.start && currentTime < c.start + c.duration);
    if (!activeClip) return true;
    const MIN_SPLIT_MARGIN = 0.1;
    if (currentTime - activeClip.start < MIN_SPLIT_MARGIN || (activeClip.start + activeClip.duration) - currentTime < MIN_SPLIT_MARGIN) {
        return true;
    }
    return false;
  }, [tracks, currentTime]);

  const allClips = useMemo(() => tracks.flatMap(t => t.clips), [tracks]);

  const selectedGroups = useMemo(() => {
    const selectedGroupSet = new Set<string>();
    if (selectedClipIds.length > 0) {
        const selectedIdSet = new Set(selectedClipIds);
        for (const group of groups) {
            if (group.clipIds.some(cid => selectedIdSet.has(cid))) {
                selectedGroupSet.add(group.id);
            }
        }
    }
    return selectedGroupSet;
  }, [selectedClipIds, groups]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu(null);

    const target = e.target as HTMLElement;
    const clipElement = target.closest<HTMLDivElement>('[data-clip-id]');
    const trackAreaElement = target.closest<HTMLDivElement>('[data-track-area-id]');
    const trackHeaderElement = target.closest<HTMLDivElement>('[data-track-header-id]');
    
    let items: MenuItem[] = [];
    const timeAtCursor = calculateDropTime(e);
    
    if (clipElement && selectedClipIds.includes(clipElement.dataset.clipId!)) {
        const isClipInAnyGroup = groups.some(g => g.clipIds.some(id => selectedClipIds.includes(id)));
        items = [
            { label: 'Copy', onClick: onCopyClip, disabled: selectedClipIds.length !== 1, icon: <CopyIcon /> },
            { label: 'Paste', onClick: onPasteClip, disabled: !copiedClip, icon: <PasteIcon /> },
            { label: 'Split', onClick: () => onSplitClip(), disabled: isSplittingDisabled, icon: <SplitIcon /> },
            { label: 'Delete', onClick: onDeleteSelectedClip, disabled: selectedClipIds.length === 0, icon: <TrashIcon /> },
            { type: 'separator' },
            { label: 'Group', onClick: onGroupClips, disabled: selectedClipIds.length < 2, icon: <GroupIcon /> },
            { label: 'Ungroup', onClick: onUngroupClips, disabled: !isClipInAnyGroup, icon: <UngroupIcon /> }
        ];
    } 
    else if (trackHeaderElement) {
        const trackId = trackHeaderElement.dataset.trackHeaderId!;
        const track = tracks.find(t => t.id === trackId);
        if (!track) return;
        items = [
            { label: track.isLocked ? 'Unlock Track' : 'Lock Track', onClick: () => onUpdateTrack(trackId, { isLocked: !track.isLocked }), icon: track.isLocked ? <LockOpenIcon/> : <LockClosedIcon/> },
            { label: track.isVisible ? 'Hide Track' : 'Show Track', onClick: () => onUpdateTrack(trackId, { isVisible: !track.isVisible }), icon: track.isVisible ? <EyeOffIcon/> : <EyeIcon/> },
            { type: 'separator' },
            { label: 'Delete Track', onClick: () => onDeleteTrack(trackId), icon: <TrashIcon /> }
        ];
    }
    else {
        onSeek(timeAtCursor);
        items = [
            { label: 'Paste', onClick: onPasteClip, disabled: !copiedClip, icon: <PasteIcon /> },
            { type: 'separator' },
            { label: 'Add Text Clip', onClick: onAddTextClip, icon: <TextIcon /> },
            { label: 'Add Adjustment Clip', onClick: onAddAdjustmentClip, icon: <EffectsIcon /> },
            { type: 'separator' },
            { label: 'Add Video Track', onClick: () => onAddTrack('video'), icon: <VideoIcon /> },
            { label: 'Add Audio Track', onClick: () => onAddTrack('audio'), icon: <AudioIcon /> },
            { label: 'Add Text Track', onClick: () => onAddTrack('text'), icon: <TextIcon /> },
            { label: 'Add Adjustment Track', onClick: () => onAddTrack('adjustment'), icon: <AdjustmentLayerIcon /> },
        ];
    }

    if (items.length > 0) {
        setContextMenu({ x: e.clientX, y: e.clientY, items });
    }
  };

  const handleClipMouseDown = (e: React.MouseEvent, trackId: string, clipId: string) => {
    if (e.button === 2 && !selectedClipIds.includes(clipId)) {
        onSelectClip(trackId, clipId, false);
    }
  };
  
  const totalTracksHeight = tracks.length * 56 + (showGhostTrack ? 56 : 0);

  return (
    <div className="h-96 bg-slate-900/20 backdrop-blur-lg flex flex-col select-none overflow-hidden rounded-lg border border-white/5" onContextMenu={handleContextMenu}>
       <div className="flex items-center justify-between p-3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center space-x-4 w-40">
              <button onClick={onPlayPause} className="text-text-secondary hover:text-white transition-colors" title={isPlaying ? 'Pause (K)' : 'Play (L)'}>{isPlaying ? <PauseIcon/> : <PlayIcon />}</button>
              <button onClick={onUndo} disabled={!canUndo} className="text-text-secondary hover:text-white transition-colors disabled:text-white/20 disabled:cursor-not-allowed" title="Undo (Cmd+Z)"><UndoIcon/></button>
              <button onClick={onRedo} disabled={!canRedo} className="text-text-secondary hover:text-white transition-colors disabled:text-white/20 disabled:cursor-not-allowed" title="Redo (Cmd+Shift+Z)"><RedoIcon/></button>
              <button onClick={() => onSplitClip()} disabled={isSplittingDisabled} title="Split Clip" className="text-text-secondary hover:text-white transition-colors disabled:text-white/20 disabled:cursor-not-allowed"><SplitIcon/></button>
              <div className="font-mono text-sm text-text-secondary tracking-wider">{formatTime(currentTime)}</div>
          </div>
          <div className="flex-1 flex justify-center items-center space-x-2">
            <button onClick={() => setZoom(z => Math.max(minZoomLevel, z - 0.25))} className="p-1 rounded-full text-text-secondary hover:bg-white/10 hover:text-white transition-colors" title="Zoom Out (Ctrl+Scroll)"><ZoomOutIcon /></button>
            <input type="range" min={minZoomLevel} max="10" step="0.1" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="w-64 cursor-pointer zoom-slider" />
            <button onClick={() => setZoom(z => Math.min(10, z + 0.25))} className="p-1 rounded-full text-text-secondary hover:bg-white/10 hover:text-white transition-colors" title="Zoom In (Ctrl+Scroll)"><ZoomInIcon /></button>
          </div>
          <div className="w-40 flex justify-end">
             <div className="relative" ref={addTrackMenuRef}>
                <button onClick={() => setShowAddTrackMenu(s => !s)} title="Add Track" className="flex items-center justify-center text-sm font-semibold bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white transition-colors rounded-md px-3 py-1.5">
                    <AddTrackIcon />
                    <span className="ml-2">Add Track</span>
                </button>
                {showAddTrackMenu && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-panel-bg border border-white/10 rounded-md shadow-2xl z-20">
                    <button onClick={() => { onAddTrack('adjustment'); setShowAddTrackMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-white flex items-center"><AdjustmentLayerIcon /> Add Adjustment Track</button>
                    <button onClick={() => { onAddTrack('text'); setShowAddTrackMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-white flex items-center"><TextIcon /> Add Text Track</button>
                    <button onClick={() => { onAddTrack('video'); setShowAddTrackMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-white flex items-center"><VideoIcon /> Add Video Track</button>
                    <button onClick={() => { onAddTrack('audio'); setShowAddTrackMenu(false); }} className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-white flex items-center"><AudioIcon /> Add Audio Track</button>
                  </div>
                )}
            </div>
          </div>
      </div>
      
      <div className="flex items-center px-3 py-1 border-b border-white/5 flex-shrink-0 bg-slate-800/20 space-x-2">
        <button onClick={onAddTextClip} title="Add Text Clip" className="flex items-center justify-center text-sm font-semibold h-full text-text-secondary bg-white/5 hover:bg-white/10 hover:text-white transition-colors rounded-md px-3 py-1"><TextIcon /> Add Text</button>
        <button onClick={onAddAdjustmentClip} title="Add Adjustment Clip" className="flex items-center justify-center text-sm font-semibold h-full text-text-secondary bg-white/5 hover:bg-white/10 hover:text-white transition-colors rounded-md px-3 py-1"><EffectsIcon /> Add Effect</button>
        <div className="flex items-center bg-black/40 p-0.5 rounded-md">
            <button onClick={() => onSetTool('select')} title="Select Tool" className={`p-1 rounded-md transition-colors ${activeTool === 'select' ? 'bg-white text-black' : 'text-text-secondary hover:bg-white/10 hover:text-white'}`}><SelectIcon /></button>
            <button onClick={() => onSetTool('slip')} title="Slip Tool" className={`p-1 rounded-md transition-colors ${activeTool === 'slip' ? 'bg-white text-black' : 'text-text-secondary hover:bg-white/10 hover:text-white'}`}><SlipIcon /></button>
        </div>
        <button onClick={() => onToggleMagnetic(!isMagnetic)} title="Toggle Magnetic Timeline" className={`p-1.5 rounded-md transition-colors ${isMagnetic ? 'bg-accent-red text-white' : 'text-text-secondary bg-white/5 hover:bg-white/10 hover:text-white'}`}><MagnetIcon /></button>
      </div>

      <div className="flex-1 grid grid-cols-[12rem_1fr] grid-rows-[2rem_1fr] overflow-hidden">
        {/* Top-Left Corner */}
        <div className="bg-slate-800/20 border-r border-b border-white/5 z-30 flex items-center justify-start px-4">
             <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Tracks</h3>
        </div>

        {/* Ruler */}
        <div className="overflow-hidden relative bg-slate-800/20 border-b border-white/5" ref={rulerContainerRef} onMouseDown={handleRulerMouseDown}>
            <div className="relative h-full" style={{ width: timelineWidth, minWidth: '100%' }}>
              {getRulerMarkers().map(({time, isMajor, label}) => (
                <div key={`marker-${time}`} className="absolute top-0 h-full" style={{ left: `${time * PIXELS_PER_SECOND}px` }}>
                    <div className={`absolute top-0 w-px ${isMajor ? 'h-full bg-white/20' : 'h-1/2 bg-white/10'}`}></div>
                    {label && <span className="absolute top-1 left-1.5 text-[10px] font-mono text-text-tertiary">{label}</span>}
                </div>
              ))}
              {snapPoints.map(time => ( <div key={`snap-point-${time}`} className="absolute top-0 h-full w-px bg-accent-red/20 pointer-events-none" style={{ left: `${time * PIXELS_PER_SECOND}px` }}/> ))}
              <div className="absolute -top-1 h-[calc(2rem+4px)] w-0.5 bg-accent-red z-20 pointer-events-none" style={{ transform: `translateX(${currentTime * PIXELS_PER_SECOND}px)` }}>
                  <div className="absolute top-0 -translate-x-1/2 w-3.5 h-3.5"><div className="w-full h-full rounded-full bg-accent-red border-2 border-white shadow-lg"></div></div>
              </div>
            </div>
        </div>

        {/* Headers */}
        <div className="overflow-hidden border-r border-white/5 bg-slate-800/20 relative" ref={headersContainerRef}>
            <div className="absolute top-0 left-0 w-full">
                <div className="py-1 space-y-1">
                    {tracks.map(track => (
                      <div key={track.id} data-track-header-id={track.id} className={`h-14 flex items-center justify-start px-2 group ${track.isVisible === false ? 'opacity-50' : ''}`}>
                        <div className="flex-1 flex items-center min-w-0">
                            {track.type === 'video' ? <VideoIcon /> : track.type === 'text' ? <TextIcon /> : track.type === 'audio' ? <AudioIcon /> : <AdjustmentLayerIcon />}
                            <span className="text-xs font-semibold text-text-secondary truncate flex-1">{track.name}</span>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onUpdateTrack(track.id, { isLocked: !track.isLocked })} title={track.isLocked ? "Unlock Track" : "Lock Track"} className="p-1.5 text-text-tertiary hover:text-white rounded-full hover:bg-white/10">{track.isLocked ? <LockClosedIcon /> : <LockOpenIcon />}</button>
                            <button onClick={() => onUpdateTrack(track.id, { isVisible: !track.isVisible })} title={track.isVisible ? "Hide Track" : "Show Track"} className="p-1.5 text-text-tertiary hover:text-white rounded-full hover:bg-white/10">{track.isVisible ? <EyeIcon /> : <EyeOffIcon />}</button>
                            <button onClick={() => onDeleteTrack(track.id)} title="Delete Track" className="p-1.5 text-text-tertiary hover:text-accent-red rounded-full hover:bg-white/10"><TrashIcon /></button>
                        </div>
                      </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Main Scrollable Content */}
        <div className="overflow-auto bg-black/20" ref={mainScrollContainerRef} onScroll={handleScroll} onMouseDown={handleContentMouseDown} onDragOver={handleMainDragOver} onDrop={(e) => handleDrop(e, null)} onDragLeave={handleDragLeave}>
            <div className="relative" style={{ width: timelineWidth, minWidth: '100%', height: totalTracksHeight }}>
                <div className="absolute inset-0 pointer-events-none z-0">
                    {gridLines.map(time => (
                        <div 
                            key={`grid-${time}`}
                            className="absolute top-0 bottom-0 w-px bg-white/[.07]"
                            style={{ left: `${time * PIXELS_PER_SECOND}px` }}
                        />
                    ))}
                </div>
                {tracks.length === 0 && !draggingAsset && (
                    <div className="absolute inset-0 flex items-center justify-center text-text-secondary pointer-events-none">
                        <p>Drag your media here to start creating.</p>
                    </div>
                )}
                {tracks.map((track) => {
                  const trackGroupBounds = new Map<string, { minStart: number; maxEnd: number }>();
                  for (const clip of track.clips) {
                      const groupInfo = groups.find(g => g.clipIds.includes(clip.id));
                      if (groupInfo && selectedGroups.has(groupInfo.id)) {
                          const bounds = trackGroupBounds.get(groupInfo.id) ?? { minStart: Infinity, maxEnd: -Infinity };
                          bounds.minStart = Math.min(bounds.minStart, clip.start);
                          bounds.maxEnd = Math.max(bounds.maxEnd, clip.start + clip.duration);
                          trackGroupBounds.set(groupInfo.id, bounds);
                      }
                  }
                  return (
                    <div key={track.id} data-track-area-id={track.id} className={`h-14 relative transition-all duration-200 ${dragOverTrackId === track.id ? 'bg-accent-red/20' : ''} ${track.isVisible === false ? 'opacity-50' : ''}`} onDragOver={(e) => handleDragOver(e, track)} onDrop={(e) => handleDrop(e, track.id)}>
                        {[...trackGroupBounds.entries()].map(([groupId, bounds]) => {
                            const groupColor = generateColorFromId(groupId);
                            const left = bounds.minStart * PIXELS_PER_SECOND;
                            const width = (bounds.maxEnd - bounds.minStart) * PIXELS_PER_SECOND;
                            return (<div key={groupId} className="absolute top-1 bottom-1 rounded-lg border border-dashed pointer-events-none transition-all duration-200" style={{left: `${left}px`, width: `${width}px`, backgroundColor: groupColor.replace('hsl', 'hsla').replace(')', ', 0.15)'), borderColor: groupColor, zIndex: 0,}}/>);
                        })}
                        {track.clips.map(clip => {
                          const groupInfo = groups.find(g => g.clipIds.includes(clip.id));
                          // FIX: Corrected variable name from pixelsPerSecond to PIXELS_PER_SECOND.
                          return (<TimelineClip key={clip.id} clip={clip} asset={mediaLibrary.find(m => m.id === clip.assetId)} onUpdate={(id, props) => onUpdateClip(track.id, id, props)} onUpdateLive={onUpdateClipLive} pixelsPerSecond={PIXELS_PER_SECOND} trackWidth={timelineWidth} onSelect={(e) => onSelectClip(track.id, clip.id, e.shiftKey || e.metaKey || e.ctrlKey)} onMouseDown={(e) => handleClipMouseDown(e, track.id, clip.id)} isSelected={selectedClipIds.includes(clip.id)} siblings={track.clips.filter(c => c.id !== clip.id)} allClips={allClips.filter(c => c.id !== clip.id)} onInteractionChange={(isInteracting) => isInteractingWithClip.current = isInteracting} playheadTime={currentTime} onSetSnapLine={isMagnetic ? setSnapLinePosition : () => {}} isGrouped={!!groupInfo} groupColor={groupInfo ? generateColorFromId(groupInfo.id) : undefined} isLocked={track.isLocked} isMagnetic={isMagnetic} activeTool={activeTool}/>);
                        })}
                    </div>
                  );
                })}
                {showGhostTrack && (<div className="h-14 relative bg-accent-red/10 border-2 border-dashed border-accent-red/50 rounded-lg m-1"><div className="absolute inset-0 flex items-center justify-center"><p className="text-accent-red/80 text-sm font-semibold">New {draggingAsset?.asset.type} Track</p></div></div>)}
                {ghostPreview && (<div className="absolute top-2 h-10 rounded-md border-2 border-dashed border-accent-red bg-accent-red/20 opacity-80 pointer-events-none flex items-center justify-center px-2" style={{left: `${ghostPreview.clip.start * PIXELS_PER_SECOND}px`, width: `${ghostPreview.clip.duration * PIXELS_PER_SECOND}px`, transform: `translateY(${ghostPreview.trackId === null ? (tracks.length * 56) : tracks.findIndex(t => t.id === ghostPreview.trackId) * 56}px)`, zIndex: 30}}><p className="text-white text-xs font-medium truncate pointer-events-none">{ghostPreview.clip.name}</p></div>)}
                {snapLinePosition !== null && (<div className="absolute top-0 bottom-0 w-px bg-transparent z-20 pointer-events-none" style={{ left: `${snapLinePosition * PIXELS_PER_SECOND}px`, backgroundImage: `linear-gradient(to bottom, #FF2D55 60%, transparent 40%)`, backgroundSize: '1px 8px', backgroundRepeat: 'repeat-y', filter: 'drop-shadow(0 0 3px #FF2D55)'}}/>)}
                <div className="absolute top-0 bottom-0 w-0.5 bg-accent-red z-20 pointer-events-none" style={{ transform: `translateX(${currentTime * PIXELS_PER_SECOND}px)` }}></div>
            </div>
        </div>
      </div>
      {contextMenu && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />}
    </div>
  );
};

export default Timeline;