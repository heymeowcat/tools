import { useRef, useState } from 'react';
import { Upload, Trash2, Copy, Check, AlignLeft, Minimize2, FileJson, AlertCircle } from 'lucide-react';

interface DiffEditorProps {
  title: string;
  value: string;
  onChange: (val: string) => void;
  onFormat: () => void;
  onMinify: () => void;
  onClear: () => void;
  onLoadSample: () => void;
  placeholder?: string;
  error: string | null;
  accentColor: 'indigo' | 'violet';
}

export function DiffEditor({
  title,
  value,
  onChange,
  onFormat,
  onMinify,
  onClear,
  onLoadSample,
  placeholder = "Paste or drop JSON here...",
  error,
  accentColor,
}: DiffEditorProps) {
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onChange(content);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "application/json" || file.name.endsWith(".json") || file.name.endsWith(".txt"))) {
      readFile(file);
    }
  };

  const lineCount = value ? value.split('\n').length : 0;
  const charCount = value.length;

  const accentStyles = {
    indigo: {
      text: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/10 hover:bg-indigo-500/20',
      border: 'focus-within:border-indigo-500/50 focus-within:ring-indigo-500/20',
      dragBorder: 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10',
    },
    violet: {
      text: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-500/10 hover:bg-violet-500/20',
      border: 'focus-within:border-violet-500/50 focus-within:ring-violet-500/20',
      dragBorder: 'border-violet-500 bg-violet-500/5 dark:bg-violet-500/10',
    }
  };

  const styles = accentStyles[accentColor];

  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleTextareaScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col h-[480px] bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-lg transition-all duration-300 ${
        isDragging ? styles.dragBorder + ' scale-[0.99] border-dashed border-2' : styles.border
      }`}
    >
      {/* Header Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">{title}</span>
          <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
          
          <button
            onClick={onFormat}
            disabled={!value}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.text} ${styles.bg}`}
            title="Format JSON"
          >
            <AlignLeft size={13} />
            Format
          </button>
          
          <button
            onClick={onMinify}
            disabled={!value}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20`}
            title="Minify JSON"
          >
            <Minimize2 size={13} />
            Minify
          </button>

          <button
            onClick={onLoadSample}
            className="text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            Sample
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
            title="Upload File"
          >
            <Upload size={14} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,.txt"
            className="hidden"
          />

          <button
            onClick={handleCopy}
            disabled={!value}
            className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors disabled:opacity-50"
            title="Copy content"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>

          <button
            onClick={onClear}
            disabled={!value}
            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
            title="Clear"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Line numbers container (visual helper) */}
        <div 
          ref={lineNumbersRef}
          className="hidden sm:flex flex-col text-right select-none py-4 px-2 border-r border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] text-gray-300 dark:text-gray-600 font-mono text-xs leading-6 min-w-10 overflow-hidden h-full"
        >
          {Array.from({ length: Math.max(1, lineCount) }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleTextareaScroll}
          placeholder={placeholder}
          className="flex-1 w-full p-4 bg-transparent text-sm font-mono text-gray-800 dark:text-gray-300 resize-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 leading-6 overflow-auto custom-scrollbar"
          spellCheck={false}
        />

        {/* Drag Over Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-white/90 dark:bg-black/90 flex flex-col items-center justify-center gap-3 animate-fade-in z-20">
            <div className={`p-4 rounded-2xl ${styles.bg} ${styles.text} animate-bounce`}>
              <FileJson size={32} />
            </div>
            <p className="text-sm font-semibold">Drop JSON file to import</p>
          </div>
        )}
      </div>

      {/* Error Panel or Footer */}
      {error ? (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border-t border-red-500/20 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <div className="font-medium break-all">
            {error}
          </div>
        </div>
      ) : (
        <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 text-[10px] text-gray-500 font-mono flex justify-between">
          <span>{charCount.toLocaleString()} chars</span>
          <span>{lineCount.toLocaleString()} lines</span>
        </div>
      )}
    </div>
  );
}
