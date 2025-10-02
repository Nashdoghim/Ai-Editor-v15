


import React from 'react';
import { Clip } from '../types';

interface PreviewProps {
  videoRefA: React.RefObject<HTMLVideoElement>;
  videoRefB: React.RefObject<HTMLVideoElement>;
  activePlayer: 'A' | 'B';
  clipA: Clip | null;
  srcA: string;
  clipB: Clip | null;
  srcB: string;
  activeTextClips: Clip[];
  isPreviewedClipSelected: boolean;
  adjustmentFilter: string;
  currentTime: number;
}

const Preview: React.FC<PreviewProps> = ({ 
  videoRefA, videoRefB, activePlayer, clipA, srcA, clipB, srcB,
  activeTextClips, isPreviewedClipSelected, adjustmentFilter, currentTime
}) => {

  const getPlayerStyle = (clip: Clip | null, isActive: boolean): React.CSSProperties => {
    if (!clip) return { opacity: 0, transition: 'opacity 0.15s linear' };

    const { transform = { position: { x: 0, y: 0 }, scale: 100, rotation: 0, opacity: 100 } } = clip;
    const { position, scale: userScale, rotation, opacity: userOpacity } = transform;
    
    let finalScale = userScale / 100;
    let finalOpacity = isActive ? (userOpacity / 100) : 0;
    
    const timeIntoClip = currentTime - clip.start;

    if (isActive) { // Only apply effects to the active player
        // Ken Burns Effect for images
        if (clip.type === 'image' && clip.hasKenBurns && clip.duration > 0) {
            const progress = Math.max(0, Math.min(1, timeIntoClip / clip.duration));
            const kenBurnsZoom = 1 + progress * 0.1; // 100% to 110% zoom
            finalScale *= kenBurnsZoom;
        }

        // Fade In Effect as requested
        const FADE_IN_DURATION = 1.0;
        if (clip.type === 'image' && clip.hasKenBurns && timeIntoClip >= 0 && timeIntoClip < FADE_IN_DURATION) {
            finalOpacity *= (timeIntoClip / FADE_IN_DURATION);
        }
    }

    return {
      transform: `translate(${position.x}px, ${position.y}px) scale(${finalScale}) rotate(${rotation}deg)`,
      opacity: finalOpacity,
      transition: 'transform 0.05s linear, opacity 0.15s linear',
    };
  };

  return (
    <div className={`relative aspect-video w-full max-h-full bg-black shadow-2xl group overflow-hidden rounded-lg transition-all duration-300 ${isPreviewedClipSelected ? 'ring-4 ring-accent-red shadow-[0_0_25px_rgba(255,45,85,0.5)]' : 'ring-1 ring-white/5'}`}>
      <div
        className="absolute inset-0 w-full h-full"
        style={{ filter: adjustmentFilter, transition: 'filter 0.05s linear' }}
      >
        {/* Player A */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={getPlayerStyle(clipA, activePlayer === 'A')}
        >
          {clipA?.type === 'video' && (
            <video
              ref={videoRefA}
              className="w-full h-full object-contain"
              muted
              playsInline
            />
          )}
          {clipA?.type === 'image' && srcA && (
            <img 
              src={srcA} 
              alt={clipA.name}
              className="w-full h-full object-contain"
            />
          )}
        </div>
        {/* Player B */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={getPlayerStyle(clipB, activePlayer === 'B')}
        >
          {clipB?.type === 'video' && (
            <video
              ref={videoRefB}
              className="w-full h-full object-contain"
              muted
              playsInline
            />
          )}
          {clipB?.type === 'image' && srcB && (
            <img 
              src={srcB} 
              alt={clipB.name}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {activeTextClips.map(clip => {
          const { transform, style, content, animation } = clip;
          
          const userTransformStyle = transform ? {
              transform: `translate(${transform.position.x}px, ${transform.position.y}px) scale(${transform.scale / 100}) rotate(${transform.rotation}deg)`,
              opacity: transform.opacity / 100
          } : {};

          let animationStyle: React.CSSProperties = {};
          const timeIntoClip = currentTime - clip.start;
          const timeBeforeEnd = (clip.start + clip.duration) - currentTime;

          const animIn = animation?.in;
          if (animIn && animIn.type !== 'none' && animIn.duration > 0 && timeIntoClip >= 0 && timeIntoClip < animIn.duration) {
              const progress = timeIntoClip / animIn.duration;
              switch (animIn.type) {
                  case 'fade':
                      animationStyle.opacity = progress;
                      break;
                  case 'zoom':
                      animationStyle.opacity = progress;
                      animationStyle.transform = `scale(${0.5 + 0.5 * progress})`;
                      break;
                  case 'slide-top':
                      animationStyle.opacity = progress;
                      animationStyle.transform = `translateY(${-50 + 50 * progress}%)`;
                      break;
                  case 'slide-bottom':
                      animationStyle.opacity = progress;
                      animationStyle.transform = `translateY(${50 - 50 * progress}%)`;
                      break;
                  case 'slide-left':
                      animationStyle.opacity = progress;
                      animationStyle.transform = `translateX(${-50 + 50 * progress}%)`;
                      break;
                  case 'slide-right':
                      animationStyle.opacity = progress;
                      animationStyle.transform = `translateX(${50 - 50 * progress}%)`;
                      break;
              }
          }

          const animOut = animation?.out;
          if (animOut && animOut.type !== 'none' && animOut.duration > 0 && timeBeforeEnd >= 0 && timeBeforeEnd < animOut.duration) {
              const progress = timeBeforeEnd / animOut.duration; // progress goes from 1 to 0
              switch (animOut.type) {
                  case 'fade':
                      animationStyle.opacity = progress;
                      break;
                  case 'zoom':
                      animationStyle.opacity = progress;
                      animationStyle.transform = `scale(${0.5 + 0.5 * progress})`;
                      break;
                  case 'slide-top': // Slide TO top
                      animationStyle.opacity = progress;
                      animationStyle.transform = `translateY(${-50 * (1 - progress)}%)`;
                      break;
                  case 'slide-bottom': // Slide TO bottom
                      animationStyle.opacity = progress;
                      animationStyle.transform = `translateY(${50 * (1 - progress)}%)`;
                      break;
                  case 'slide-left': // Slide TO left
                      animationStyle.opacity = progress;
                      animationStyle.transform = `translateX(${-50 * (1 - progress)}%)`;
                      break;
                  case 'slide-right': // Slide TO right
                      animationStyle.opacity = progress;
                      animationStyle.transform = `translateX(${50 * (1 - progress)}%)`;
                      break;
              }
          }

          return (
            <div key={clip.id} style={{...animationStyle, position: 'absolute' }}>
              <div style={userTransformStyle}>
                <div style={style}>{content}</div>
              </div>
            </div>
          );
        })}
      </div>
      { !clipA && !clipB &&
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black">
            <p className="text-text-secondary text-center">Import media and drag it to the timeline to begin.</p>
        </div>
      }
    </div>
  );
};

export default Preview;