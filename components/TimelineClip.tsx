import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Clip, MediaAsset, EditorTool } from '../types';

interface TimelineClipProps {
  clip: Clip;
  asset?: MediaAsset;
  onUpdate: (id: string, newProps: Partial<Clip>) => void;
  onUpdateLive: (id: string | null, newProps: Partial<Clip> | null) => void;
  pixelsPerSecond: number;
  trackWidth: number;
  onSelect: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  isSelected: boolean;
  siblings: Clip[];
  allClips: Clip[];
  onInteractionChange: (isInteracting: boolean) => void;
  playheadTime: number;
  onSetSnapLine: (position: number | null) => void;
  isGrouped: boolean;
  groupColor?: string;
  isLocked?: boolean;
  isMagnetic: boolean;
  activeTool: EditorTool;
}

const MIN_CLIP_DURATION_SECONDS = 0.1;
const SNAP_THRESHOLD_PX = 8;
const DRAG_THRESHOLD_PX = 4;

const EffectsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 mr-1.5 opacity-80"><path fillRule="evenodd" d="M9 4.5a.75.75 0 01.75.75l.001 3.744c.483.132.936.335 1.355.596l2.126-2.126a.75.75 0 111.06 1.06l-2.126 2.126c.262.42.464.872.596 1.355l3.744.001a.75.75 0 010 1.5l-3.744-.001c-.132.483-.335.936-.596 1.355l2.126 2.126a.75.75 0 11-1.06 1.06l-2.126-2.126a4.473 4.473 0 01-1.355.596l-.001 3.744a.75.75 0 01-1.5 0l.001-3.744a4.473 4.473 0 01-1.355-.596l-2.126 2.126a.75.75 0 11-1.06-1.06l2.126-2.126a4.473 4.473 0 01-.596-1.355l-3.744-.001a.75.75 0 010-1.5l3.744.001c.132-.483.335.936.596-1.355L4.09 8.68a.75.75 0 111.06-1.06l2.126 2.126c.42-.262.872-.464 1.355-.596L8.63 5.25a.75.75 0 01.75-.75zm-3.122 8.016a3 3 0 116 0 3 3 0 01-6 0z" clipRule="evenodd" /></svg>;

const TimelineClip: React.FC<TimelineClipProps> = ({ clip, asset, onUpdate, onUpdateLive, pixelsPerSecond, trackWidth, onSelect, onMouseDown, isSelected, siblings, allClips, onInteractionChange, playheadTime, onSetSnapLine, isGrouped, groupColor, isLocked, isMagnetic, activeTool }) => {
  const clipRef = useRef<HTMLDivElement>(null);
  const [interactionStyles, setInteractionStyles] = useState<React.CSSProperties>({});

  const interactionRef = useRef({
    startX: 0,
    initialMouseX: 0,
    isDragging: false,
    originalStart: 0,
    originalDuration: 0,
    originalTrimStart: 0,
    type: null as 'drag' | 'resizeLeft' | 'resizeRight' | 'slip' | null,
    snapTargets: [] as { time: number; type: string }[]
  });

  const getSnapTargets = useCallback(() => {
    const targets = [
      { time: 0, type: 'timeline-start' },
    ];
    allClips.forEach(c => {
      targets.push({ time: c.start, type: 'clip-edge' });
      targets.push({ time: c.start + c.duration, type: 'clip-edge' });
    });

    // Deduplicate targets by time, ensuring a consistent set of snap points.
    const uniqueTargets = Array.from(new Map(targets.map(t => [t.time, t])).values());
    
    return uniqueTargets;
  }, [allClips]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const state = interactionRef.current;
    if (!state.type) return;

    if (!state.isDragging) {
        if (Math.abs(e.clientX - state.initialMouseX) > DRAG_THRESHOLD_PX) {
            state.isDragging = true;
            onInteractionChange(true);
            let cursor = 'grabbing';
            if (state.type.startsWith('resize')) cursor = 'ew-resize';
            if (state.type === 'slip') cursor = 'ew-resize';
            document.body.style.cursor = cursor;
        } else {
            return; 
        }
    }
    
    e.preventDefault();
    const isSnappingDisabled = e.shiftKey;
    const shouldSnap = isMagnetic && !isSnappingDisabled;
    const dx = e.clientX - state.startX;
    let snapLineTime: number | null = null;
    let newInteractionStyles: React.CSSProperties = {};

    const dynamicSnapTargets = shouldSnap ? [...state.snapTargets, { time: playheadTime, type: 'playhead' }] : [];
    
    if (state.type === 'drag') {
        let newStart = state.originalStart + (dx / pixelsPerSecond);
        const clipEnd = newStart + clip.duration;

        if (shouldSnap) {
            for (const target of dynamicSnapTargets) {
                if (Math.abs(newStart * pixelsPerSecond - target.time * pixelsPerSecond) < SNAP_THRESHOLD_PX) {
                    newStart = target.time;
                    snapLineTime = target.time;
                    break;
                }
                if (Math.abs(clipEnd * pixelsPerSecond - target.time * pixelsPerSecond) < SNAP_THRESHOLD_PX) {
                    newStart = target.time - clip.duration;
                    snapLineTime = target.time;
                    break;
                }
            }
        }
        
        // Clamp to timeline boundaries
        newStart = Math.max(0, newStart);
        
        // Prevent collision if not magnetic
        if (!isMagnetic) {
          for (const sibling of siblings) {
            if (newStart < sibling.start + sibling.duration && newStart + clip.duration > sibling.start) {
              return; // Collision detected, stop move
            }
          }
        }
        
        newInteractionStyles = {
          transform: `translateX(${newStart * pixelsPerSecond}px)`
        };
        onUpdateLive(clip.id, { start: newStart });

    } else if (state.type === 'resizeLeft') {
        let newStart = state.originalStart + (dx / pixelsPerSecond);
        let newDuration = state.originalDuration - (dx / pixelsPerSecond);
        
        if (shouldSnap) {
            for (const target of dynamicSnapTargets) {
                if (Math.abs(newStart * pixelsPerSecond - target.time * pixelsPerSecond) < SNAP_THRESHOLD_PX) {
                    const delta = newStart - target.time;
                    newStart = target.time;
                    newDuration += delta;
                    snapLineTime = target.time;
                    break;
                }
            }
        }

        if (newDuration < MIN_CLIP_DURATION_SECONDS) {
            newDuration = MIN_CLIP_DURATION_SECONDS;
            newStart = state.originalStart + state.originalDuration - MIN_CLIP_DURATION_SECONDS;
        }
        
        newStart = Math.max(0, newStart);

        if (!isMagnetic) {
            for (const sibling of siblings) {
                if (newStart < sibling.start + sibling.duration && newStart > sibling.start) {
                    return; // Collision
                }
            }
        }

        newInteractionStyles = {
            width: `${newDuration * pixelsPerSecond}px`,
            transform: `translateX(${newStart * pixelsPerSecond}px)`
        };
        onUpdateLive(clip.id, { start: newStart, duration: newDuration });

    } else if (state.type === 'resizeRight') {
        let newDuration = state.originalDuration + (dx / pixelsPerSecond);
        const clipEnd = state.originalStart + newDuration;

        if (shouldSnap) {
            for (const target of dynamicSnapTargets) {
                if (Math.abs(clipEnd * pixelsPerSecond - target.time * pixelsPerSecond) < SNAP_THRESHOLD_PX) {
                    newDuration = target.time - state.originalStart;
                    snapLineTime = target.time;
                    break;
                }
            }
        }
        
        if (newDuration < MIN_CLIP_DURATION_SECONDS) {
            newDuration = MIN_CLIP_DURATION_SECONDS;
        }

        if (!isMagnetic) {
            for (const sibling of siblings) {
                if (clip.start < sibling.start + sibling.duration && clip.start + newDuration > sibling.start) {
                    return; // Collision
                }
            }
        }

        newInteractionStyles = {
            width: `${newDuration * pixelsPerSecond}px`
        };
        onUpdateLive(clip.id, { duration: newDuration });

    } else if (state.type === 'slip') {
        if (!asset || asset.duration <= clip.duration) return;

        const maxTrimStart = asset.duration - clip.duration;
        let newTrimStart = state.originalTrimStart - (dx / pixelsPerSecond);
        newTrimStart = Math.max(0, Math.min(newTrimStart, maxTrimStart));
        
        onUpdateLive(clip.id, { trimStart: newTrimStart });
    }

    onSetSnapLine(snapLineTime);
    setInteractionStyles(newInteractionStyles);
  }, [clip.id, clip.duration, pixelsPerSecond, onInteractionChange, onUpdateLive, playheadTime, onSetSnapLine, isMagnetic, siblings, asset]);

  const handleMouseDownOnClip = useCallback((e: React.MouseEvent<HTMLDivElement>, type: 'drag' | 'resizeLeft' | 'resizeRight') => {
    if (e.button !== 0 || isLocked) return;
    
    e.stopPropagation();
    onMouseDown(e);

    let interactionType: 'drag' | 'resizeLeft' | 'resizeRight' | 'slip' = type;
    if (activeTool === 'slip' && type === 'drag' && (clip.type === 'video' || clip.type === 'audio')) {
        interactionType = 'slip';
    }
    
    interactionRef.current = {
      startX: e.clientX,
      initialMouseX: e.clientX,
      isDragging: false,
      originalStart: clip.start,
      originalDuration: clip.duration,
      originalTrimStart: clip.trimStart || 0,
      type: interactionType,
      snapTargets: getSnapTargets(),
    };
    
    onSelect(e);
  }, [clip.start, clip.duration, clip.trimStart, isLocked, getSnapTargets, onSelect, onMouseDown, activeTool, clip.type]);
  
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const state = interactionRef.current;
      if (!state.type) return;

      if (state.isDragging) {
        e.preventDefault();
        e.stopPropagation();

        let finalProps: Partial<Clip> = {};
        const dx = e.clientX - state.startX;
        const dynamicSnapTargets = isMagnetic && !e.shiftKey ? [...state.snapTargets, { time: playheadTime, type: 'playhead' }] : [];

        if (state.type === 'drag') {
          let newStart = state.originalStart + (dx / pixelsPerSecond);
          
          if (dynamicSnapTargets.length > 0) {
            const clipEnd = newStart + clip.duration;
            for (const target of dynamicSnapTargets) {
              if (Math.abs(newStart * pixelsPerSecond - target.time * pixelsPerSecond) < SNAP_THRESHOLD_PX) {
                newStart = target.time;
                break;
              }
              if (Math.abs(clipEnd * pixelsPerSecond - target.time * pixelsPerSecond) < SNAP_THRESHOLD_PX) {
                newStart = target.time - clip.duration;
                break;
              }
            }
          }
          newStart = Math.max(0, newStart);
          finalProps.start = newStart;
        } else if (state.type === 'resizeLeft') {
          let newStart = state.originalStart + (dx / pixelsPerSecond);
          let newDuration = state.originalDuration - (dx / pixelsPerSecond);
          if (dynamicSnapTargets.length > 0) {
            for (const target of dynamicSnapTargets) {
              if (Math.abs(newStart * pixelsPerSecond - target.time * pixelsPerSecond) < SNAP_THRESHOLD_PX) {
                const delta = newStart - target.time;
                newStart = target.time;
                newDuration += delta;
                break;
              }
            }
          }
          if (newDuration < MIN_CLIP_DURATION_SECONDS) {
            newDuration = MIN_CLIP_DURATION_SECONDS;
            newStart = state.originalStart + state.originalDuration - MIN_CLIP_DURATION_SECONDS;
          }
          newStart = Math.max(0, newStart);
          finalProps = { start: newStart, duration: newDuration };
        } else if (state.type === 'resizeRight') {
          let newDuration = state.originalDuration + (dx / pixelsPerSecond);
          if (dynamicSnapTargets.length > 0) {
            const clipEnd = state.originalStart + newDuration;
            for (const target of dynamicSnapTargets) {
              if (Math.abs(clipEnd * pixelsPerSecond - target.time * pixelsPerSecond) < SNAP_THRESHOLD_PX) {
                newDuration = target.time - state.originalStart;
                break;
              }
            }
          }
          if (newDuration < MIN_CLIP_DURATION_SECONDS) {
            newDuration = MIN_CLIP_DURATION_SECONDS;
          }
          finalProps.duration = newDuration;
        } else if (state.type === 'slip') {
          if (asset && asset.duration > clip.duration) {
            const maxTrimStart = asset.duration - clip.duration;
            let newTrimStart = state.originalTrimStart - (dx / pixelsPerSecond);
            newTrimStart = Math.max(0, Math.min(newTrimStart, maxTrimStart));
            finalProps.trimStart = newTrimStart;
          }
        }
        
        if (Object.keys(finalProps).length > 0) {
            onUpdate(clip.id, finalProps);
        }
      }

      interactionRef.current.type = null;
      interactionRef.current.isDragging = false;
      document.body.style.cursor = 'default';
      setInteractionStyles({});
      onUpdateLive(null, null);
      onInteractionChange(false);
      onSetSnapLine(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, onUpdate, pixelsPerSecond, isMagnetic, onInteractionChange, onUpdateLive, onSetSnapLine, clip.id, clip.duration, asset, playheadTime]);
  
  const clipWidth = clip.duration * pixelsPerSecond;
  
  const clipStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: `${clipWidth}px`,
    transform: `translateX(${clip.start * pixelsPerSecond}px)`,
    zIndex: isSelected ? 20 : 10,
    ...interactionStyles
  };

  const clipBaseColor = clip.type === 'video' ? 'bg-sky-900/80' : clip.type === 'text' ? 'bg-purple-900/80' : clip.type === 'audio' ? 'bg-green-900/80' : 'bg-slate-700/80';
  const clipBorderColor = isSelected ? 'border-accent-red' : isGrouped ? `border-[${groupColor}]` : 'border-black/50';
  const cursorClass = isLocked 
    ? 'cursor-not-allowed' 
    : activeTool === 'slip' && (clip.type === 'video' || clip.type === 'audio')
    ? 'cursor-ew-resize'
    : 'cursor-grab';
  const isTooShortForText = clipWidth < 50;
  const isSlipping = interactionRef.current.isDragging && interactionRef.current.type === 'slip';

  return (
    <div
      ref={clipRef}
      data-clip-id={clip.id}
      style={clipStyle}
      className={`clip h-10 top-2 rounded-md border-2 ${clipBaseColor} ${clipBorderColor} shadow-md flex items-center justify-between px-1 relative select-none transition-transform duration-100 ease-linear ${cursorClass}`}
      onMouseDown={(e) => handleMouseDownOnClip(e, 'drag')}
    >
      {!isLocked && activeTool === 'select' && (
        <>
            <div 
              className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-20" 
              onMouseDown={(e) => handleMouseDownOnClip(e, 'resizeLeft')} 
            />
            <div 
              className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-20" 
              onMouseDown={(e) => handleMouseDownOnClip(e, 'resizeRight')} 
            />
        </>
      )}

      {isSlipping && (
        <div className="absolute inset-0 overflow-hidden rounded-md">
            {clip.type === 'video' && asset?.thumbnail ? (
                <>
                    <img
                        src={asset.thumbnail}
                        alt="media preview"
                        className="absolute top-0 h-full object-cover"
                        style={{
                            width: `${asset.duration * pixelsPerSecond}px`,
                            transform: `translateX(-${(clip.trimStart || 0) * pixelsPerSecond}px)`,
                            imageRendering: 'crisp-edges',
                        }}
                        draggable={false}
                    />
                    <div className="absolute inset-0 bg-black/40"></div>
                </>
            ) : (
                 <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <p className="text-white font-bold text-xs z-10 drop-shadow-lg">SLIP</p>
                </div>
            )}
        </div>
      )}

      <div className={`flex-1 min-w-0 flex items-center h-full px-1 overflow-hidden pointer-events-none ${isSlipping ? 'opacity-0' : ''}`}>
        {clip.type === 'adjustment' && <EffectsIcon />}
        <p className={`text-xs font-semibold text-white truncate ${isTooShortForText ? 'opacity-0' : ''}`}>
          {clip.name}
        </p>
      </div>

      {isGrouped && (
        <div 
          className="absolute -top-[7px] -left-[7px] w-2.5 h-2.5 rounded-full border-2" 
          style={{ backgroundColor: groupColor, borderColor: 'rgba(255,255,255,0.8)' }}
          title="Part of a group"
        />
      )}
    </div>
  );
};

export default TimelineClip;