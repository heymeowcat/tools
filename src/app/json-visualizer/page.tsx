'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { JsonNode } from './components/JsonNode';
import { 
  FileJson, 
  Maximize2, 
  Minimize2, 
  Search, 
  Download, 
  Upload, 
  Trash2, 
  Copy, 
  Check, 
  Code2,
  Braces,
  AlignLeft
} from 'lucide-react';

const SAMPLE_DATA = {
  "app": "JSON Visualizer",
  "version": "1.0.0",
  "features": [
    "Syntax Highlighting",
    "Collapsible Nodes",
    "Search & Filter",
    "Dark Mode Support"
  ],
  "settings": {
    "theme": "dark",
    "autoFormat": true,
    "maxDepth": 10
  },
  "stats": {
    "users": 1000,
    "rating": 4.9,
    "issues": null
  },
  "contributors": [
    { "name": "Vidura", "commits": 450 },
    { "name": "Dulanjan", "commits": 210 }
  ]
};

export default function JsonVisualizer() {
  const [input, setInput] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandAll, setExpandAll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'raw'>('tree');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sample data on mount
  useEffect(() => {
    setInput(JSON.stringify(SAMPLE_DATA, null, 2));
    setParsedData(SAMPLE_DATA);
  }, []);

  const handleFormat = () => {
    if (!input.trim()) {
      setParsedData(null);
      setError(null);
      return;
    }

    try {
      const parsed = JSON.parse(input);
      setParsedData(parsed);
      setInput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      // Don't clear parsedData immediately so user can see previous valid state? 
      // No, better to clear or show error state.
      // Let's keep the input as is but show error.
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
      setParsedData(parsed);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleClear = () => {
    setInput('');
    setParsedData(null);
    setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInput(content);
      try {
        const parsed = JSON.parse(content);
        setParsedData(parsed);
        setError(null);
      } catch (err) {
        setError("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    if (!input) return;
    const blob = new Blob([input], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Live validation (optional, maybe debounce this in a real app)
  useEffect(() => {
    if (!input.trim()) {
      setParsedData(null);
      setError(null);
      return;
    }
    
    const timer = setTimeout(() => {
      try {
        const parsed = JSON.parse(input);
        setParsedData(parsed);
        setError(null);
      } catch (err) {
        // Only set error if we want live error feedback, which can be annoying while typing.
        // Let's just not update parsedData if invalid, but maybe show a subtle indicator?
        // For now, rely on manual "Format" or just show error if it was previously valid.
        // Actually, let's show error only on manual action or if we want strict mode.
        // I'll leave it to manual Format for strict error reporting, but try to parse silently.
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [input]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans selection:bg-emerald-500/30">
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
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-lg shadow-emerald-500/20">
                <Braces size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">JSON Visualizer</h1>
                <p className="text-xs text-gray-500 font-medium">Editor & Viewer</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
            >
              <Upload size={16} />
              Import
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".json" 
              className="hidden" 
            />
            
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
            >
              <Download size={16} />
              Export
            </button>

            
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto p-4 h-[calc(100vh-64px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          
          {/* Left Panel: Input */}
          <div className="flex flex-col gap-0 bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-xl dark:shadow-2xl">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">Input</span>
                <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
                <button 
                  onClick={handleFormat}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors"
                >
                  <AlignLeft size={14} />
                  Format
                </button>
                <button 
                  onClick={handleMinify}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-md transition-colors"
                >
                  <Minimize2 size={14} />
                  Minify
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopy}
                  className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
                  title="Copy to Clipboard"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
                <button 
                  onClick={handleClear}
                  className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                  title="Clear"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="relative flex-1 group">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your JSON here..."
                className="absolute inset-0 w-full h-full p-4 bg-transparent text-sm font-mono text-gray-800 dark:text-gray-300 resize-none focus:outline-none selection:bg-emerald-500/30 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                spellCheck={false}
              />
            </div>
            
            {/* Footer Stats */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 text-[10px] text-gray-500 font-mono flex justify-between">
              <span>{input.length} chars</span>
              <span>{input.split('\n').length} lines</span>
            </div>
          </div>

          {/* Right Panel: Visualizer */}
          <div className="flex flex-col gap-0 bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-xl dark:shadow-2xl relative">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">Viewer</span>
                <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
                <div className="flex bg-gray-200 dark:bg-black/40 rounded-lg p-0.5 border border-gray-200 dark:border-white/5">
                  <button 
                    onClick={() => setViewMode('tree')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'tree' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    Tree
                  </button>
                  <button 
                    onClick={() => setViewMode('raw')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'raw' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    Raw
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative group">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search keys or values..."
                    className="w-48 bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-800 dark:text-gray-300 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                </div>

                <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />

                <button 
                  onClick={() => setExpandAll(!expandAll)}
                  className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
                  title={expandAll ? "Collapse All" : "Expand All"}
                >
                  {expandAll ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
              {error ? (
                <div className="flex flex-col items-center justify-center h-full text-rose-500 gap-3 animate-in fade-in zoom-in duration-300">
                  <div className="p-3 bg-rose-500/10 rounded-full">
                    <FileJson size={32} />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold">Invalid JSON</h3>
                    <p className="text-sm opacity-70 mt-1 max-w-md">{error}</p>
                  </div>
                </div>
              ) : !parsedData ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 gap-3">
                  <Code2 size={48} className="opacity-20" />
                  <p className="text-sm">Enter valid JSON to visualize</p>
                </div>
              ) : viewMode === 'raw' ? (
                 <pre className="font-mono text-sm text-gray-800 dark:text-gray-300 whitespace-pre-wrap break-all">
                   {JSON.stringify(parsedData, null, 2)}
                 </pre>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <JsonNode 
                    value={parsedData} 
                    initiallyExpanded={expandAll}
                    searchTerm={searchTerm}
                    isLast={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
