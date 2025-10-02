



import React, { useState } from 'react';
import ChatPanel from './ChatPanel';
import ClipPropertiesPanel from './ClipPropertiesPanel';
import { Clip, ChatMessage } from '../types';

interface RightPanelProps {
  selectedClips: Clip[];
  onUpdateClip: (newProps: Partial<Clip>) => void;
  onDeleteClip: () => void;
  chatMessages: ChatMessage[];
  isAiLoading: boolean;
  onSendMessage: (prompt: string) => void;
  aiSuggestions: string[];
}

const RightPanel: React.FC<RightPanelProps> = ({ selectedClips, onUpdateClip, onDeleteClip, chatMessages, isAiLoading, onSendMessage, aiSuggestions }) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'ai'>('ai');

  const getTabClass = (tabName: 'properties' | 'ai') => {
    return `py-3 text-sm font-semibold w-full transition-colors duration-200 focus:outline-none z-10 ${
      activeTab === tabName
        ? 'text-white'
        : 'text-text-secondary hover:text-white'
    }`;
  };

  return (
    <aside className="w-80 bg-slate-800/30 backdrop-blur-lg border-l border-white/5 p-4 flex flex-col flex-shrink-0">
      <div className="relative flex mb-4 border-b border-white/10 flex-shrink-0">
        <button
          className={getTabClass('properties')}
          onClick={() => setActiveTab('properties')}
          aria-pressed={activeTab === 'properties'}
        >
          Properties
        </button>
        <button
          className={getTabClass('ai')}
          onClick={() => setActiveTab('ai')}
          aria-pressed={activeTab === 'ai'}
        >
          AI Assistant
        </button>
        <div 
          className="absolute bottom-[-1px] h-0.5 bg-accent-red shadow-[0_0_8px_rgba(255,45,85,0.7)] transition-transform duration-300 ease-in-out"
          style={{
              width: '50%',
              transform: activeTab === 'ai' ? 'translateX(100%)' : 'translateX(0%)'
          }}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'properties' && (
          <>
            {selectedClips.length === 1 ? (
              <ClipPropertiesPanel clip={selectedClips[0]} onUpdate={onUpdateClip} onDelete={onDeleteClip} />
            ) : (
              <div className="text-text-secondary h-full flex items-center justify-center text-center p-4">
                {selectedClips.length > 1 
                  ? <p>{selectedClips.length} clips selected.<br/>Group with Ctrl/Cmd+G</p>
                  : <p>Select an item on the timeline to view its properties.</p>
                }
              </div>
            )}
          </>
        )}
        {activeTab === 'ai' && <ChatPanel messages={chatMessages} isLoading={isAiLoading} onSendMessage={onSendMessage} aiSuggestions={aiSuggestions} />}
      </div>
    </aside>
  );
};

export default RightPanel;