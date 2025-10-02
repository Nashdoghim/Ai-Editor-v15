

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

const SendIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
);

const UserIcon: React.FC = () => (
    <div className="w-7 h-7 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    </div>
);

const AiIcon: React.FC = () => (
    <div className="w-7 h-7 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4V6" stroke="url(#ai-glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 18V20" stroke="url(#ai-glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16.9497 7.05021L15.5355 8.46443" stroke="url(#ai-glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8.46446 15.5355L7.05025 16.9497" stroke="url(#ai-glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20 12L18 12" stroke="url(#ai-glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 12L4 12" stroke="url(#ai-glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16.9497 16.9497L15.5355 15.5355" stroke="url(#ai-glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8.46446 8.46443L7.05025 7.05021" stroke="url(#ai-glow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <defs>
          <linearGradient id="ai-glow" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF2D55"/>
            <stop offset="1" stopColor="#A326FF"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
);

interface ChatPanelProps {
    messages: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (prompt: string) => void;
    aiSuggestions: string[];
}

const promptSuggestions = [
    "Find a city timelapse, add it for 5s, then add 'My Journey' in yellow over it.",
    "From my media library, add a clip named 'cat_video.mp4' at 10s.",
    "Select the 'My Journey' text, make it 150% bigger and change it to 'Our Adventure'.",
    "Apply a blur effect from 2s to 4s.",
];

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, isLoading, onSendMessage, aiSuggestions }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
        onSendMessage(input);
        setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 overflow-hidden rounded-lg">
      <div className="flex-1 p-4 overflow-y-auto space-y-5">
        {messages.map((message, index) => (
            <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'model' && <AiIcon />}
                <div className={`whitespace-pre-wrap max-w-[15rem] px-3 py-2 text-sm rounded-xl ${message.role === 'user' ? 'bg-accent-red/10 border border-accent-red/30 text-slate-200' : 'bg-black/50 border border-white/10 text-slate-200'}`}>
                    {message.parts[0].text}
                    {message.role === 'model' && isLoading && index === messages.length -1 && (
                      <span className="streaming-cursor"></span>
                    )}
                </div>
                {message.role === 'user' && <UserIcon />}
            </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-start gap-3 justify-start">
                <AiIcon />
                <div className="max-w-xs px-3 py-2 text-sm rounded-xl bg-black/50 border border-white/10 text-slate-200 flex items-center justify-center">
                    <div className="w-12 h-2 bg-black/30 rounded-full overflow-hidden">
                       <div className="loading-bar rounded-full"></div>
                   </div>
                </div>
            </div>
        )}
        {messages.length <= 1 && (
            <div className="pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">Try these examples:</h3>
                <div className="grid grid-cols-1 gap-2">
                    {promptSuggestions.map((prompt) => (
                        <button 
                          key={prompt} 
                          onClick={() => onSendMessage(prompt)}
                          disabled={isLoading}
                          className="w-full text-left text-xs p-2.5 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-2 border-t border-white/5 bg-transparent">
        {aiSuggestions.length > 0 && !isLoading && (
            <div className="mb-3 space-y-2 animate-fade-in">
                <p className="text-xs text-text-secondary font-semibold px-1">Suggestions:</p>
                <div className="grid grid-cols-1 gap-2">
                    {aiSuggestions.map((prompt, i) => (
                        <button
                            key={i}
                            onClick={() => onSendMessage(prompt)}
                            disabled={isLoading}
                            className="w-full text-left text-xs p-2.5 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI to edit..."
            aria-label="Chat with AI assistant"
            className="ai-input flex-1 bg-black/40 border border-white/10 py-2 px-3 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-red/50 focus:ring-1 focus:ring-accent-red/50 transition-all rounded-lg disabled:opacity-50"
            disabled={isLoading}
          />
          <button 
            type="submit"
            className="p-2 bg-accent-red rounded-lg hover:bg-accent-red-dark transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed text-white" 
            aria-label="Send message"
            disabled={isLoading || !input.trim()}
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;