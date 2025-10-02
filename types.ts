import React from 'react';

export interface Animation {
  type: 'none' | 'fade' | 'slide-top' | 'slide-bottom' | 'slide-left' | 'slide-right' | 'zoom';
  duration: number; // in seconds
}

export interface Effect {
  type: 'brightness' | 'contrast' | 'saturate' | 'blur' | 'grayscale' | 'sepia' | 'invert';
  value: number;
  enabled: boolean;
  unit: string;
  min: number;
  max: number;
  step: number;
}

export interface Transform {
    position: { x: number; y: number };
    scale: number;
    rotation: number;
    opacity: number;
}

export interface Clip {
  id: string;
  name: string;
  start: number;
  duration: number;
  type: 'video' | 'image' | 'text' | 'adjustment' | 'audio';
  content?: string; // For text clips
  style?: React.CSSProperties; // For text styling
  assetId?: string; // For video/audio/image clips
  trimStart?: number; // For video/audio clip trimming
  effects?: Effect[]; // For adjustment clips
  transform?: Transform; // For video, image and text clips
  volume?: number; // For audio clips
  animation?: {
    in?: Animation;
    out?: Animation;
  };
  hasKenBurns?: boolean;
}

export interface Track {
  id: string;
  name: string;
  clips: Clip[];
  type: 'video' | 'text' | 'adjustment' | 'audio';
  isLocked?: boolean;
  isVisible?: boolean;
}

export interface MediaAsset {
  id:string;
  name: string;
  url: string;
  thumbnail?: string;
  file?: File;
  duration: number;
  status?: 'downloading' | 'ready';
  type: 'video' | 'audio' | 'image';
  width?: number;
  height?: number;
  sampleRate?: number;
  description?: string;
}

export interface StockAsset {
    id: string;
    name: string;
    thumbnail: string;
    url: string;
    type: 'video' | 'image';
    duration?: number;
}

export interface Group {
  id: string;
  clipIds: string[];
}

export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export type EditorTool = 'select' | 'slip';
export type ActivePanel = 'media-library' | 'assets' | null;