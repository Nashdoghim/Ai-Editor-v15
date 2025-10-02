

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import IconSidebar from './components/IconSidebar';
import LeftPanel from './components/Sidebar';
import Preview from './components/Preview';
import Timeline from './components/Timeline';
import Header from './components/Header';
import RightPanel from './components/RightPanel';
import { GoogleGenAI, FunctionDeclaration, Type, GenerateContentResponse, Chat } from '@google/genai';
import { Effect, Transform, Clip, Track, MediaAsset, StockAsset, Group, ChatMessage, EditorTool, ActivePanel, Animation } from './types';

// A custom hook to manage state history for undo/redo functionality.
const useHistory = <T,>(initialState: T) => {
  const [state, setStateInternal] = useState({
    history: [initialState],
    index: 0,
  });
  const { history, index } = state;

  const setState = useCallback((action: T | ((prevState: T) => T)) => {
    setStateInternal(currentFullState => {
      const { history: currentHistory, index: currentIndex } = currentFullState;
      const currentState = currentHistory[currentIndex];
      const newState = typeof action === 'function' 
        ? (action as (prevState: T) => T)(currentState) 
        : action;
      
      if (JSON.stringify(newState) === JSON.stringify(currentState)) {
          return currentFullState;
      }

      const newHistory = currentHistory.slice(0, currentIndex + 1);
      newHistory.push(newState);
      
      return {
        history: newHistory,
        index: newHistory.length - 1
      };
    });
  }, []);

  const undo = useCallback(() => {
    setStateInternal(currentFullState => {
      if (currentFullState.index > 0) {
        return { ...currentFullState, index: currentFullState.index - 1 };
      }
      return currentFullState;
    });
  }, []);

  const redo = useCallback(() => {
    setStateInternal(currentFullState => {
      if (currentFullState.index < currentFullState.history.length - 1) {
        return { ...currentFullState, index: currentFullState.index - 1 };
      }
      return currentFullState;
    });
  }, []);

  return {
    state: history[index],
    setState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
  };
};

type GeminiApiPart = { text: string } | { functionCall: any } | { functionResponse: any };
interface GeminiApiContent {
    role: string;
    parts: GeminiApiPart[];
}

interface EditorState {
  tracks: Track[];
  selectedClipIds: string[];
  groups: Group[];
}


// Metadata generation utility
const generateVideoMetadata = (file: File): Promise<{ thumbnail: string, duration: number, width: number, height: number }> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    video.src = URL.createObjectURL(file);
    video.onloadeddata = () => {
      video.currentTime = 1; // Seek to 1 second for thumbnail
    };
    video.onseeked = () => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve({
          thumbnail: canvas.toDataURL('image/jpeg'),
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        });
      }
      // No need to revoke here, the file's URL is revoked when the asset is deleted
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve({ thumbnail: '', duration: 0, width: 0, height: 0 });
    };
  });
};

const generateImageMetadata = (file: File): Promise<{ thumbnail: string, duration: number, width: number, height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    const fileUrl = URL.createObjectURL(file);
    img.src = fileUrl;
    img.onload = () => {
      resolve({
        thumbnail: fileUrl, // For images, the URL itself can be the thumbnail
        duration: 5, // Default duration for an image clip
        width: img.width,
        height: img.height,
      });
      // Do not revoke here, URL is used for the asset
    };
    img.onerror = () => {
      URL.revokeObjectURL(fileUrl);
      resolve({ thumbnail: '', duration: 5, width: 0, height: 0 });
    };
  });
};

const generateAudioMetadata = (file: File): Promise<{ duration: number, sampleRate?: number }> => {
  return new Promise((resolve) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        resolve({
          duration: buffer.duration,
          sampleRate: buffer.sampleRate
        });
      } catch (error) {
        console.warn('Could not decode audio data, falling back to audio element for duration only.', error);
        // Fallback for formats not supported by decodeAudioData, e.g. some .wav files.
        const audio = document.createElement('audio');
        audio.preload = 'metadata'; // We only need metadata
        audio.src = URL.createObjectURL(file);
        audio.onloadedmetadata = () => {
          resolve({ duration: audio.duration });
          URL.revokeObjectURL(audio.src); // Revoke temporary URL for this element
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audio.src);
          resolve({ duration: 0 });
        };
      }
    };
    reader.onerror = () => {
        resolve({ duration: 0 });
    };
    
    reader.readAsArrayBuffer(file);
  });
};

const useVideoPlayerController = (
    playerRef: React.RefObject<HTMLVideoElement>,
    clipId: string | null,
    isActive: boolean,
    isPlaying: boolean,
    currentTime: number,
    playbackRate: number,
    mediaLibrary: MediaAsset[],
    tracks: Track[],
) => {
    const clip = useMemo(() => {
        if (!clipId) return null;
        for (const track of tracks) {
            const found = track.clips.find(c => c.id === clipId);
            if (found) return found;
        }
        return null;
    }, [clipId, tracks]);

    const asset = useMemo(() => {
        if (!clip?.assetId) return null;
        return mediaLibrary.find(m => m.id === clip.assetId);
    }, [clip, mediaLibrary]);

    useEffect(() => {
        const video = playerRef.current;
        if (!video) return;

        const src = asset?.status === 'ready' ? asset.url : '';
        
        // Update src if it has changed
        if (video.src !== src) {
            video.src = src;
            if(src) video.load();
        }
        
        if (!clip || !src || clip.type !== 'video') {
            if(!video.paused) video.pause();
            return;
        }

        const timeWithinVideo = (currentTime - clip.start) + (clip.trimStart || 0);
        video.playbackRate = playbackRate > 0 ? playbackRate : 1;

        if (isActive) {
            const timeDifference = Math.abs(video.currentTime - timeWithinVideo);
            if ((!isPlaying || timeDifference > 0.15) && !video.seeking) {
                video.currentTime = timeWithinVideo;
            }

            if (isPlaying && playbackRate > 0) {
                if (video.paused) video.play().catch(e => { if (e.name !== 'AbortError') console.error("Error playing video:", e); });
            } else {
                if (!video.paused) video.pause();
            }
        } 
        else {
            if (!video.paused) video.pause();
            const PRELOAD_OFFSET = 0.5;
            if (isPlaying && clip.start - currentTime < PRELOAD_OFFSET && !video.seeking) {
                 video.currentTime = clip.trimStart || 0;
            }
        }

    }, [playerRef, clip, asset, isActive, isPlaying, currentTime, playbackRate]);
};

const App: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(0);
  const [timelineDuration, setTimelineDuration] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
  const [stockMediaResults, setStockMediaResults] = useState<StockAsset[]>([]);
  const [copiedClip, setCopiedClip] = useState<Clip | null>(null);
  const [isSearchingStockMedia, setIsSearchingStockMedia] = useState(false);
  const [stockMediaSearchQuery, setStockMediaSearchQuery] = useState('');
  const [stockMediaProvider, setStockMediaProvider] = useState<'pexels' | 'pixabay'>('pexels');
  const [stockMediaInfoMessage, setStockMediaInfoMessage] = useState<string | null>(null);
  const [isMagnetic, setIsMagnetic] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const mediaLibraryRef = useRef(mediaLibrary);
  const [draggingAsset, setDraggingAsset] = useState<{ asset: MediaAsset | StockAsset; type: 'local' | 'stock' } | null>(null);
  mediaLibraryRef.current = mediaLibrary;
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [livePreviewClipUpdate, setLivePreviewClipUpdate] = useState<{ clipId: string; newProps: Partial<Clip> } | null>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const [activePanel, setActivePanel] = useState<ActivePanel>('media-library');
  
  // AI State
  const ai = useMemo(() => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    return apiKey ? new GoogleGenAI({ apiKey }) : null;
  }, []);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', parts: [{ text: ai ? "Hi! I'm your AI editing assistant. How can I help you? You can ask me to find stock media, add text, split clips, or apply effects." : "AI features are currently unavailable. Add VITE_GEMINI_API_KEY to your .env file to enable AI assistance. You can still use the editor manually!" }] }
  ]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const lastTriggeredClipId = useRef<string | null>(null);
  const suggestionTimeoutRef = useRef<number | null>(null);

  const aiChatRef = useRef<Chat | null>(null);
  const lastStockSearchResultsRef = useRef<StockAsset[]>([]);
  const lastCreatedClip = useRef<Clip | null>(null);

  // Video player state for seamless transitions
  const videoRefA = useRef<HTMLVideoElement>(null);
  const videoRefB = useRef<HTMLVideoElement>(null);
  const [playerAssignments, setPlayerAssignments] = useState<{ A: string | null; B: string | null }>({ A: null, B: null });
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');

  const initialState: EditorState = {
    tracks: [
      { id: 'track-3', name: 'Adjustment Layer', type: 'adjustment', clips: [], isLocked: false, isVisible: true },
      { id: 'track-2', name: 'Text/Graphics', type: 'text', clips: [], isLocked: false, isVisible: true },
      { id: 'track-1', name: 'Video Track', type: 'video', clips: [], isLocked: false, isVisible: true },
      { id: 'track-audio-1', name: 'Audio Track', type: 'audio', clips: [], isLocked: false, isVisible: true },
    ],
    selectedClipIds: [],
    groups: [],
  };

  const { state: editorState, setState: setEditorState, undo, redo, canUndo, canRedo } = useHistory<EditorState>(initialState);
  const { tracks, selectedClipIds, groups } = editorState;
  
  // Create a memoized version of the tracks that includes any live, non-history updates (e.g., from slip tool)
  const processedTracks = useMemo(() => {
    if (!livePreviewClipUpdate) {
        return tracks;
    }
    return tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip =>
            clip.id === livePreviewClipUpdate.clipId
                ? { ...clip, ...livePreviewClipUpdate.newProps }
                : clip
        ),
    }));
  }, [tracks, livePreviewClipUpdate]);
  
  const handleUpdateClipLive = useCallback((clipId: string | null, newProps: Partial<Clip> | null) => {
    if (clipId && newProps) {
        setLivePreviewClipUpdate({ clipId, newProps });
    } else {
        setLivePreviewClipUpdate(null);
    }
  }, []);

  // Effect for cleaning up blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      mediaLibraryRef.current.forEach(asset => {
        if (asset.url.startsWith('blob:')) {
          URL.revokeObjectURL(asset.url);
        }
      });
      // Also clean up audio elements
      const audioElements = audioElementsRef.current;
      for (const clipId in audioElements) {
          const audio = audioElements[clipId];
          audio.pause();
          if (audio.parentElement) {
            audio.parentElement.removeChild(audio);
          }
      }
    };
  }, []);

  const handleSeek = (time: number) => {
    if (isPlaying) {
      setIsPlaying(false);
    }
    setCurrentTime(time);
  };

  const handlePlayPause = useCallback(() => {
    const hasClips = tracks.some(t => t.clips.length > 0);
    if (hasClips || timelineDuration > 0) {
      if (!isPlaying && currentTime >= timelineDuration) {
        setCurrentTime(0);
      }
      setIsPlaying(prev => !prev);
      if (isPlaying) setPlaybackRate(1); // Reset playback rate on manual pause
    }
  }, [tracks, timelineDuration, isPlaying, currentTime]);
  
  const handleUpdateClip = useCallback((trackId: string, clipId: string, newProps: Partial<Clip>) => {
    setEditorState(prev => {
        const group = prev.groups.find(g => g.clipIds.includes(clipId));
        const originalTrack = prev.tracks.find(t => t.id === trackId);
        if (!originalTrack) return prev;
        const originalClip = originalTrack.clips.find(c => c.id === clipId);
        if (!originalClip) return prev;
        
        // Handle grouped clip movement (non-magnetic)
        if (group && newProps.start !== undefined && originalClip.start !== newProps.start) {
            const delta = newProps.start - originalClip.start;
            const groupedClipsInfo = group.clipIds.map(gClipId => {
                for (const track of prev.tracks) {
                    const clip = track.clips.find(c => c.id === gClipId);
                    if (clip) return { clip, trackId: track.id };
                }
                return null;
            }).filter((item): item is { clip: Clip; trackId: string; } => item !== null);

            let isMoveValid = true;
            for (const { clip: gClip, trackId: gTrackId } of groupedClipsInfo) {
                const newStart = gClip.start + delta;
                const newEnd = newStart + gClip.duration;
                if (newStart < 0) { isMoveValid = false; break; }
                const trackForCollisionCheck = prev.tracks.find(t => t.id === gTrackId);
                const otherClipsOnTrack = trackForCollisionCheck?.clips.filter(c => !group.clipIds.includes(c.id)) || [];
                for (const otherClip of otherClipsOnTrack) {
                    if (newStart < otherClip.start + otherClip.duration && newEnd > otherClip.start) {
                        isMoveValid = false; break;
                    }
                }
                if (!isMoveValid) break;
            }

            if (isMoveValid) {
                return { ...prev, tracks: prev.tracks.map(track => ({ ...track, clips: track.clips.map(clip => group.clipIds.includes(clip.id) ? { ...clip, start: clip.start + delta } : clip) })) };
            }
            return prev;
        }

        if (isMagnetic && (newProps.start !== undefined || newProps.duration !== undefined)) {
            const newTracks = [...prev.tracks];
            const trackIndex = newTracks.findIndex(t => t.id === trackId);
            if (trackIndex === -1) return prev;
            
            const trackToUpdate = newTracks[trackIndex];
            const isMove = newProps.start !== undefined && newProps.duration === undefined;

            if (isMove) {
                // MOVE: Re-order clips and re-flow the entire track
                const clipWithNewStart = { ...originalClip, ...newProps };
                const otherClips = trackToUpdate.clips.filter(c => c.id !== clipId);
                const newSortedClips = [...otherClips, clipWithNewStart].sort((a, b) => a.start - b.start);
                
                let lastEnd = 0;
                const finalClips = newSortedClips.map(clip => {
                    const updatedClip = { ...clip, start: lastEnd };
                    lastEnd += clip.duration;
                    return updatedClip;
                });
                
                newTracks[trackIndex] = { ...trackToUpdate, clips: finalClips };
                return { ...prev, tracks: newTracks };

            } else { // RESIZE: Order doesn't change, just ripple timings
                const clipsInOrder = [...trackToUpdate.clips].sort((a, b) => a.start - b.start);
                const editedClipIndex = clipsInOrder.findIndex(c => c.id === clipId);

                if (editedClipIndex !== -1) {
                    // 1. Apply the primary update to the clip being resized
                    clipsInOrder[editedClipIndex] = { ...clipsInOrder[editedClipIndex], ...newProps };

                    // 2. Ripple the change through all subsequent clips on the same track
                    for (let i = editedClipIndex + 1; i < clipsInOrder.length; i++) {
                        const prevClip = clipsInOrder[i-1];
                        clipsInOrder[i].start = prevClip.start + prevClip.duration;
                    }
                }

                newTracks[trackIndex] = { ...trackToUpdate, clips: clipsInOrder };
                return { ...prev, tracks: newTracks };
            }
        }
        
        // Default (non-magnetic, or non-positional like trimStart) update
        return { ...prev, tracks: prev.tracks.map(track => track.id === trackId ? { ...track, clips: track.clips.map(clip => clip.id === clipId ? { ...clip, ...newProps } : clip) } : track) };
    });
  }, [setEditorState, isMagnetic]);

  const handleAddTextClip = (content: string, startTime: number, duration: number) => {
    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      name: content.substring(0, 20),
      start: startTime,
      duration,
      type: 'text',
      content,
      style: { color: 'white', fontSize: '48px', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.7)', letterSpacing: '0px' },
      transform: { position: { x: 0, y: 0 }, scale: 100, rotation: 0, opacity: 100 },
      animation: { in: { type: 'fade', duration: 0.5 } },
    };
    lastCreatedClip.current = newClip;

    setEditorState(prev => {
      let textTrackIndex = prev.tracks.findIndex(t => t.type === 'text');
      const newTracks = [...prev.tracks];

      if (textTrackIndex === -1) {
        const newTextTrack: Track = { id: `track-${Date.now()}`, name: 'Text/Graphics', type: 'text', clips: [], isLocked: false, isVisible: true };
        newTracks.unshift(newTextTrack);
        textTrackIndex = 0;
      }
  
      const newClips = [...newTracks[textTrackIndex].clips, newClip];
      newTracks[textTrackIndex] = { ...newTracks[textTrackIndex], clips: newClips };
  
      return { ...prev, tracks: newTracks, selectedClipIds: [newClip.id] };
    });
  };

  const handleAddAdjustmentClip = (startTime: number, duration: number, effects: Effect[]) => {
    setEditorState(prev => {
      let adjTrackIndex = prev.tracks.findIndex(t => t.type === 'adjustment');
      const newTracks = [...prev.tracks];

      if (adjTrackIndex === -1) {
        const newAdjTrack: Track = { id: `track-${Date.now()}`, name: 'Adjustment Layer', type: 'adjustment', clips: [], isLocked: false, isVisible: true };
        newTracks.unshift(newAdjTrack);
        adjTrackIndex = 0;
      }
  
      const newClip: Clip = {
        id: `clip-${Date.now()}`, name: 'AI Adjustment', start: startTime, duration, type: 'adjustment', effects,
      };
  
      const newClips = [...newTracks[adjTrackIndex].clips, newClip];
      newTracks[adjTrackIndex] = { ...newTracks[adjTrackIndex], clips: newClips };
  
      return { ...prev, tracks: newTracks, selectedClipIds: [newClip.id] };
    });
  };

  const blobUrlToBase64 = (blobUrl: string): Promise<string> => {
      return new Promise(async (resolve, reject) => {
          try {
              const response = await fetch(blobUrl);
              const blobData = await response.blob();
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blobData);
          } catch (e) {
              reject(e);
          }
      });
  };

  const generateAndSetAssetDescription = useCallback(async (assetId: string, thumbnailUrl?: string) => {
    if (!thumbnailUrl) return;

    let dataUrl = thumbnailUrl;
    if (thumbnailUrl.startsWith('blob:')) {
        try {
            dataUrl = await blobUrlToBase64(thumbnailUrl);
        } catch(e) {
            console.error("Failed to convert blob to base64 for AI description", e);
            return;
        }
    }

    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) return;
    
    try {
        const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Data } };
        const textPart = { text: "Describe this image in 3-5 words for a video editor's media library (e.g., 'sunset over ocean', 'cat playing with yarn'). Provide only the description, no extra text." };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        const description = response.text.trim();
        if (description) {
            setMediaLibrary(prev => prev.map(asset => 
                asset.id === assetId ? { ...asset, description } : asset
            ));
        }
    } catch (error) {
        console.error('Error generating asset description:', error);
    }
  }, [ai]);

  const handleImportMedia = async (file: File) => {
    if (file.type.startsWith('video/')) {
      const { thumbnail, duration, width, height } = await generateVideoMetadata(file);
      const newAsset: MediaAsset = { id: `media-${Date.now()}`, name: file.name, url: URL.createObjectURL(file), thumbnail, file, duration, status: 'ready', type: 'video', width, height };
      setMediaLibrary(prev => [...prev, newAsset]);
      generateAndSetAssetDescription(newAsset.id, thumbnail);
    } else if (file.type.startsWith('audio/')) {
        const { duration, sampleRate } = await generateAudioMetadata(file);
        const newAsset: MediaAsset = { id: `media-${Date.now()}`, name: file.name, url: URL.createObjectURL(file), file, duration, status: 'ready', type: 'audio', sampleRate };
        setMediaLibrary(prev => [...prev, newAsset]);
    } else if (file.type.startsWith('image/')) {
        const { thumbnail, duration, width, height } = await generateImageMetadata(file);
        const newAsset: MediaAsset = { id: `media-${Date.now()}`, name: file.name, url: thumbnail, thumbnail, file, duration, status: 'ready', type: 'image', width, height };
        setMediaLibrary(prev => [...prev, newAsset]);
        generateAndSetAssetDescription(newAsset.id, thumbnail);
    } else {
      alert("Please select a valid video, audio, or image file.");
    }
  };

  const handleDeleteMediaAsset = (assetId: string) => {
    const assetToRemove = mediaLibrary.find(a => a.id === assetId);

    setEditorState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        clips: track.clips.filter(clip => clip.assetId !== assetId),
      }))
    }));

    setMediaLibrary(prev => {
        const newLibrary = prev.filter(a => a.id !== assetId);
        if (assetToRemove && assetToRemove.url.startsWith('blob:')) {
            URL.revokeObjectURL(assetToRemove.url);
        }
        return newLibrary;
    });
    
    setEditorState(prev => ({...prev, selectedClipIds: []}));
  };

  const handleSelectClip = (trackId: string, clipId: string, isMultiSelectKey: boolean) => {
    setEditorState(prev => {
        const group = prev.groups.find(g => g.clipIds.includes(clipId));
        
        if (isMultiSelectKey) {
            const idsToToggle = group ? group.clipIds : [clipId];
            const allCurrentlySelected = idsToToggle.every(id => prev.selectedClipIds.includes(id));
            
            if (allCurrentlySelected) {
                return { ...prev, selectedClipIds: prev.selectedClipIds.filter(id => !idsToToggle.includes(id)) };
            } else {
                return { ...prev, selectedClipIds: [...new Set([...prev.selectedClipIds, ...idsToToggle])] };
            }
        } else {
            const idsToSelect = group ? group.clipIds : [clipId];
            if (
                idsToSelect.length === prev.selectedClipIds.length &&
                idsToSelect.every(id => prev.selectedClipIds.includes(id))
            ) {
                return prev;
            }
            return { ...prev, selectedClipIds: idsToSelect };
        }
    });
  };
  
  const handleDeselectAll = () => {
    setEditorState(prev => ({...prev, selectedClipIds: []}));
  };
  
  const handleUpdateSelectedClip = useCallback((newProps: Partial<Clip>) => {
    if (selectedClipIds.length === 1) {
      const clipId = selectedClipIds[0];
      const track = tracks.find(t => t.clips.some(c => c.id === clipId));
      if (track) {
        const originalClip = track.clips.find(c => c.id === clipId);
        if (originalClip) {
          // Deep merge for nested objects like 'transform'
          const updatedProps = { ...newProps };
          if (newProps.transform) {
            updatedProps.transform = { ...originalClip.transform, ...newProps.transform };
          }
          if (newProps.style) {
            updatedProps.style = { ...originalClip.style, ...newProps.style };
          }
          if (newProps.animation) {
            updatedProps.animation = { ...originalClip.animation, ...newProps.animation };
          }
          handleUpdateClip(track.id, clipId, updatedProps);
        }
      }
    }
  }, [selectedClipIds, tracks, handleUpdateClip]);

  const handleDeleteSelectedClip = useCallback(() => {
    setEditorState(prev => {
      if (prev.selectedClipIds.length === 0) return prev;

      const deletedClipsByTrack = new Map<string, Clip[]>();
      prev.selectedClipIds.forEach(id => {
          const track = prev.tracks.find(t => t.clips.some(c => c.id === id));
          if (track) {
              const clip = track.clips.find(c => c.id === id)!;
              if (!deletedClipsByTrack.has(track.id)) deletedClipsByTrack.set(track.id, []);
              deletedClipsByTrack.get(track.id)!.push(clip);
          }
      });

      let newTracks = prev.tracks.map(track => ({
          ...track,
          clips: track.clips.filter(clip => !prev.selectedClipIds.includes(clip.id)),
      }));

      if (isMagnetic) {
          newTracks = newTracks.map(track => {
              if (deletedClipsByTrack.has(track.id)) {
                  const keptClips = track.clips
                      .filter(c => !prev.selectedClipIds.includes(c.id))
                      .sort((a, b) => a.start - b.start);
                  
                  let lastEnd = 0;
                  const rippledClips = keptClips.map(clip => {
                      const newStart = lastEnd;
                      lastEnd = newStart + clip.duration;
                      return { ...clip, start: newStart };
                  });
                  return { ...track, clips: rippledClips };
              }
              return track;
          });
      }

      const newGroups = prev.groups
        .map(group => ({ ...group, clipIds: group.clipIds.filter(id => !prev.selectedClipIds.includes(id)) }))
        .filter(group => group.clipIds.length > 1);

      return { ...prev, selectedClipIds: [], tracks: newTracks, groups: newGroups };
    });
  }, [setEditorState, isMagnetic]);
  
  const handleAddClip = useCallback((trackId: string | null, asset: MediaAsset, startTime: number, durationOverride?: number) => {
    setEditorState(prev => {
      const assetType = asset.type;
      const clipType = assetType === 'image' ? 'image' : assetType; // 'video' or 'audio'
      const targetTrackType = (assetType === 'image' || assetType === 'video') ? 'video' : 'audio';

      let finalTrackId = trackId;
      const mutableTracks = [...prev.tracks];
      let newTrackCreated = false;

      if (!finalTrackId) {
        let suitableTrack = mutableTracks.find(t => t.type === targetTrackType && !t.isLocked);
        if (suitableTrack) {
          finalTrackId = suitableTrack.id;
        } else {
          const newTrack: Track = {
            id: `track-${Date.now()}`,
            name: `${targetTrackType.charAt(0).toUpperCase() + targetTrackType.slice(1)} ${prev.tracks.filter(t => t.type === targetTrackType).length + 1}`,
            type: targetTrackType, clips: [], isLocked: false, isVisible: true,
          };
          mutableTracks.push(newTrack); // Add audio/video tracks to the end
          finalTrackId = newTrack.id;
          newTrackCreated = true;
        }
      }

      const targetTrackIndex = mutableTracks.findIndex(t => t.id === finalTrackId);
      if (targetTrackIndex === -1) return prev;
      if (mutableTracks[targetTrackIndex].type !== targetTrackType) return prev; // Don't add to wrong track type

      const newClip: Clip = {
        id: `clip-${Date.now()}`,
        name: asset.name,
        start: Math.max(0, startTime),
        duration: durationOverride || asset.duration,
        type: clipType, assetId: asset.id, trimStart: 0,
        transform: clipType !== 'audio' ? { position: { x: 0, y: 0 }, scale: 100, rotation: 0, opacity: 100 } : undefined,
        volume: (clipType === 'audio' || clipType === 'video') ? 100 : undefined,
      };

      const targetTrack = mutableTracks[targetTrackIndex];
      let finalClipForState: Clip;

      if (isMagnetic) {
          let insertionTime = newClip.start;
          const clipsAtStartTime = targetTrack.clips.filter(c => c.start === insertionTime);
          if (clipsAtStartTime.length > 0) {
              const endOfLastClipAtStart = Math.max(...clipsAtStartTime.map(c => c.start + c.duration));
              insertionTime = endOfLastClipAtStart;
          }
      
          const newClipDuration = newClip.duration;
          
          const unaffectedClips = targetTrack.clips.filter(c => c.start + c.duration <= insertionTime);
          
          const affectedClips = targetTrack.clips
              .filter(c => !unaffectedClips.some(u => u.id === c.id))
              .sort((a, b) => a.start - b.start);
      
          const finalNewClip = { ...newClip, start: insertionTime };
          finalClipForState = finalNewClip;
      
          let ripplePoint = insertionTime + newClipDuration;
      
          const rippledClips = affectedClips.map(clip => {
              const updatedClip = { ...clip, start: ripplePoint };
              ripplePoint += clip.duration;
              return updatedClip;
          });
      
          const finalClips = [...unaffectedClips, finalNewClip, ...rippledClips];
          mutableTracks[targetTrackIndex] = { ...targetTrack, clips: finalClips };
      } else {
        let finalStartTime = newClip.start;
        const newClipEnd = finalStartTime + newClip.duration;
        let collision = targetTrack.clips.some(existing => finalStartTime < existing.start + existing.duration && newClipEnd > existing.start);
        if (collision) {
          const lastClip = targetTrack.clips.reduce((last, current) => (current.start > last.start ? current : last), { start: -1, duration: 0 });
          finalStartTime = lastClip.start >= 0 ? lastClip.start + lastClip.duration : 0;
        }
        finalClipForState = { ...newClip, start: finalStartTime };
        mutableTracks[targetTrackIndex] = { ...targetTrack, clips: [...targetTrack.clips, finalClipForState] };
      }

      lastCreatedClip.current = finalClipForState;

      return {
        ...prev,
        tracks: mutableTracks,
        selectedClipIds: [finalClipForState.id],
      };
    });
  }, [setEditorState, isMagnetic]);

  const handleAddTrack = (type: 'video' | 'text' | 'adjustment' | 'audio') => {
    setEditorState(prev => {
      let name = '';
      let trackCount = prev.tracks.filter(t => t.type === type).length + 1;
      name = `${type.charAt(0).toUpperCase() + type.slice(1)} ${trackCount}`;

      const newTrack: Track = {
        id: `track-${Date.now()}`,
        name: name,
        type: type,
        clips: [],
        isLocked: false,
        isVisible: true,
      };
      // Add new tracks to the top, except audio tracks which go to the bottom
      const newTracks = (type === 'audio') ? [...prev.tracks, newTrack] : [newTrack, ...prev.tracks];
      return { ...prev, tracks: newTracks };
    });
  };

  const handleDeleteTrack = (trackId: string) => {
    setEditorState(prev => ({
      selectedClipIds: [],
      groups: prev.groups,
      tracks: prev.tracks.filter(t => t.id !== trackId)
    }));
  };

  const handleUpdateTrack = (trackId: string, newProps: Partial<Track>) => {
    setEditorState(prev => ({
        ...prev,
        tracks: prev.tracks.map(t => t.id === trackId ? { ...t, ...newProps } : t)
    }));
  };
  
  const handleSplitClip = useCallback((timeOverride?: number) => {
    setEditorState(prev => {
      const time = timeOverride !== undefined ? timeOverride : currentTime;
      let clipToSplit: { trackId: string; clip: Clip } | null = null;
    
      if (prev.selectedClipIds.length === 1) {
        const clipId = prev.selectedClipIds[0];
        const track = prev.tracks.find(t => t.clips.some(c => c.id === clipId));
        const clip = track?.clips.find(c => c.id === clipId);
        if (track && clip && time > clip.start && time < clip.start + clip.duration) {
          clipToSplit = { trackId: track.id, clip };
        }
      }
    
      if (!clipToSplit) {
        for (const track of prev.tracks) {
          if (track.isLocked) continue;
          for (const clip of track.clips) {
            if (time > clip.start && time < clip.start + clip.duration) {
              clipToSplit = { trackId: track.id, clip };
              break; 
            }
          }
          if (clipToSplit) break;
        }
      }
    
      if (!clipToSplit) return prev;
    
      const { trackId, clip } = clipToSplit;
      const splitPoint = time - clip.start;
    
      const clip1: Clip = { ...clip, duration: splitPoint };
      const clip2: Clip = { ...clip, id: `clip-${Date.now()}`, start: time, duration: clip.duration - splitPoint, trimStart: (clip.trimStart || 0) + splitPoint };
    
      const newTracks = prev.tracks.map(track => {
        if (track.id === trackId) {
          const clipIndex = track.clips.findIndex(c => c.id === clip.id);
          if (clipIndex === -1) return track;
          
          const newClips = [...track.clips];
          newClips.splice(clipIndex, 1, clip1, clip2);
          
          return { ...track, clips: newClips };
        }
        return track;
      });

      return { ...prev, tracks: newTracks, selectedClipIds: [clip1.id] };
    });
  }, [currentTime, setEditorState]);

  const handleProviderChange = (provider: 'pexels' | 'pixabay') => {
    if (provider !== stockMediaProvider) {
        setStockMediaProvider(provider);
        setStockMediaResults([]);
        setStockMediaInfoMessage(null);
    }
  };

  const handleSearchStockMedia = async (query: string, mediaType: 'video' | 'image'): Promise<StockAsset[]> => {
    setStockMediaInfoMessage(null);

    if (!query.trim()) {
        setStockMediaResults([]);
        setStockMediaSearchQuery('');
        return [];
    }

    setStockMediaSearchQuery(query);
    setIsSearchingStockMedia(true);
    setStockMediaResults([]);

    const PEXELS_API_KEY = 'VFrEPtHnTToIRA6y1ifeW5A8YHU7yOyeolaOiWiJBYmwTkpr4o2idvkW';
    const PIXABAY_API_KEY = '52499531-3156c9cea154614bfbcd0e105';

    let searchResults: StockAsset[] = [];
    try {
        if (stockMediaProvider === 'pexels') {
            if (mediaType === 'video') {
                const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=15`, {
                    headers: { Authorization: PEXELS_API_KEY }
                });
                if (!response.ok) throw new Error(`Pexels API failed: ${response.statusText}`);
                const data = await response.json();
                if (data.videos) {
                    searchResults = data.videos.map((video: any) => ({
                        id: `pexels-video-${video.id}`, name: `By ${video.user.name}`,
                        thumbnail: video.image,
                        url: video.video_files.find((f: any) => f.quality === 'hd')?.link || video.video_files[0]?.link,
                        duration: video.duration, type: 'video',
                    }));
                }
            } else { // Image
                const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15`, {
                    headers: { Authorization: PEXELS_API_KEY }
                });
                if (!response.ok) throw new Error(`Pexels API failed: ${response.statusText}`);
                const data = await response.json();
                if (data.photos) {
                    searchResults = data.photos.map((photo: any) => ({
                        id: `pexels-image-${photo.id}`, name: `By ${photo.photographer}`,
                        thumbnail: photo.src.medium, url: photo.src.large2x, type: 'image',
                    }));
                }
            }
        } else if (stockMediaProvider === 'pixabay') {
             if (mediaType === 'video') {
                const response = await fetch(`https://pixabay.com/api/videos/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=15`);
                if (!response.ok) throw new Error(`Pixabay API failed: ${response.statusText}`);
                const data = await response.json();
                if (data.hits) {
                    searchResults = data.hits.filter((hit: any) => hit.videos?.medium?.thumbnail && hit.videos?.medium?.url).map((hit: any) => ({
                        id: `pixabay-video-${hit.id}`, name: hit.tags,
                        thumbnail: hit.videos.medium.thumbnail, url: hit.videos.medium.url,
                        duration: hit.duration, type: 'video',
                    }));
                }
             } else { // Image
                const response = await fetch(`https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=15`);
                if (!response.ok) throw new Error(`Pixabay API failed: ${response.statusText}`);
                const data = await response.json();
                if (data.hits) {
                     searchResults = data.hits.map((hit: any) => ({
                        id: `pixabay-image-${hit.id}`, name: hit.tags,
                        thumbnail: hit.previewURL, url: hit.largeImageURL, type: 'image',
                    }));
                }
             }
        }
    } catch (error) {
         console.error(`Error fetching from ${stockMediaProvider}:`, error);
    }

    setStockMediaResults(searchResults);
    lastStockSearchResultsRef.current = searchResults;
    setIsSearchingStockMedia(false);

    return searchResults;
  };

  const handleAddStockAssetToLibrary = useCallback((stockAsset: StockAsset) => {
    const exists = mediaLibrary.some(asset => asset.id === stockAsset.id);
    if (exists) {
      return;
    }

    const newMediaAsset: MediaAsset = {
      id: stockAsset.id, name: stockAsset.name,
      url: stockAsset.url, // Original remote URL
      thumbnail: stockAsset.thumbnail, duration: stockAsset.duration || 5,
      status: 'downloading', type: stockAsset.type,
    };
    setMediaLibrary(prev => [...prev, newMediaAsset]);
    generateAndSetAssetDescription(newMediaAsset.id, newMediaAsset.thumbnail);

    fetch(stockAsset.url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        setMediaLibrary(prev => prev.map(asset => 
          asset.id === stockAsset.id 
            ? { ...asset, url: blobUrl, status: 'ready', ...(stockAsset.type === 'image' && { thumbnail: blobUrl }) }
            : asset
        ));
      })
      .catch(err => {
        console.error('Failed to download stock media:', err);
        setMediaLibrary(prev => prev.filter(asset => asset.id !== stockAsset.id));
      });
  }, [mediaLibrary, generateAndSetAssetDescription]);
  
  const handleAddStockClip = (trackId: string | null, stockAsset: StockAsset, startTime: number, duration?: number) => {
    handleAddStockAssetToLibrary(stockAsset);
    const assetForClip: MediaAsset = {
        id: stockAsset.id, name: stockAsset.name,
        url: stockAsset.url, thumbnail: stockAsset.thumbnail,
        duration: stockAsset.duration || 5, // Default 5s for images
        status: 'downloading', type: stockAsset.type,
    };
    handleAddClip(trackId, assetForClip, startTime, duration);
  };

  const handleCopyClip = useCallback(() => {
    if (selectedClipIds.length === 1) {
      const clipId = selectedClipIds[0];
      const track = tracks.find(t => t.clips.some(c => c.id === clipId));
      const clip = track?.clips.find(c => c.id === clipId);
      if (clip) {
        setCopiedClip({ ...clip });
      }
    }
  }, [selectedClipIds, tracks]);

  const handlePasteClip = useCallback(() => {
    if (!copiedClip) return;

    let targetTrackType: Track['type'] = copiedClip.type as any;
    if (copiedClip.type === 'image') {
        targetTrackType = 'video';
    }

    const targetTrack = tracks.find(t => t.type === targetTrackType);
    if (!targetTrack) {
      console.warn(`No compatible track of type '${targetTrackType}' found for pasting.`);
      return;
    }

    setEditorState(prev => {
      const currentTargetTrack = prev.tracks.find(t => t.id === targetTrack.id);
      if (!currentTargetTrack) return prev;

      let newStartTime = currentTime;
      const newClipDuration = copiedClip.duration;
      const existingClips = [...currentTargetTrack.clips].sort((a, b) => a.start - b.start);

      let collision = true;
      while (collision) {
          collision = false;
          const newClipEnd = newStartTime + newClipDuration;
          for (const existingClip of existingClips) {
              const existingClipEnd = existingClip.start + existingClip.duration;
              if (newStartTime < existingClipEnd && newClipEnd > existingClip.start) {
                  newStartTime = existingClipEnd;
                  collision = true;
                  break;
              }
          }
      }
      
      const newPastedClip: Clip = {
          ...copiedClip,
          id: `clip-${Date.now()}`,
          start: newStartTime
      };

      const newTracks = prev.tracks.map(track => {
          if (track.id === targetTrack.id) {
              return { ...track, clips: [...track.clips, newPastedClip] };
          }
          return track;
      });

      return { 
        ...prev, 
        tracks: newTracks,
        selectedClipIds: [newPastedClip.id]
      };
    });
  }, [copiedClip, tracks, currentTime, setEditorState]);

  const handleCutClip = useCallback(() => {
    if (selectedClipIds.length === 1) {
      handleCopyClip();
      handleDeleteSelectedClip();
    }
  }, [selectedClipIds, handleCopyClip, handleDeleteSelectedClip]);

  const handleGroupClips = useCallback(() => {
    setEditorState(prev => {
        if (prev.selectedClipIds.length < 2) return prev;
        const remainingGroups = prev.groups.map(g => ({
            ...g,
            clipIds: g.clipIds.filter(id => !prev.selectedClipIds.includes(id))
        })).filter(g => g.clipIds.length > 1);

        const newGroup: Group = {
            id: `group-${Date.now()}`,
            clipIds: [...prev.selectedClipIds],
        };
        
        return { ...prev, groups: [...remainingGroups, newGroup] };
    });
  }, [setEditorState]);

  const handleUngroupClips = useCallback(() => {
      setEditorState(prev => {
          if (prev.selectedClipIds.length === 0) return prev;
          const newGroups = prev.groups.filter(group => 
              !group.clipIds.some(clipId => prev.selectedClipIds.includes(clipId))
          );
          return { ...prev, groups: newGroups };
      });
  }, [setEditorState, selectedClipIds]);
  
    // --- AI Integration ---

    const aiTools: FunctionDeclaration[] = useMemo(() => [
        {
            name: 'search_stock_media',
            description: 'Searches for stock videos or images on Pexels or Pixabay.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    query: { type: Type.STRING, description: 'The search query, e.g., "cat playing piano".' },
                    media_type: { type: Type.STRING, description: 'The type of media to search for.', enum: ['video', 'image'] },
                },
                required: ['query', 'media_type'],
            },
        },
        {
            name: 'add_stock_clip_to_timeline',
            description: 'Adds a stock video or image clip to the timeline. Requires a stock_asset_id from a previous search.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    stock_asset_id: { type: Type.STRING, description: 'The ID of the stock asset from the search_stock_media tool results.' },
                    start_time: { type: Type.NUMBER, description: 'The time in seconds where the clip should start on the timeline.' },
                    duration: { type: Type.NUMBER, description: "Optional. The desired duration of the clip in seconds. If not provided, the asset's full duration is used." },
                },
                required: ['stock_asset_id', 'start_time'],
            },
        },
        {
            name: 'add_library_clip_to_timeline',
            description: "Adds a clip from the user's media library to the timeline. Use the asset name or ID from the context.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    asset_identifier: { type: Type.STRING, description: "The ID or name of the media asset from the media library context." },
                    start_time: { type: Type.NUMBER, description: 'The time in seconds where the clip should start on the timeline.' },
                    duration: { type: Type.NUMBER, description: "Optional. The desired duration of the clip in seconds. If not provided, the asset's full duration is used." },
                },
                required: ['asset_identifier', 'start_time'],
            },
        },
        {
            name: 'add_text_clip_to_timeline',
            description: 'Adds a new text clip to the timeline.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    content: { type: Type.STRING, description: 'The text content to display.' },
                    start_time: { type: Type.NUMBER, description: 'The time in seconds where the text should appear.' },
                    duration: { type: Type.NUMBER, description: 'How long the text should be visible, in seconds.' },
                },
                required: ['content', 'start_time', 'duration'],
            },
        },
         {
            name: 'select_clips',
            description: 'Selects one or more clips on the timeline by their IDs. This is useful before performing an action like deleting or updating.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    clip_ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of clip IDs to select." },
                },
                required: ['clip_ids'],
            },
        },
        {
            name: 'update_clip_properties',
            description: "Updates properties of a specific clip on the timeline, such as its text content, duration, or visual transformations. Requires a clip_id.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    clip_id: { type: Type.STRING, description: 'The ID of the clip to update.' },
                    name: { type: Type.STRING, description: 'The new name for the clip.' },
                    duration: { type: Type.NUMBER, description: 'The new duration for the clip in seconds.' },
                    content: { type: Type.STRING, description: "For text clips, the new text content." },
                    transform: {
                        type: Type.OBJECT,
                        description: "An object with transform properties like scale, rotation, opacity, position.",
                        properties: {
                            scale: { type: Type.NUMBER },
                            rotation: { type: Type.NUMBER },
                            opacity: { type: Type.NUMBER },
                            position: {
                                type: Type.OBJECT,
                                properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }
                            },
                        }
                    },
                    style: {
                        type: Type.OBJECT,
                        description: "For text clips, an object with style properties like color, fontSize, fontWeight.",
                        properties: {
                            color: { type: Type.STRING, description: "CSS color string, e.g., 'yellow' or '#FF0000'." },
                            fontSize: { type: Type.STRING, description: "Font size with units, e.g., '48px'." },
                            fontWeight: { type: Type.STRING, description: "Font weight, e.g., 'bold', 'normal', '700'." },
                            letterSpacing: { type: Type.STRING, description: "Letter spacing with units, e.g., '2px'." },
                        }
                    },
                    animation: {
                        type: Type.OBJECT,
                        description: "For text clips, an object with 'in' and 'out' animation properties.",
                        properties: {
                            in: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING, enum: ['none', 'fade', 'slide-top', 'slide-bottom', 'slide-left', 'slide-right', 'zoom'] },
                                    duration: { type: Type.NUMBER, description: 'Duration in seconds.' }
                                }
                            },
                            out: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING, enum: ['none', 'fade', 'slide-top', 'slide-bottom', 'slide-left', 'slide-right', 'zoom'] },
                                    duration: { type: Type.NUMBER, description: 'Duration in seconds.' }
                                }
                            }
                        }
                    },
                    volume: { type: Type.NUMBER, description: "For audio clips, the new volume (0-100)." },
                },
                required: ['clip_id'],
            },
        },
        {
            name: 'split_clip_at_playhead',
            description: 'Splits the currently selected clip or any clip under the playhead at the current playhead time.',
            parameters: { type: Type.OBJECT, properties: {} },
        },
        {
            name: 'delete_selected_clips',
            description: 'Deletes the currently selected clips from the timeline. The user must select clips before this can be used.',
            parameters: { type: Type.OBJECT, properties: {} },
        },
        {
            name: 'apply_visual_effect',
            description: 'Applies a visual effect by adding an adjustment clip over a specified time range.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    start_time: { type: Type.NUMBER, description: 'The start time of the effect in seconds.' },
                    duration: { type: Type.NUMBER, description: 'The duration of the effect in seconds.' },
                    effect_name: {
                        type: Type.STRING,
                        description: 'The name of the effect to apply.',
                        enum: ['brightness', 'contrast', 'saturate', 'blur', 'grayscale', 'sepia', 'invert'],
                    },
                    value: { type: Type.NUMBER, description: 'The intensity of the effect. See effect definitions for appropriate ranges.' },
                },
                required: ['start_time', 'duration', 'effect_name', 'value'],
            },
        },
    ], []);

    const executeAiTool = useCallback(async (name: string, args: any): Promise<any> => {
        console.log("Executing AI Tool:", name, args);
        switch (name) {
            case 'search_stock_media': {
                const results = await handleSearchStockMedia(args.query, args.media_type || 'video');
                const summary = results.slice(0, 5).map(r => ({ id: r.id, name: r.name, duration: r.duration }));
                if (summary.length === 0) return { success: false, message: 'No results found.' };
                return { success: true, results: summary };
            }
            case 'add_stock_clip_to_timeline': {
                const assetToAdd = lastStockSearchResultsRef.current.find(r => r.id === args.stock_asset_id);
                if (!assetToAdd) {
                    return { success: false, message: 'Asset ID not found. Please perform a search first.' };
                }
                handleAddStockClip(null, assetToAdd, args.start_time, args.duration);
                const newClip = lastCreatedClip.current;
                return { success: true, message: `Added clip '${assetToAdd.name}' to the timeline.`, new_clip_id: newClip?.id, new_clip_duration: newClip?.duration };
            }
            case 'add_library_clip_to_timeline': {
                const { asset_identifier, start_time, duration } = args;
                const assetToAdd = mediaLibrary.find(a => a.id === asset_identifier || a.name === asset_identifier);
                if (!assetToAdd) {
                    return { success: false, message: `Asset with ID or name '${asset_identifier}' not found in media library.` };
                }
                handleAddClip(null, assetToAdd, start_time, duration);
                const newClip = lastCreatedClip.current;
                return { success: true, message: `Added clip '${assetToAdd.name}' to the timeline.`, new_clip_id: newClip?.id, new_clip_duration: newClip?.duration };
            }
            case 'add_text_clip_to_timeline': {
                handleAddTextClip(args.content, args.start_time, args.duration);
                const newClip = lastCreatedClip.current;
                return { success: true, new_clip_id: newClip?.id };
            }
             case 'select_clips': {
                const { clip_ids } = args;
                if (!Array.isArray(clip_ids)) {
                    return { success: false, message: 'clip_ids must be an array of strings.' };
                }
                const allClipIdsOnTimeline = new Set(tracks.flatMap(t => t.clips.map(c => c.id)));
                const invalidIds = clip_ids.filter(id => !allClipIdsOnTimeline.has(id));
                if (invalidIds.length > 0) {
                    return { success: false, message: `The following clip IDs were not found: ${invalidIds.join(', ')}` };
                }
                setEditorState(prev => ({ ...prev, selectedClipIds: clip_ids }));
                return { success: true, selected_ids: clip_ids };
            }
            case 'update_clip_properties': {
                const { clip_id, ...newProps } = args;
                if (!clip_id) return { success: false, message: 'clip_id is required.' };

                let trackOfClip: Track | undefined;
                let originalClip: Clip | undefined;
                for (const track of tracks) {
                    const clip = track.clips.find(c => c.id === clip_id);
                    if (clip) {
                        trackOfClip = track;
                        originalClip = clip;
                        break;
                    }
                }

                if (!trackOfClip || !originalClip) {
                    return { success: false, message: `Clip with ID ${clip_id} not found.` };
                }
                
                const updatedProps = { ...newProps };
                if (newProps.transform) {
                    updatedProps.transform = { ...(originalClip.transform || {}), ...newProps.transform };
                }
                if (newProps.style) {
                    updatedProps.style = { ...(originalClip.style || {}), ...newProps.style };
                }
                if (newProps.animation) {
                    updatedProps.animation = { ...(originalClip.animation || {}), ...newProps.animation };
                }

                handleUpdateClip(trackOfClip.id, clip_id, updatedProps);
                return { success: true, message: `Updated clip ${clip_id}.` };
            }
            case 'split_clip_at_playhead': {
                handleSplitClip();
                return { success: true };
            }
            case 'delete_selected_clips': {
                handleDeleteSelectedClip();
                return { success: true, message: "The selected clips have been deleted." };
            }
            case 'apply_visual_effect': {
                const defaultEffects: Effect[] = [
                    { type: 'brightness', value: 100, enabled: true, unit: '%', min: 0, max: 200, step: 1 },
                    { type: 'contrast', value: 100, enabled: true, unit: '%', min: 0, max: 200, step: 1 },
                    { type: 'saturate', value: 100, enabled: true, unit: '%', min: 0, max: 200, step: 1 },
                    { type: 'blur', value: 0, enabled: true, unit: 'px', min: 0, max: 20, step: 0.1 },
                    { type: 'grayscale', value: 0, enabled: false, unit: '%', min: 0, max: 100, step: 1 },
                    { type: 'sepia', value: 0, enabled: false, unit: '%', min: 0, max: 100, step: 1 },
                    { type: 'invert', value: 0, enabled: false, unit: '%', min: 0, max: 100, step: 1 },
                ];

                const effectTemplate = defaultEffects.find(e => e.type === args.effect_name);
                if (!effectTemplate) return { success: false, message: `Unknown effect: ${args.effect_name}` };

                const finalEffects = defaultEffects.map(e => {
                    if (e.type === args.effect_name) {
                        return { ...e, value: args.value, enabled: true };
                    }
                    if (args.effect_name === 'grayscale' && e.type === 'saturate') {
                        return { ...e, value: 0, enabled: true }; // Grayscale implies desaturation
                    }
                    return e;
                });

                handleAddAdjustmentClip(args.start_time, args.duration, finalEffects);
                return { success: true };
            }
            default:
                return { success: false, message: `Unknown tool: ${name}` };
        }
    }, [handleSearchStockMedia, handleAddStockClip, handleAddTextClip, handleSplitClip, handleDeleteSelectedClip, handleAddAdjustmentClip, tracks, handleUpdateClip, setEditorState, mediaLibrary, handleAddClip]);

    const handleSendMessage = useCallback(async (prompt: string) => {
      if (!ai) {
        setChatMessages(prev => [...prev,
          { role: 'user', parts: [{ text: prompt }] },
          { role: 'model', parts: [{ text: 'AI features are not available. Please add a VITE_GEMINI_API_KEY to your .env file to enable AI assistance.' }] }
        ]);
        return;
      }
      setIsAiLoading(true);
      const newUserMessage: ChatMessage = { role: 'user', parts: [{ text: prompt }] };
      setChatMessages(prev => [...prev, newUserMessage]);
  
      const getTimelineContext = () => `
          --- Editor Context ---
          Current Timeline Duration: ${timelineDuration.toFixed(2)} seconds.
          Playhead Position: ${currentTime.toFixed(2)} seconds.
          Media Library Assets:
          ${mediaLibrary.map(a => `  - ID: ${a.id}, Name: "${a.name}", Type: ${a.type}, Duration: ${a.duration.toFixed(2)}s`).join('\n') || '  None.'}
          Selected Clips:
          ${selectedClipIds.length > 0
              ? tracks.flatMap(t => t.clips)
                  .filter(c => selectedClipIds.includes(c.id))
                  .map(c => `  - ID: ${c.id}, Name: "${c.name}", Type: ${c.type}, Start: ${c.start.toFixed(2)}s, Duration: ${c.duration.toFixed(2)}s`)
                  .join('\n')
              : '  None.'
          }
          All Clips on Timeline:
          ${tracks.flatMap(t => t.clips).map(c =>
          `  - Clip ID: ${c.id}, Name: "${c.name}", Type: ${c.type}, Start: ${c.start.toFixed(2)}s, End: ${(c.start + c.duration).toFixed(2)}s`
          ).join('\n') || '  None.'}
          Last 5 stock search results:
          ${lastStockSearchResultsRef.current.map(r => ` - ID: ${r.id}, Name: ${r.name}, Duration: ${r.duration}s`).join('\n') || '  None.'}
          --- End Context ---
      `;
      
      const historyForApi = chatMessages.map(msg => ({
          role: msg.role,
          parts: msg.parts.map(p => ({ text: p.text }))
      }));

      const userMessageWithContext = {
          role: 'user',
          parts: [{ text: getTimelineContext() + "\n\n" + prompt }]
      };

      let currentContents: GeminiApiContent[] = [...historyForApi, userMessageWithContext];
      
      const modelResponsePlaceholderIndex = chatMessages.length + 1;
      setChatMessages(prev => [...prev, { role: 'model', parts: [{ text: "" }] }]);
      let aggregatedText = "";

      try {
          const config = {
              systemInstruction: `You are an expert video editing AI assistant integrated into a web-based video editor. Your primary goal is to help users edit their projects by using the available tools based on their requests and the provided editor context.

**Core Principles:**
- **Be a Proactive Partner:** Don't just follow orders. Anticipate user needs. If a user asks for something you can't do, offer a creative alternative.
- **Communicate Clearly:** Explain what you've done and why. For example: "Okay, I've added a 5-second city timelapse. Now, I'll add the text over it." This keeps the user informed.
- **Use Context:** Always refer to the provided editor context to get clip IDs, asset names, and understand the current state of the timeline.

**Critical Tool Usage Rules:**
1.  **Sequential Actions & 'new_clip_id':** This is the most important rule. When a tool like \`add_text_clip_to_timeline\` or \`add_stock_clip_to_timeline\` runs, its response will contain a \`new_clip_id\`. If the user's request requires a follow-up action on that *same* clip (e.g., "add 'hello' in red"), you MUST use this returned ID in a subsequent tool call like \`update_clip_properties\` **within the same turn**. Do not try to do this in one step or ask the user for the ID.
    - **Example:** User says, "Find a city timelapse, add it for 5s, then add 'My Journey' in yellow over it."
    - **Your Action 1:** Call \`search_stock_media\` for "city timelapse".
    - **Your Action 2:** Call \`add_stock_clip_to_timeline\` with the first result's ID. Let's say it returns \`{"success": true, "new_clip_id": "clip-123"}\`.
    - **Your Action 3:** Call \`add_text_clip_to_timeline\` with content "My Journey". Let's say it returns \`{"success": true, "new_clip_id": "clip-456"}\`.
    - **Your Action 4:** Call \`update_clip_properties\` with \`clip_id: "clip-456"\` and \`style: { color: 'yellow' }\`.
2.  **Handling Unsupported Requests:** If a user asks for an effect or action you don't have a tool for (e.g., 'add cinematic grain', 'reverse this clip'), DO NOT simply say "I can't do that." Instead, be a creative partner. Suggest a close alternative using the tools you *do* have.
    - **Example:** User says, "Add a cinematic grain effect."
    - **Your Response:** "I can't add a grain effect directly, but I can help create a cinematic look by adjusting the color. Would you like me to slightly increase the contrast and lower the saturation?"
3.  **Animating Text:** You can animate text clips. Use the \`update_clip_properties\` tool with the \`animation\` parameter. You can specify an 'in' (intro) and 'out' (outro) animation. The system will correctly interpret the direction (e.g., 'slide-top' for an 'in' animation slides from the top, while for an 'out' animation it slides to the top).
    - **Example:** User says, "make the text fade in over 1 second".
    - **Your Action:** Call \`update_clip_properties\` with the clip's ID and \`animation: { in: { type: 'fade', duration: 1 } }\`.
4.  **Breaking Repetitive Loops:** If the user is being repetitive or vague (e.g., just saying 'do it'), do not repeat your previous response. Instead, re-engage by asking for clarification or re-offering your alternative suggestion.
    - **Example:** User says "DO IT" after you offered the cinematic color alternative.
    - **Your Response:** "To clarify, are you asking me to try the color adjustments I suggested to create a cinematic feel? Or is there something else you had in mind?"`,
              tools: [{functionDeclarations: aiTools}],
          };

          let hasFunctionCalls = true;
          while(hasFunctionCalls) {
              const stream = await ai.models.generateContentStream({ model: 'gemini-2.5-flash', contents: currentContents, config });

              let collectedFunctionCalls: any[] = [];
              let currentTextResponse = "";

              for await (const chunk of stream) {
                  if (chunk.text) {
                      aggregatedText += chunk.text;
                      currentTextResponse += chunk.text;
                      setChatMessages(prev => {
                          const newMessages = [...prev];
                          if (newMessages[modelResponsePlaceholderIndex]) {
                            newMessages[modelResponsePlaceholderIndex] = { role: 'model', parts: [{ text: aggregatedText }] };
                          }
                          return newMessages;
                      });
                  }
                  if (chunk.functionCalls) {
                      collectedFunctionCalls.push(...chunk.functionCalls);
                  }
              }
              
              const modelParts: GeminiApiPart[] = [];
              if (currentTextResponse) modelParts.push({ text: currentTextResponse });
              if (collectedFunctionCalls.length > 0) modelParts.push(...collectedFunctionCalls.map(fc => ({ functionCall: fc })));
              
              if (modelParts.length > 0) {
                   currentContents.push({ role: 'model', parts: modelParts });
              }

              if (collectedFunctionCalls.length > 0) {
                  const functionResponses = [];
                  for (const fc of collectedFunctionCalls) {
                      const result = await executeAiTool(fc.name, fc.args);
                      functionResponses.push({
                          functionResponse: { name: fc.name, response: { result } }
                      });
                  }

                  currentContents.push({
                      role: 'user',
                      parts: [
                          ...functionResponses.map(fr => ({ functionResponse: fr.functionResponse })),
                          { text: getTimelineContext() }
                      ]
                  });
                  hasFunctionCalls = true;

              } else {
                  hasFunctionCalls = false;
              }
          }

      } catch (error: any) {
          console.error("AI Error:", error);
          let errorMessage = "\n\nSorry, I encountered an error. Please try again.";

          // Helper to safely extract the error body from various possible error formats
          const getErrorBody = (err: any) => {
              if (typeof err === 'object' && err !== null) {
                  if (err.error) return err.error; // Direct object { error: ... }
                  if (err.message) { // Error object with stringified JSON in message
                      try { return JSON.parse(err.message).error; } catch (e) { /* ignore */}
                  }
              }
              if (typeof err === 'string') { // Stringified JSON
                  try { return JSON.parse(err).error; } catch (e) { /* ignore */ }
              }
              return null;
          }

          const errorBody = getErrorBody(error);
          
          if (errorBody && (errorBody.status === "RESOURCE_EXHAUSTED" || errorBody.code === 429)) {
              errorMessage = "\n\nIt looks like I'm a bit overwhelmed right now (API rate limit exceeded). Please wait a moment before trying again.";
          }

          setChatMessages(prev => {
               const newMessages = [...prev];
               if(newMessages[modelResponsePlaceholderIndex]) {
                  newMessages[modelResponsePlaceholderIndex] = { role: 'model', parts: [{ text: aggregatedText + errorMessage }]};
               }
               return newMessages;
          });
      } finally {
          setIsAiLoading(false);
      }
    }, [chatMessages, aiTools, executeAiTool, currentTime, timelineDuration, tracks, selectedClipIds, mediaLibrary, ai]);

  const triggerAiSuggestion = useCallback(async (triggerType: 'clip_added' | 'clip_selected', context: { clip?: Clip; asset?: MediaAsset | StockAsset }) => {
      if (isGeneratingSuggestion || !ai || !context.clip) return;
      setIsGeneratingSuggestion(true);
      setAiSuggestions([]);
      
      const { clip, asset } = context;

      const getContextString = () => {
           let str = '';
           if (clip) str += `Clip: Name='${clip.name}', Type='${clip.type}'. `;
           if (asset) {
               const mediaAsset = asset as MediaAsset;
               if (mediaAsset.description) str += `Content: '${mediaAsset.description}'.`;
           }
           return str.trim();
      };
      
      let promptGuidance = "Based on the selected clip, generate 2-3 short, relevant, and creative suggestions for what the user could do next.";

      switch(clip.type) {
          case 'video':
              promptGuidance += " For this video clip, consider suggesting things like: applying a visual effect (e.g., 'Make this clip black and white' or 'Add a cinematic grain effect'), finding suitable background music, or adding a slow-motion effect.";
              break;
          case 'image':
              promptGuidance += " For this image, suggest actions like adding a pan/zoom effect (Ken Burns effect), adding a text overlay, or finding a suitable transition to the next clip.";
              break;
          case 'text':
              promptGuidance += " For this text clip, suggest animating the text (e.g., 'Make this text fade in'), changing its style (font, color), or adding a background to it.";
              break;
          case 'audio':
              promptGuidance += " For this audio clip, suggest adjusting the volume, adding a fade-in/fade-out effect, or finding a video clip to match the audio.";
              break;
          case 'adjustment':
              promptGuidance += " The user has selected an adjustment layer. Suggest modifying its effects, like 'Increase the contrast for a dramatic look' or 'Add a blur effect'.";
              break;
      }

      const prompt = `A user just selected a clip in the video editor.
Context: ${getContextString()}
Timeline has ${tracks.flatMap(t => t.clips).length} clips. Current time is ${currentTime.toFixed(1)}s.
${promptGuidance}`;

      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          suggestions: {
                              type: Type.ARRAY,
                              description: "An array of 2-3 suggestion strings.",
                              items: { type: Type.STRING }
                          }
                      }
                  },
                  systemInstruction: "You are an expert video editing assistant. Your goal is to provide creative and context-aware suggestions to help the user. You MUST respond with a JSON object containing a 'suggestions' array of 2-3 short, actionable suggestion strings. Phrase suggestions as commands the user would give. Examples: 'Make this clip black and white', 'Animate this text to fade in', 'Add a slow-motion effect to this clip'."
              }
          });
          
          const jsonText = response.text.trim();
          const json = JSON.parse(jsonText);
          if (json.suggestions && Array.isArray(json.suggestions)) {
              setAiSuggestions(json.suggestions);
          }
      } catch (error) {
          console.error('Error generating AI suggestions:', error);
      } finally {
          setIsGeneratingSuggestion(false);
      }
  }, [isGeneratingSuggestion, ai, tracks, currentTime]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) { redo(); } else { undo(); }
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
          e.preventDefault();
          redo();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          e.preventDefault();
          handleCopyClip();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
          e.preventDefault();
          handleCutClip();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
          e.preventDefault();
          handlePasteClip();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
            e.preventDefault();
            if (e.shiftKey) {
                handleUngroupClips();
            } else {
                handleGroupClips();
            }
        } else if (e.code === 'Space') {
          e.preventDefault();
          handlePlayPause();
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipIds.length > 0) {
          e.preventDefault();
          handleDeleteSelectedClip();
        } else if (e.code === 'KeyL') {
            e.preventDefault();
            if (!isPlaying) { setIsPlaying(true); setPlaybackRate(1); }
            else if (playbackRate < 0) { setPlaybackRate(1); }
            else if (playbackRate < 4) { setPlaybackRate(p => p * 2); }
        } else if (e.code === 'KeyK') {
            e.preventDefault();
            if (isPlaying) setIsPlaying(false);
        } else if (e.code === 'KeyJ') {
            e.preventDefault();
            if (!isPlaying) { setIsPlaying(true); setPlaybackRate(-1); }
            else if (playbackRate > 0) { setPlaybackRate(-1); }
            else if (playbackRate > -4) { setPlaybackRate(p => p * 2); }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipIds, handleDeleteSelectedClip, handlePlayPause, undo, redo, handleCopyClip, handlePasteClip, handleCutClip, handleGroupClips, handleUngroupClips, isPlaying, playbackRate]);

  useEffect(() => {
    const maxDuration = tracks.reduce((max, track) => {
        const trackMax = track.clips.reduce((clipMax, clip) => Math.max(clipMax, clip.start + clip.duration), 0);
        return Math.max(max, trackMax);
    }, 0);
    // Add a comfortable buffer at the end of the timeline for easier editing.
    const endBuffer = 15; // 15 seconds of extra space
    setTimelineDuration(Math.max(30, maxDuration + endBuffer));
  }, [tracks]);

  const currentVisualClip = useMemo(() => {
    // Iterate from top to bottom track
    for (let i = 0; i < processedTracks.length; i++) {
        const track = processedTracks[i];
        if (track.type === 'video' && track.isVisible) {
            for (const clip of track.clips) {
                if ((clip.type === 'video' || clip.type === 'image') && currentTime >= clip.start && currentTime < clip.start + clip.duration) {
                    return clip;
                }
            }
        }
    }
    return null;
  }, [processedTracks, currentTime]);
  
  useEffect(() => {
    const animate = (time: number) => {
        animationFrameRef.current = requestAnimationFrame(animate);

        if (lastTimeRef.current === null) {
            lastTimeRef.current = time;
            return;
        }

        const deltaTime = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        setCurrentTime(prevTime => {
            const newTime = prevTime + (deltaTime * playbackRate);
            if (newTime >= timelineDuration) {
                setIsPlaying(false);
                return timelineDuration;
            }
            if (newTime <= 0) {
                setIsPlaying(false);
                return 0;
            }
            return newTime;
        });
    };

    if (isPlaying) {
        lastTimeRef.current = null;
        animationFrameRef.current = requestAnimationFrame(animate);
    } else {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }

    return () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };
  }, [isPlaying, timelineDuration, playbackRate]);

  useEffect(() => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    if (selectedClipIds.length === 1) {
      suggestionTimeoutRef.current = window.setTimeout(() => {
        const selectedId = selectedClipIds[0];
        // This inner check is still useful to prevent re-triggering for the same clip if state updates for other reasons
        if (selectedId !== lastTriggeredClipId.current) {
            const track = tracks.find(t => t.clips.some(c => c.id === selectedId));
            const clip = track?.clips.find(c => c.id === selectedId);
            if (clip) {
                const asset = mediaLibrary.find(m => m.id === clip.assetId);
                triggerAiSuggestion('clip_selected', { clip, asset });
                lastTriggeredClipId.current = selectedId;
            }
        }
      }, 500); // 500ms debounce
    } else {
      setAiSuggestions([]);
      lastTriggeredClipId.current = null;
    }

    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [selectedClipIds, tracks, mediaLibrary, triggerAiSuggestion]);

  // --- VIDEO PREVIEW LOGIC ---
  const nextVisualClip = useMemo(() => {
    if (!currentVisualClip) return null;
    const currentClipEndTime = currentVisualClip.start + currentVisualClip.duration;
    let bestCandidate: Clip | null = null;

    for (const track of processedTracks) {
        if (track.type === 'video' && track.isVisible) {
            for (const clip of track.clips) {
                if ((clip.type === 'video' || clip.type === 'image') && clip.start >= currentClipEndTime) {
                    if (!bestCandidate || clip.start < bestCandidate.start) {
                        bestCandidate = clip;
                    }
                }
            }
        }
    }
    return bestCandidate;
  }, [processedTracks, currentVisualClip]);

  useEffect(() => {
    const currentClipId = currentVisualClip?.id || null;
    const nextClipId = nextVisualClip?.id || null;

    setPlayerAssignments(prev => {
        if (currentClipId && prev.B === currentClipId) {
            setActivePlayer('B');
            return { A: nextClipId, B: currentClipId };
        }
        setActivePlayer('A');
        return { A: currentClipId, B: nextClipId };
    });
  }, [currentVisualClip, nextVisualClip]);

  useVideoPlayerController(videoRefA, playerAssignments.A, activePlayer === 'A', isPlaying, currentTime, playbackRate, mediaLibrary, tracks);
  useVideoPlayerController(videoRefB, playerAssignments.B, activePlayer === 'B', isPlaying, currentTime, playbackRate, mediaLibrary, tracks);
  
  const clipA = useMemo(() => tracks.flatMap(t => t.clips).find(c => c.id === playerAssignments.A), [tracks, playerAssignments.A]);
  const clipB = useMemo(() => tracks.flatMap(t => t.clips).find(c => c.id === playerAssignments.B), [tracks, playerAssignments.B]);
  const assetA = useMemo(() => mediaLibrary.find(m => m.id === clipA?.assetId), [mediaLibrary, clipA]);
  const assetB = useMemo(() => mediaLibrary.find(m => m.id === clipB?.assetId), [mediaLibrary, clipB]);
  const srcA = assetA?.status === 'ready' ? assetA.url : '';
  const srcB = assetB?.status === 'ready' ? assetB.url : '';


  // --- AUDIO PLAYBACK ---
  const activeAudioClips = useMemo(() => processedTracks
      .filter(track => track.isVisible && (track.type === 'audio' || track.type === 'video'))
      .flatMap(track => track.clips)
      .filter(clip => (clip.type === 'audio' || clip.type === 'video') && currentTime >= clip.start && currentTime < clip.start + clip.duration), [processedTracks, currentTime]);

  useEffect(() => {
    const activeClipIds = new Set(activeAudioClips.map(c => c.id));
    const audioElements = audioElementsRef.current;

    // Pause and remove unused audio elements
    for (const clipId in audioElements) {
        if (!activeClipIds.has(clipId)) {
            const audio = audioElements[clipId];
            audio.pause();
            if (audio.parentElement) {
                audio.parentElement.removeChild(audio);
            }
            delete audioElements[clipId];
        }
    }

    // Create and update active audio elements
    activeAudioClips.forEach(clip => {
        let audio = audioElements[clip.id];
        const asset = mediaLibrary.find(m => m.id === clip.assetId);
        
        if (!asset || asset.status !== 'ready') return;

        // Create new audio element if it doesn't exist
        if (!audio) {
            audio = document.createElement('audio');
            audio.src = asset.url;
            audioElements[clip.id] = audio;
            document.body.appendChild(audio);
        }

        // Sync time
        const timeWithinAudio = (currentTime - clip.start) + (clip.trimStart || 0);
        if (Math.abs(audio.currentTime - timeWithinAudio) > 0.15 && !audio.seeking) {
            audio.currentTime = timeWithinAudio;
        }

        // Sync volume
        const targetVolume = (clip.volume ?? 100) / 100;
        if (audio.volume !== targetVolume) {
            audio.volume = targetVolume;
        }

        // Sync play/pause state
        if (isPlaying && audio.paused) {
            audio.play().catch(e => { if (e.name !== 'AbortError') console.error("Error playing audio:", e); });
        } else if (!isPlaying && !audio.paused) {
            audio.pause();
        }
    });
  }, [activeAudioClips, isPlaying, currentTime, mediaLibrary]);


  const fullSelectedClips = useMemo(() => {
    return selectedClipIds.map(id => {
        for (const track of processedTracks) {
            const clip = track.clips.find(c => c.id === id);
            if (clip) return clip;
        }
        return null;
    }).filter((c): c is Clip => c !== null);
  }, [selectedClipIds, processedTracks]);

  const activeTextClips = useMemo(() => processedTracks
    .filter(track => track.isVisible && track.type === 'text')
    .flatMap(track => track.clips)
    .filter(clip => currentTime >= clip.start && currentTime < clip.start + clip.duration), [processedTracks, currentTime]);
  
  const activeAdjustmentEffects = useMemo(() => {
    const activeEffects: { [key: string]: number } = {};

    processedTracks
      .filter(track => track.type === 'adjustment' && track.isVisible)
      .flatMap(track => track.clips)
      .filter(clip => currentTime >= clip.start && currentTime < clip.start + clip.duration)
      .flatMap(clip => clip.effects || [])
      .filter(effect => effect.enabled)
      .forEach(effect => {
        // For stackable effects like blur, we sum them up.
        if (effect.type === 'blur') {
            activeEffects[effect.type] = (activeEffects[effect.type] || 0) + effect.value;
        } else {
            // For percentage-based effects, the topmost layer's value is used.
            // Since we iterate from bottom tracks up, we can just overwrite.
            activeEffects[effect.type] = effect.value;
        }
      });

    const filterString = Object.entries(activeEffects)
      .map(([type, value]) => {
          if (type === 'blur') {
              return value > 0 ? `blur(${value}px)` : '';
          }
          return `${type}(${value}%)`;
      })
      .filter(Boolean)
      .join(' ');
      
    return filterString;
  }, [processedTracks, currentTime]);

  const isPreviewedClipSelected = useMemo(() => {
    const selectedIdSet = new Set(selectedClipIds);
    if (currentVisualClip && selectedIdSet.has(currentVisualClip.id)) {
      return true;
    }
    for (const textClip of activeTextClips) {
      if (selectedIdSet.has(textClip.id)) {
        return true;
      }
    }
    return false;
  }, [selectedClipIds, currentVisualClip, activeTextClips]);


  return (
    <div className="flex flex-col h-screen text-slate-100 font-sans bg-transparent">
      <Header />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-1 overflow-hidden min-h-0">
          <IconSidebar activePanel={activePanel} setActivePanel={setActivePanel} />
          <LeftPanel
            activePanel={activePanel}
            onImportMedia={handleImportMedia} 
            mediaLibrary={mediaLibrary}
            onDeleteMedia={handleDeleteMediaAsset}
            stockMediaResults={stockMediaResults}
            searchQuery={stockMediaSearchQuery}
            onSearchQueryChange={setStockMediaSearchQuery}
            onTriggerSearch={handleSearchStockMedia}
            isSearching={isSearchingStockMedia}
            stockMediaProvider={stockMediaProvider}
            onProviderChange={handleProviderChange}
            stockMediaInfoMessage={stockMediaInfoMessage}
            onAddStockAssetToLibrary={handleAddStockAssetToLibrary}
            setDraggingAsset={setDraggingAsset}
          />
          <main className="flex flex-1 items-center justify-center overflow-hidden p-4">
            <Preview 
              videoRefA={videoRefA}
              videoRefB={videoRefB}
              activePlayer={activePlayer}
              clipA={clipA}
              srcA={srcA}
              clipB={clipB}
              srcB={srcB}
              activeTextClips={activeTextClips}
              isPreviewedClipSelected={isPreviewedClipSelected}
              adjustmentFilter={activeAdjustmentEffects}
              currentTime={currentTime}
            />
          </main>
          <RightPanel 
            selectedClips={fullSelectedClips} 
            onUpdateClip={handleUpdateSelectedClip}
            onDeleteClip={handleDeleteSelectedClip}
            chatMessages={chatMessages}
            isAiLoading={isAiLoading}
            onSendMessage={(prompt: string) => {
              setAiSuggestions([]);
              handleSendMessage(prompt);
            }}
            aiSuggestions={aiSuggestions}
          />
        </div>
        <div className="flex-shrink-0">
            <Timeline 
              currentTime={currentTime}
              duration={timelineDuration}
              tracks={processedTracks}
              onSeek={handleSeek}
              onPlayPause={handlePlayPause}
              isPlaying={isPlaying}
              onUpdateClip={handleUpdateClip}
              onUpdateClipLive={handleUpdateClipLive}
              onSelectClip={handleSelectClip}
              onDeselectAll={handleDeselectAll}
              selectedClipIds={selectedClipIds}
              groups={groups}
              onAddTextClip={() => handleAddTextClip('New Text', currentTime, 5)}
              onAddAdjustmentClip={() => {
                const defaultEffects: Effect[] = [
                    { type: 'brightness', value: 100, enabled: true, unit: '%', min: 0, max: 200, step: 1 },
                    { type: 'contrast', value: 100, enabled: true, unit: '%', min: 0, max: 200, step: 1 },
                    { type: 'saturate', value: 100, enabled: true, unit: '%', min: 0, max: 200, step: 1 },
                    { type: 'blur', value: 0, enabled: true, unit: 'px', min: 0, max: 20, step: 0.1 },
                    { type: 'grayscale', value: 0, enabled: false, unit: '%', min: 0, max: 100, step: 1 },
                    { type: 'sepia', value: 0, enabled: false, unit: '%', min: 0, max: 100, step: 1 },
                    { type: 'invert', value: 0, enabled: false, unit: '%', min: 0, max: 100, step: 1 },
                ];
                handleAddAdjustmentClip(currentTime, 10, defaultEffects);
              }}
              onAddClip={handleAddClip}
              onAddTrack={handleAddTrack}
              onDeleteTrack={handleDeleteTrack}
              onUpdateTrack={handleUpdateTrack}
              onSplitClip={handleSplitClip}
              mediaLibrary={mediaLibrary}
              onAddStockClip={handleAddStockClip}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              isMagnetic={isMagnetic}
              onToggleMagnetic={setIsMagnetic}
              draggingAsset={draggingAsset}
              activeTool={activeTool}
              onSetTool={setActiveTool}
              onCopyClip={handleCopyClip}
              onPasteClip={handlePasteClip}
              copiedClip={copiedClip}
              onGroupClips={handleGroupClips}
              onUngroupClips={handleUngroupClips}
              onDeleteSelectedClip={handleDeleteSelectedClip}
            />
        </div>
      </div>
    </div>
  );
};

export default App;