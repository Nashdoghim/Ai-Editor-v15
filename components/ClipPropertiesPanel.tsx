import React, { useState, useEffect, useCallback } from 'react';
import { Clip, Effect, Transform, Animation } from '../types';

interface ClipPropertiesPanelProps {
  clip: Clip;
  onUpdate: (newProps: Partial<Clip>) => void;
  onDelete: () => void;
}

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 transition-transform">
    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left py-2 px-1 text-sm font-semibold text-text-secondary hover:text-white">
        {title}
        <span className={`${isOpen ? 'rotate-180' : ''}`}><ChevronDownIcon /></span>
      </button>
      {isOpen && <div className="space-y-4 pb-2">{children}</div>}
    </div>
  );
};

const SliderInput: React.FC<{ label: string; value: number; onChange: (val: number) => void; min: number; max: number; step: number; unit?: string }> = 
  ({ label, value, onChange, min, max, step, unit = '' }) => (
  <div>
    <label className="text-xs text-text-tertiary font-medium block mb-1">{label}</label>
    <div className="flex items-center space-x-2">
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min} max={max} step={step}
        className="w-full h-1 accent-accent-red bg-black/50 rounded-full appearance-none cursor-pointer"
      />
      <div className="relative w-20">
        <input
          type="number"
          value={value.toFixed(step < 1 ? 2 : 0)}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min} max={max} step={step}
          className="w-full bg-black/40 border border-white/10 py-1.5 pl-2 pr-5 text-sm placeholder-text-tertiary focus:ring-2 focus:ring-white focus:outline-none transition-colors rounded-md text-right"
        />
        {unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">{unit}</span>}
      </div>
    </div>
  </div>
);

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;

const EffectControl: React.FC<{ effect: Effect, onUpdate: (updatedEffect: Effect) => void }> = ({ effect, onUpdate }) => {
  const title = effect.type.charAt(0).toUpperCase() + effect.type.slice(1);

  return (
    <div className="space-y-2 p-3 bg-black/20 rounded-md">
        <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-text-primary">{title}</label>
            <label htmlFor={`enable-${effect.type}`} className="flex items-center cursor-pointer">
                <div className="relative">
                    <input 
                        id={`enable-${effect.type}`} 
                        type="checkbox" 
                        className="sr-only" 
                        checked={effect.enabled}
                        onChange={(e) => onUpdate({ ...effect, enabled: e.target.checked })}
                    />
                    <div className={`block w-10 h-6 rounded-full ${effect.enabled ? 'bg-accent-red' : 'bg-white/20'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${effect.enabled ? 'translate-x-4' : ''}`}></div>
                </div>
            </label>
        </div>
        <div className={`flex items-center space-x-2 transition-opacity ${!effect.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <input
                type="range"
                min={effect.min}
                max={effect.max}
                step={effect.step}
                value={effect.value}
                onChange={(e) => onUpdate({ ...effect, value: parseFloat(e.target.value) })}
                className="w-full h-1 accent-accent-red bg-black/50 rounded-full appearance-none cursor-pointer"
            />
            <span className="text-xs font-mono w-12 text-right">{`${effect.value.toFixed(effect.step < 1 ? 1 : 0)}${effect.unit}`}</span>
        </div>
    </div>
  );
};


const ClipPropertiesPanel: React.FC<ClipPropertiesPanelProps> = ({ clip, onUpdate, onDelete }) => {
  const [localClip, setLocalClip] = useState(clip);

  useEffect(() => {
    setLocalClip(clip);
  }, [clip]);

  const handleUpdate = useCallback((newProps: Partial<Clip>) => {
    onUpdate(newProps);
  }, [onUpdate]);
  
  const handleTransformUpdate = useCallback((transformProps: Partial<Transform>) => {
    onUpdate({ transform: { ...clip.transform, ...transformProps } });
  }, [onUpdate, clip.transform]);

  const handleStyleUpdate = useCallback((styleProps: Partial<React.CSSProperties>) => {
    onUpdate({ style: { ...clip.style, ...styleProps } });
  }, [onUpdate, clip.style]);
  
  const handleAnimationUpdate = useCallback((direction: 'in' | 'out', animProps: Partial<Animation>) => {
      const currentAnim = clip.animation || {};
      const updatedAnim = {
          ...currentAnim,
          [direction]: {
              ...(currentAnim[direction] || { type: 'none', duration: 0.5 }),
              ...animProps
          }
      };
  
      if (updatedAnim[direction]?.type === 'none') {
          delete updatedAnim[direction];
      }
  
      onUpdate({ animation: updatedAnim });
  }, [onUpdate, clip.animation]);

  const defaultTransform: Transform = { position: { x: 0, y: 0 }, scale: 100, rotation: 0, opacity: 100 };
  const defaultTextStyle: React.CSSProperties = { color: '#ffffff', fontSize: '48px', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.7)', letterSpacing: '0px' };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow space-y-1 -mx-2 overflow-y-auto pr-1">
        <div className="px-2">
            <label className="text-xs text-text-tertiary font-medium block mb-1">Name</label>
            <input
              type="text"
              value={localClip.name}
              onChange={(e) => setLocalClip(c => ({...c, name: e.target.value}))}
              onBlur={() => handleUpdate({ name: localClip.name })}
              className="w-full bg-black/40 border border-white/10 py-1.5 px-3 text-sm placeholder-text-tertiary focus:ring-2 focus:ring-white focus:outline-none transition-colors rounded-md"
            />
        </div>

        <Accordion title="Timing">
          <div className="grid grid-cols-2 gap-4 px-2">
            <div>
              <label className="text-xs text-text-tertiary font-medium block mb-1">Start</label>
              <input type="number" step="0.01" value={localClip.start.toFixed(2)} onChange={e => setLocalClip(c => ({...c, start: parseFloat(e.target.value) || 0}))} onBlur={() => handleUpdate({ start: localClip.start })} className="w-full bg-black/40 border border-white/10 py-1.5 px-3 text-sm rounded-md"/>
            </div>
            <div>
              <label className="text-xs text-text-tertiary font-medium block mb-1">Duration</label>
              <input type="number" step="0.01" value={localClip.duration.toFixed(2)} onChange={e => setLocalClip(c => ({...c, duration: parseFloat(e.target.value) || 0}))} onBlur={() => handleUpdate({ duration: localClip.duration })} className="w-full bg-black/40 border border-white/10 py-1.5 px-3 text-sm rounded-md"/>
            </div>
          </div>
        </Accordion>

        {(clip.type === 'video' || clip.type === 'text' || clip.type === 'image') && (
          <Accordion title="Transform">
            <div className="px-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-text-tertiary font-medium block mb-1">Position X</label>
                    <input type="number" value={clip.transform?.position.x || 0} onChange={e => handleTransformUpdate({ position: { x: parseInt(e.target.value), y: clip.transform?.position.y || 0 } })} className="w-full bg-black/40 border border-white/10 py-1.5 px-3 text-sm rounded-md"/>
                  </div>
                  <div>
                    <label className="text-xs text-text-tertiary font-medium block mb-1">Position Y</label>
                    <input type="number" value={clip.transform?.position.y || 0} onChange={e => handleTransformUpdate({ position: { x: clip.transform?.position.x || 0, y: parseInt(e.target.value) } })} className="w-full bg-black/40 border border-white/10 py-1.5 px-3 text-sm rounded-md"/>
                  </div>
              </div>
              <SliderInput label="Scale" value={clip.transform?.scale || 100} onChange={v => handleTransformUpdate({ scale: v })} min={0} max={500} step={1} unit="%"/>
              <SliderInput label="Rotation" value={clip.transform?.rotation || 0} onChange={v => handleTransformUpdate({ rotation: v })} min={-180} max={180} step={1} unit="°"/>
              <SliderInput label="Opacity" value={clip.transform?.opacity || 100} onChange={v => handleTransformUpdate({ opacity: v })} min={0} max={100} step={1} unit="%"/>
            </div>
          </Accordion>
        )}
        
        {clip.type === 'image' && (
            <Accordion title="Effects" defaultOpen={true}>
              <div className="px-2 space-y-2">
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-md">
                      <label htmlFor="ken-burns-toggle" className="text-sm font-semibold text-text-primary cursor-pointer">
                          Ken Burns Effect
                          <p className="text-xs font-normal text-text-tertiary">A subtle zoom-in animation.</p>
                      </label>
                      <label htmlFor="ken-burns-toggle" className="flex items-center cursor-pointer">
                          <div className="relative">
                              <input 
                                  id="ken-burns-toggle" 
                                  type="checkbox" 
                                  className="sr-only" 
                                  checked={!!clip.hasKenBurns}
                                  onChange={(e) => onUpdate({ hasKenBurns: e.target.checked })}
                              />
                              <div className={`block w-10 h-6 rounded-full ${clip.hasKenBurns ? 'bg-accent-red' : 'bg-white/20'}`}></div>
                              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${clip.hasKenBurns ? 'translate-x-4' : ''}`}></div>
                          </div>
                      </label>
                  </div>
              </div>
            </Accordion>
        )}

        {(clip.type === 'audio' || clip.type === 'video') && (
          <Accordion title="Audio">
            <div className="px-2 space-y-4">
              <SliderInput label="Volume" value={clip.volume ?? 100} onChange={v => handleUpdate({ volume: v })} min={0} max={100} step={1} unit="%"/>
            </div>
          </Accordion>
        )}

        {clip.type === 'text' && (
          <>
            <Accordion title="Text Content">
              <div className="px-2">
                <textarea
                    value={clip.content || ''}
                    onChange={(e) => handleUpdate({ content: e.target.value })}
                    rows={4}
                    className="w-full bg-black/40 border border-white/10 py-1.5 px-3 text-sm placeholder-text-tertiary focus:ring-2 focus:ring-white focus:outline-none transition-colors rounded-md"
                />
              </div>
            </Accordion>
            <Accordion title="Text Style">
                <div className="px-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-text-tertiary font-medium block mb-1">Font Size</label>
                            <input type="number" value={parseInt(String(clip.style?.fontSize) || '48')} onChange={e => handleStyleUpdate({ fontSize: `${parseInt(e.target.value)}px` })} className="w-full bg-black/40 border border-white/10 py-1.5 px-3 text-sm rounded-md"/>
                        </div>
                        <div>
                            <label className="text-xs text-text-tertiary font-medium block mb-1">Color</label>
                            <div className="relative w-full h-9">
                                <input type="color" value={String(clip.style?.color) || '#ffffff'} onChange={e => handleStyleUpdate({ color: e.target.value })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                                <div className="w-full h-full bg-black/40 border border-white/10 rounded-md flex items-center px-3" style={{ pointerEvents: 'none' }}>
                                    <div className="w-5 h-5 rounded-sm border border-white/20" style={{ backgroundColor: String(clip.style?.color) || '#ffffff' }}></div>
                                    <span className="ml-2 text-sm uppercase">{String(clip.style?.color) || '#FFFFFF'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-text-tertiary font-medium block mb-1">Font Weight</label>
                          <select value={String(clip.style?.fontWeight) || 'bold'} onChange={e => handleStyleUpdate({ fontWeight: e.target.value })} className="w-full bg-black/40 border border-white/10 py-1.5 px-3 text-sm rounded-md appearance-none">
                              <option value="normal">Normal</option>
                              <option value="bold">Bold</option>
                              <option value="lighter">Lighter</option>
                              <option value="bolder">Bolder</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-text-tertiary font-medium block mb-1">Letter Spacing</label>
                          <input type="number" value={parseInt(String(clip.style?.letterSpacing) || '0')} onChange={e => handleStyleUpdate({ letterSpacing: `${parseInt(e.target.value)}px` })} className="w-full bg-black/40 border border-white/10 py-1.5 px-3 text-sm rounded-md"/>
                        </div>
                    </div>
                    <div>
                      <label className="text-xs text-text-tertiary font-medium block mb-1">Text Shadow</label>
                       <div className="p-3 bg-black/20 rounded-md space-y-2">
                          <p className="text-xs text-text-tertiary">Note: Not yet implemented.</p>
                       </div>
                    </div>
                </div>
            </Accordion>
            <Accordion title="Animation" defaultOpen={false}>
              <div className="px-2 space-y-4">
                <div>
                  <h4 className="text-xs text-text-secondary font-semibold mb-2">Intro Animation</h4>
                  <div className="p-3 bg-black/20 rounded-md space-y-3">
                    <div>
                      <label className="text-xs text-text-tertiary font-medium block mb-1">Type</label>
                      <select
                        value={clip.animation?.in?.type || 'none'}
                        onChange={e => handleAnimationUpdate('in', { type: e.target.value as Animation['type'] })}
                        className="w-full bg-black/40 border border-white/10 py-1.5 px-3 text-sm rounded-md appearance-none"
                      >
                        <option value="none">None</option>
                        <option value="fade">Fade In</option>
                        <option value="slide-top">Slide from Top</option>
                        <option value="slide-bottom">Slide from Bottom</option>
                        <option value="slide-left">Slide from Left</option>
                        <option value="slide-right">Slide from Right</option>
                        <option value="zoom">Zoom In</option>
                      </select>
                    </div>
                    {clip.animation?.in?.type && clip.animation?.in?.type !== 'none' && (
                      <div>
                        <label className="text-xs text-text-tertiary font-medium block mb-1">Duration (s)</label>
                        <input
                          type="number" step="0.1" min="0.1" max={clip.duration / 2}
                          value={clip.animation?.in?.duration || 0.5}
                          onChange={e => handleAnimationUpdate('in', { duration: Math.max(0.1, parseFloat(e.target.value) || 0.5) })}
                          className="w-full bg-black/40 border border-white/10 py-1.5 px-3 text-sm rounded-md"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs text-text-secondary font-semibold mb-2">Outro Animation</h4>
                  <div className="p-3 bg-black/20 rounded-md space-y-3">
                    <div>
                      <label className="text-xs text-text-tertiary font-medium block mb-1">Type</label>
                      <select
                        value={clip.animation?.out?.type || 'none'}
                        onChange={e => handleAnimationUpdate('out', { type: e.target.value as Animation['type'] })}
                        className="w-full bg-black/40 border border-white/10 py-1.5 px-3 text-sm rounded-md appearance-none"
                      >
                        <option value="none">None</option>
                        <option value="fade">Fade Out</option>
                        <option value="slide-top">Slide to Top</option>
                        <option value="slide-bottom">Slide to Bottom</option>
                        <option value="slide-left">Slide to Left</option>
                        <option value="slide-right">Slide to Right</option>
                        <option value="zoom">Zoom Out</option>
                      </select>
                    </div>
                    {clip.animation?.out?.type && clip.animation?.out?.type !== 'none' && (
                      <div>
                        <label className="text-xs text-text-tertiary font-medium block mb-1">Duration (s)</label>
                        <input
                          type="number" step="0.1" min="0.1" max={clip.duration / 2}
                          value={clip.animation?.out?.duration || 0.5}
                          onChange={e => handleAnimationUpdate('out', { duration: Math.max(0.1, parseFloat(e.target.value) || 0.5) })}
                          className="w-full bg-black/40 border border-white/10 py-1.5 px-3 text-sm rounded-md"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Accordion>
          </>
        )}
        
        {clip.type === 'adjustment' && clip.effects && (
          <Accordion title="Effects">
              <div className="space-y-3 px-2">
                  {clip.effects.map((effect, index) => (
                      <EffectControl 
                          key={index}
                          effect={effect}
                          onUpdate={(updatedEffect) => {
                              const newEffects = [...(clip.effects || [])];
                              newEffects[index] = updatedEffect;
                              handleUpdate({ effects: newEffects });
                          }}
                      />
                  ))}
              </div>
          </Accordion>
        )}
      </div>
      <div className="flex-shrink-0 pt-4">
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center text-sm font-semibold bg-accent-red/20 text-accent-red hover:bg-accent-red hover:text-white transition-colors duration-200 px-4 py-2 rounded-md"
        >
          <TrashIcon /> Delete Clip
        </button>
      </div>
    </div>
  );
};

export default ClipPropertiesPanel;