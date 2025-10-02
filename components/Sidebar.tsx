import React, { useRef, useState } from 'react';
import { MediaAsset, StockAsset, ActivePanel } from '../types';

const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
const CheckIconSmall = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-4 w-4 mr-1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const AudioFileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-green-400"><path fillRule="evenodd" d="M19.952 1.651a.75.75 0 01.298.599v16.5a3 3 0 01-5.603 2.048l-5.625-3.375a3 3 0 01-1.32-2.572V9.602a3 3 0 011.32-2.572l5.625-3.375a3 3 0 015.603 2.048zM15 4.832l-5.042 3.025a1.5 1.5 0 00-.659 1.286v4.695c0 .641.348 1.214.91 1.492l5.042 3.025V4.832z" clipRule="evenodd" /></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-blue-400"><path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25-2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" /></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>;

const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(14, 5); // MM:SS
};

interface LeftPanelProps {
  activePanel: ActivePanel;
  onImportMedia: (file: File) => void;
  mediaLibrary: MediaAsset[];
  onDeleteMedia: (assetId: string) => void;
  stockMediaResults: StockAsset[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onTriggerSearch: (query: string, mediaType: 'video' | 'image') => Promise<StockAsset[]>;
  isSearching: boolean;
  stockMediaProvider: 'pexels' | 'pixabay';
  onProviderChange: (provider: 'pexels' | 'pixabay') => void;
  stockMediaInfoMessage: string | null;
  onAddStockAssetToLibrary: (stockAsset: StockAsset) => void;
  setDraggingAsset: (assetInfo: { asset: MediaAsset | StockAsset; type: 'local' | 'stock' } | null) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ 
  activePanel,
  onImportMedia, 
  mediaLibrary, 
  onDeleteMedia, 
  stockMediaResults,
  searchQuery,
  onSearchQueryChange,
  onTriggerSearch,
  isSearching,
  stockMediaProvider,
  onProviderChange,
  stockMediaInfoMessage,
  onAddStockAssetToLibrary,
  setDraggingAsset
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [stockMediaType, setStockMediaType] = useState<'video' | 'image'>('video');

  if (activePanel === null) {
    return null;
  }

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file) {
          onImportMedia(file);
        }
      }
    }
    if (event.target) {
      event.target.value = '';
    }
  };
  
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        onTriggerSearch(searchQuery, stockMediaType);
    }
  };

  const filteredMedia = mediaLibrary.filter(asset => {
    const matchesFilter = mediaFilter === 'all' || asset.type === mediaFilter;
    const matchesSearch = asset.name.toLowerCase().includes(mediaSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getMediaFilterTabClass = (filter: 'all' | 'video' | 'audio' | 'image') => {
    return `w-full text-center text-xs font-semibold py-1.5 rounded-md transition-colors duration-200 focus:outline-none ${
      mediaFilter === filter 
      ? 'bg-white text-black' 
      : 'text-text-secondary hover:bg-white/10'
    }`;
  };
  
  const getStockTabClass = (type: 'video' | 'image') => {
    return `w-full text-center text-xs font-semibold py-1.5 rounded-md transition-colors duration-200 focus:outline-none ${
      stockMediaType === type 
      ? 'bg-accent-red text-white' 
      : 'text-text-secondary hover:bg-white/10'
    }`;
  };

  const getProviderTabClass = (provider: 'pexels' | 'pixabay') => {
    return `w-full text-center text-xs font-semibold py-1.5 rounded-md transition-colors duration-200 focus:outline-none ${
      stockMediaProvider === provider 
      ? 'bg-white text-black' 
      : 'text-text-secondary hover:bg-white/10'
    }`;
  };
  
  const createDragPreview = (e: React.DragEvent<HTMLDivElement>) => {
    const dragPreview = e.currentTarget.cloneNode(true) as HTMLElement;
    dragPreview.style.position = 'absolute';
    dragPreview.style.top = '-9999px';
    dragPreview.style.opacity = '0.7';
    dragPreview.style.width = `${e.currentTarget.clientWidth}px`;
    dragPreview.style.height = `${e.currentTarget.clientHeight}px`;
    document.body.appendChild(dragPreview);
    e.dataTransfer.setDragImage(dragPreview, e.currentTarget.clientWidth / 2, e.currentTarget.clientHeight / 2);
    setTimeout(() => document.body.removeChild(dragPreview), 0);
  };

  return (
    <aside className="w-80 bg-slate-800/30 backdrop-blur-lg border-r border-white/5 p-4 flex flex-col space-y-4 flex-shrink-0">
      {activePanel === 'media-library' && (
        <>
            <div className="flex flex-col space-y-3">
              <h2 className="text-sm font-semibold text-text-secondary px-1">Media Library</h2>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*,audio/*,image/*"
                style={{ display: 'none' }}
                multiple
              />
              <button 
                onClick={handleImportClick}
                className="flex items-center justify-center w-full text-sm font-bold bg-white text-black px-4 py-2 rounded-md hover:bg-slate-200 transition-colors duration-200"
              >
                  <UploadIcon /> Import Media
              </button>
              <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search your media..."
                    className="w-full bg-black/40 border border-white/10 py-1.5 pl-8 pr-3 text-sm placeholder-text-tertiary focus:ring-2 focus:ring-white focus:outline-none transition-colors rounded-md"
                    value={mediaSearch}
                    onChange={(e) => setMediaSearch(e.target.value)}
                  />
                  <div className="absolute inset-y-0 left-0 px-2.5 flex items-center text-zinc-400 pointer-events-none">
                      <SearchIcon/>
                  </div>
              </div>
              <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-lg">
                  <button className={getMediaFilterTabClass('all')} onClick={() => setMediaFilter('all')}>All</button>
                  <button className={getMediaFilterTabClass('video')} onClick={() => setMediaFilter('video')}>Video</button>
                  <button className={getMediaFilterTabClass('image')} onClick={() => setMediaFilter('image')}>Image</button>
                  <button className={getMediaFilterTabClass('audio')} onClick={() => setMediaFilter('audio')}>Audio</button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden border-2 border-dashed border-white/10 rounded-lg">
              {mediaLibrary.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center text-xs text-text-secondary">
                  <p>Drag media here or<br/>use the import button.</p>
                </div>
              ) : (
                <div className="flex-1 p-2 overflow-y-auto space-y-1.5">
                  {filteredMedia.length > 0 ? filteredMedia.map(asset => (
                    <div
                      key={asset.id}
                      className="flex items-center p-1.5 rounded-md hover:bg-white/5 transition-colors group relative"
                      draggable={asset.status === 'ready'}
                      onDragStart={(e) => {
                        if (asset.status !== 'ready') {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.setData('application/vnd.local-asset+json', JSON.stringify(asset));
                        e.dataTransfer.effectAllowed = 'copy';
                        createDragPreview(e);
                        setDraggingAsset({ asset, type: 'local' });
                      }}
                      onDragEnd={() => setDraggingAsset(null)}
                    >
                      <div 
                        className={`aspect-video h-11 bg-black rounded-md overflow-hidden ring-1 ring-white/10 flex items-center justify-center flex-shrink-0 ${asset.status !== 'ready' ? 'cursor-not-allowed' : 'cursor-grab'}`}
                      >
                        {asset.type === 'video' || asset.type === 'image' ? (
                          <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover pointer-events-none"/>
                        ) : asset.type === 'audio' ? (
                          <AudioFileIcon />
                        ) : <ImageIcon />}
                      </div>
                      <div className="flex-1 min-w-0 ml-3 text-left">
                        <p className="text-sm font-semibold text-text-primary truncate" title={asset.name}>{asset.name}</p>
                         <div className="flex items-center space-x-1.5 text-xs text-text-tertiary">
                           <span>{formatDuration(asset.duration)}</span>
                           {(asset.width || asset.sampleRate) && <span className="text-white/20">&middot;</span>}
                           {(asset.type === 'video' || asset.type === 'image') && asset.width && asset.height && (
                             <span>{`${asset.width}x${asset.height}`}</span>
                           )}
                           {asset.type === 'audio' && asset.sampleRate && (
                             <span>{`${(asset.sampleRate / 1000).toFixed(1)}kHz`}</span>
                           )}
                         </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMedia(asset.id);
                        }}
                        className="ml-2 p-1.5 text-text-tertiary rounded-full hover:bg-accent-red hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete Media"
                        aria-label="Delete Media"
                      >
                        <TrashIcon />
                      </button>
                      {asset.status === 'downloading' && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-md">
                            <Spinner />
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="flex-1 flex items-center justify-center text-center text-xs text-text-secondary">
                        <p>No media matching your search.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
        </>
      )}
      
      {activePanel === 'assets' && (
        <div className="flex flex-col flex-1 overflow-hidden">
            <h2 className="text-sm font-semibold text-text-secondary mb-3 px-1">Stock Media</h2>
            
            <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-lg mb-3">
                <button className={getProviderTabClass('pexels')} onClick={() => onProviderChange('pexels')}>Pexels</button>
                <button className={getProviderTabClass('pixabay')} onClick={() => onProviderChange('pixabay')}>Pixabay</button>
            </div>

            <div className="flex items-center space-x-2 mb-3 bg-black/40 p-1 rounded-lg">
            <button className={getStockTabClass('video')} onClick={() => setStockMediaType('video')}>Videos</button>
            <button className={getStockTabClass('image')} onClick={() => setStockMediaType('image')}>Images</button>
            </div>

            <div className="relative mb-3">
                <input 
                type="text" 
                placeholder={`Search for ${stockMediaType}s...`}
                className="w-full bg-black/40 border border-white/10 py-1.5 pl-3 pr-8 text-sm placeholder-text-tertiary focus:ring-2 focus:ring-white focus:outline-none transition-colors rounded-md"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                />
                <button onClick={() => onTriggerSearch(searchQuery, stockMediaType)} className="absolute inset-y-0 right-0 px-3 flex items-center text-zinc-400 hover:text-white transition-colors" aria-label="Search">
                    <SearchIcon/>
                </button>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
                {isSearching ? (
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
                ) : stockMediaResults.length > 0 ? stockMediaResults.map(asset => {
                    const libAsset = mediaLibrary.find(libAsset => libAsset.id === asset.id);
                    const isInLibrary = !!libAsset;
                    const isDownloading = libAsset?.status === 'downloading';

                    return (
                    <div
                        key={asset.id}
                        className="flex items-center p-1.5 rounded-md hover:bg-white/5 transition-colors group"
                        draggable={!isDownloading && isInLibrary}
                        onDragStart={(e) => {
                        if (isDownloading || !isInLibrary) {
                            e.preventDefault();
                            return;
                        }
                        e.dataTransfer.setData('application/vnd.stock-asset+json', JSON.stringify(asset));
                        e.dataTransfer.effectAllowed = 'copy';
                        createDragPreview(e);
                        setDraggingAsset({ asset, type: 'stock' });
                        }}
                        onDragEnd={() => setDraggingAsset(null)}
                    >
                        <div className="aspect-video h-11 bg-black rounded-md overflow-hidden ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
                        <img src={asset.thumbnail} alt={asset.name} className="w-full h-full object-cover pointer-events-none"/>
                        </div>

                        <div className="flex-1 min-w-0 ml-3 text-left">
                            <p className="text-sm font-semibold text-text-primary truncate" title={asset.name}>{asset.name}</p>
                            {asset.type === 'video' && <p className="text-xs text-text-tertiary">{formatDuration(asset.duration!)}</p>}
                        </div>

                        <div className="ml-2 w-20 flex justify-end">
                            {isDownloading ? (
                                <div className="flex items-center justify-center w-full h-full"><Spinner/></div>
                            ) : isInLibrary ? (
                                <button className="text-xs font-semibold bg-white/10 text-text-secondary px-3 py-1 rounded-md flex items-center cursor-default" disabled>
                                    <CheckIconSmall /> Added
                                </button>
                            ) : (
                                <button 
                                    onClick={() => onAddStockAssetToLibrary(asset)}
                                    className="text-xs font-semibold bg-white/5 text-text-secondary px-3 py-1 rounded-md hover:bg-white/10 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                    aria-label="Add to library"
                                >
                                    Add
                                </button>
                            )}
                        </div>
                    </div>
                    );
                }) : (
                <div className="flex items-center justify-center text-center text-xs text-text-secondary p-4 h-full">
                    <p>{stockMediaInfoMessage || (searchQuery ? 'No results found.' : 'Use the AI chat or search bar to find stock media.')}</p>
                </div>
                )}
            </div>
        </div>
      )}
    </aside>
  );
};

export default LeftPanel;