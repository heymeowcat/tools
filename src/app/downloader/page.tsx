'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface VideoMetadata {
  title: string;
  thumbnail_url: string;
  author_name: string;
  provider_url: string;
}

type Format = '1080' | '720' | '480' | '360' | 'mp3';

export default function Downloader() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'ready' | 'downloading' | 'error'>('idle');
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Options
  const [selectedFormat, setSelectedFormat] = useState<Format>('1080');
  const [isClip, setIsClip] = useState(false);
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('00:10');

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setStatus('analyzing');
    setErrorMsg('');
    setMetadata(null);

    try {
      // Use YouTube's official oEmbed endpoint for metadata
      // We use a CORS proxy if needed, but oEmbed often allows direct access or we can use noembed
      const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (data.error) {
        throw new Error('Could not find video. Please check the URL.');
      }

      setMetadata({
        title: data.title,
        thumbnail_url: data.thumbnail_url,
        author_name: data.author_name,
        provider_url: data.provider_url,
      });
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setErrorMsg('Failed to fetch video info. Make sure it is a valid public YouTube link.');
    }
  };

  const handleDownload = async () => {
    if (!url || !metadata) return;
    setStatus('downloading');
    setErrorMsg('');

    try {
      const isAudio = selectedFormat === 'mp3';
      
      // Call our server-side API route to get the download URL
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          vQuality: selectedFormat,
          isAudioOnly: isAudio,
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        // Determine file extension based on format
        const extension = isAudio ? 'mp3' : 'mp4';
        
        // Clean the title for use as filename
        const cleanTitle = metadata.title
          .replace(/[/\\?%*:|"<>]/g, '-') // Replace invalid filename characters
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .substring(0, 100); // Limit length
        
        const filename = `${cleanTitle}.${extension}`;
        
        // Use our proxy endpoint to download the file
        const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(data.url)}&filename=${encodeURIComponent(filename)}`;
        
        try {
          setStatus('downloading'); // Keep status as downloading while fetching blob
          
          // Fetch the file content first
          const fileResponse = await fetch(proxyUrl);
          
          if (!fileResponse.ok) {
            throw new Error(`Download failed: ${fileResponse.statusText}`);
          }
          
          const blob = await fileResponse.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          
          // Create download link
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up
          window.URL.revokeObjectURL(blobUrl);
          
          setStatus('ready');
          setErrorMsg('');
        } catch (downloadError) {
          console.error('Download error:', downloadError);
          throw new Error('Failed to download file content');
        }
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg((err as Error).message || 'Download service unavailable. Please try again later.');
    }
  };

  // Helper to parse time string to seconds could be useful if we needed to validate
  // const parseTime = (time: string) => {
  //   const [min, sec] = time.split(':').map(Number);
  //   return min * 60 + sec;
  // };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg shadow-lg shadow-blue-500/20">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">Media Downloader</h1>
                <p className="text-xs text-gray-500 font-medium">YouTube & More</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-8">

        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-xl shadow-blue-500/5">
          {/* URL Input Form */}
          <form onSubmit={handleAnalyze} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Paste YouTube URL here..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (status === 'ready' || status === 'error') {
                    setStatus('idle');
                    setMetadata(null);
                  }
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                required
              />
              <button
                type="submit"
                disabled={status === 'analyzing'}
                className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'analyzing' ? '...' : 'Analyze'}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {status === 'error' && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm">
              {errorMsg}
            </div>
          )}

          {/* Video Metadata & Options */}
          {metadata && status !== 'idle' && status !== 'analyzing' && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-6 mb-8">
                {/* Thumbnail */}
                <div className="relative w-full md:w-64 aspect-video rounded-lg overflow-hidden shadow-md bg-black">
                  <Image 
                    src={metadata.thumbnail_url} 
                    alt={metadata.title}
                    fill
                    className="object-cover"
                  />
                </div>
                
                {/* Info */}
                <div className="flex-1 space-y-2">
                  <h2 className="text-xl font-bold line-clamp-2">{metadata.title}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    By {metadata.author_name}
                  </p>
                </div>
              </div>

              <div className="space-y-6 border-t border-gray-200 dark:border-white/10 pt-6">
                {/* Format Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Format</label>
                  <div className="flex flex-wrap gap-2">
                    {(['1080', '720', '480', '360', 'mp3'] as Format[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setSelectedFormat(fmt)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium border transition-all
                          ${selectedFormat === fmt
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-transparent border-gray-200 dark:border-white/10 hover:border-blue-500/50'
                          }
                        `}
                      >
                        {fmt === 'mp3' ? 'Audio (MP3)' : `${fmt}p MP4`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clip Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Clip Video (Optional)
                    </label>
                    <button
                      onClick={() => setIsClip(!isClip)}
                      className={`
                        w-12 h-6 rounded-full transition-colors relative
                        ${isClip ? 'bg-blue-600' : 'bg-gray-200 dark:bg-white/10'}
                      `}
                    >
                      <div className={`
                        absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform
                        ${isClip ? 'translate-x-6' : 'translate-x-0'}
                      `} />
                    </button>
                  </div>

                  {isClip && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Start Time (MM:SS)</label>
                        <input
                          type="text"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-sm"
                          placeholder="00:00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">End Time (MM:SS)</label>
                        <input
                          type="text"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-sm"
                          placeholder="00:10"
                        />
                      </div>
                      <p className="col-span-2 text-xs text-orange-500">
                        Note: Clipping might not be supported by all public servers.
                      </p>
                    </div>
                  )}
                </div>

                {/* Download Action */}
                <button
                  onClick={handleDownload}
                  disabled={status === 'downloading'}
                  className={`
                    w-full py-4 rounded-xl font-bold text-white text-lg shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0
                    ${status === 'downloading'
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-violet-600 hover:shadow-blue-500/25'
                    }
                  `}
                >
                  {status === 'downloading' ? 'Processing...' : 'Download Now'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
