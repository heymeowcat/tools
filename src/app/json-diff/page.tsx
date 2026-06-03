'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { GitCompare, ArrowLeftRight, Trash2, Eye, EyeOff, Sparkles, Check, Play } from 'lucide-react';
import { DiffEditor } from './components/DiffEditor';
import { DiffSummary } from './components/DiffSummary';
import { DiffViewer } from './components/DiffViewer';
import { computeAlignedDiff, parseJSON, AlignedRow } from './utils/diffHelper';

const SAMPLE_LEFT = {
  "name": "DevTools Platform",
  "status": "active",
  "version": "1.4.2",
  "description": "Essential utility suites for frontend developers.",
  "tags": [
    "formatting",
    "validation",
    "linting"
  ],
  "config": {
    "theme": "dark",
    "autoSave": true,
    "shortcuts": {
      "save": "Ctrl+S",
      "clear": "Ctrl+K"
    }
  },
  "dependencies": {
    "next": "16.0.3",
    "react": "19.2.0"
  }
};

const SAMPLE_RIGHT = {
  "name": "DevTools Platform",
  "status": "production",
  "version": "1.5.0",
  "description": "Essential utility suites for modern developers.",
  "tags": [
    "formatting",
    "validation",
    "diffing",
    "optimization"
  ],
  "config": {
    "theme": "system",
    "autoSave": true,
    "shortcuts": {
      "save": "Ctrl+S",
      "clear": "Ctrl+K",
      "compare": "Ctrl+D"
    }
  },
  "dependencies": {
    "next": "16.0.3",
    "react": "19.2.0",
    "diff": "^5.2.0"
  },
  "devDependencies": {
    "typescript": "^5"
  }
};

export default function JsonDiffPage() {
  // Input states
  const [leftInput, setLeftInput] = useState('');
  const [rightInput, setRightInput] = useState('');
  
  // Validation states
  const [leftError, setLeftError] = useState<string | null>(null);
  const [rightError, setRightError] = useState<string | null>(null);

  // Settings states
  const [sortKeys, setSortKeys] = useState(true);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(true);
  const [isPlainTextMode, setIsPlainTextMode] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [showInputs, setShowInputs] = useState(true);

  // Comparison Results
  const [alignedRows, setAlignedRows] = useState<AlignedRow[]>([]);
  const [stats, setStats] = useState({ added: 0, removed: 0, modified: 0 });
  const [diffIndices, setDiffIndices] = useState<number[]>([]);
  const [activeDiffIndex, setActiveDiffIndex] = useState(-1);

  // Trigger loading sample data on mount
  useEffect(() => {
    setLeftInput(JSON.stringify(SAMPLE_LEFT, null, 2));
    setRightInput(JSON.stringify(SAMPLE_RIGHT, null, 2));
  }, []);

  // Validate JSON on changes
  useEffect(() => {
    if (isPlainTextMode) {
      setLeftError(null);
      setRightError(null);
      return;
    }

    // Left Input Validation
    if (leftInput.trim()) {
      const { error } = parseJSON(leftInput);
      setLeftError(error);
    } else {
      setLeftError(null);
    }

    // Right Input Validation
    if (rightInput.trim()) {
      const { error } = parseJSON(rightInput);
      setRightError(error);
    } else {
      setRightError(null);
    }
  }, [leftInput, rightInput, isPlainTextMode]);

  // Debounced auto-compare when inputs or configurations change
  useEffect(() => {
    const timer = setTimeout(() => {
      // If either side is invalid JSON and we are NOT in plain text mode, don't update diffs
      if (!isPlainTextMode && (leftError || rightError)) {
        return;
      }

      const { rows, addedCount, removedCount, modifiedCount } = computeAlignedDiff(
        leftInput,
        rightInput,
        { sortKeys, ignoreWhitespace, isPlainTextMode }
      );

      setAlignedRows(rows);
      setStats({ added: addedCount, removed: removedCount, modified: modifiedCount });

      const diffRows = rows
        .filter(r => r.left.type !== 'unchanged' || r.right.type !== 'unchanged')
        .map(r => r.index);

      setDiffIndices(diffRows);
      
      // Reset active diff index if total differences change
      if (diffRows.length > 0) {
        setActiveDiffIndex(0);
      } else {
        setActiveDiffIndex(-1);
      }
    }, 250); // Small debounce

    return () => clearTimeout(timer);
  }, [leftInput, rightInput, sortKeys, ignoreWhitespace, isPlainTextMode, leftError, rightError]);

  // Actions
  const handleSwap = () => {
    const temp = leftInput;
    setLeftInput(rightInput);
    setRightInput(temp);
  };

  const handleClearAll = () => {
    setLeftInput('');
    setRightInput('');
    setAlignedRows([]);
    setStats({ added: 0, removed: 0, modified: 0 });
    setDiffIndices([]);
    setActiveDiffIndex(-1);
  };

  // Format Helper
  const formatInput = (text: string, setInputVal: (val: string) => void, setErrorVal: (err: string | null) => void) => {
    try {
      const parsed = JSON.parse(text);
      setInputVal(JSON.stringify(parsed, null, 2));
      setErrorVal(null);
    } catch (err) {
      setErrorVal((err as Error).message);
    }
  };

  // Minify Helper
  const minifyInput = (text: string, setInputVal: (val: string) => void, setErrorVal: (err: string | null) => void) => {
    try {
      const parsed = JSON.parse(text);
      setInputVal(JSON.stringify(parsed));
      setErrorVal(null);
    } catch (err) {
      setErrorVal((err as Error).message);
    }
  };

  // Diff Navigation
  const handleNextDiff = () => {
    if (diffIndices.length === 0) return;
    setActiveDiffIndex((prev) => (prev + 1) % diffIndices.length);
  };

  const handlePrevDiff = () => {
    if (diffIndices.length === 0) return;
    setActiveDiffIndex((prev) => (prev - 1 + diffIndices.length) % diffIndices.length);
  };

  const hasErrors = !isPlainTextMode && (leftError !== null || rightError !== null);
  const hasInputs = leftInput.trim() !== '' || rightInput.trim() !== '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-500/30">
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
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg shadow-lg shadow-indigo-500/20">
                <GitCompare size={20} className="text-white animate-pulse" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">JSON Diff & Compare</h1>
                <p className="text-xs text-gray-500 font-medium">Semantic Structural Diff Engine</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInputs(!showInputs)}
              disabled={!hasInputs}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all disabled:opacity-40"
            >
              {showInputs ? <EyeOff size={16} /> : <Eye size={16} />}
              {showInputs ? 'Collapse Inputs' : 'Expand Inputs'}
            </button>
            
            <button
              onClick={handleClearAll}
              disabled={!hasInputs}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-40"
            >
              <Trash2 size={16} />
              Clear All
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-[1800px] mx-auto p-4 flex flex-col gap-4 min-h-[calc(100vh-64px)]">
        {/* Inputs panel */}
        {showInputs && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
            <DiffEditor
              title="Original JSON (A)"
              value={leftInput}
              onChange={setLeftInput}
              onFormat={() => formatInput(leftInput, setLeftInput, setLeftError)}
              onMinify={() => minifyInput(leftInput, setLeftInput, setLeftError)}
              onClear={() => setLeftInput('')}
              onLoadSample={() => setLeftInput(JSON.stringify(SAMPLE_LEFT, null, 2))}
              error={leftError}
              accentColor="indigo"
            />
            <DiffEditor
              title="Modified JSON (B)"
              value={rightInput}
              onChange={setRightInput}
              onFormat={() => formatInput(rightInput, setRightInput, setRightError)}
              onMinify={() => minifyInput(rightInput, setRightInput, setRightError)}
              onClear={() => setRightInput('')}
              onLoadSample={() => setRightInput(JSON.stringify(SAMPLE_RIGHT, null, 2))}
              error={rightError}
              accentColor="violet"
            />
          </div>
        )}

        {/* Toolbar Middle Bar */}
        <div className="flex justify-center items-center gap-3 py-1">
          <button
            onClick={handleSwap}
            disabled={!hasInputs}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-[#111] hover:bg-indigo-500/5 rounded-full border border-gray-200 dark:border-white/10 hover:border-indigo-500/30 shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeftRight size={14} />
            Swap Sides
          </button>
        </div>

        {/* Results Area */}
        {hasErrors ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg text-center p-6">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-full mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <h3 className="font-bold text-lg text-red-600 dark:text-red-400">Resolve Syntax Errors</h3>
            <p className="text-sm text-gray-500 max-w-md mt-1">
              One of your JSON inputs has invalid syntax. Fix the warnings in the red editor banners above or toggle <strong>Plain Text</strong> mode to run a simple text-based difference comparison.
            </p>
          </div>
        ) : !hasInputs ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg text-center p-6 text-gray-400 dark:text-gray-600">
            <GitCompare size={48} className="opacity-15 mb-3" />
            <h3 className="font-semibold text-lg">Compare JSON Data</h3>
            <p className="text-sm max-w-sm mt-1">
              Enter original and modified JSON payloads above. You can also load our interactive sample to see diff highlight and key sorting features.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <DiffSummary
              addedCount={stats.added}
              removedCount={stats.removed}
              modifiedCount={stats.modified}
              totalRows={alignedRows.length}
              viewMode={viewMode}
              setViewMode={setViewMode}
              sortKeys={sortKeys}
              setSortKeys={setSortKeys}
              ignoreWhitespace={ignoreWhitespace}
              setIgnoreWhitespace={setIgnoreWhitespace}
              isPlainTextMode={isPlainTextMode}
              setIsPlainTextMode={setIsPlainTextMode}
              activeDiffIndex={activeDiffIndex}
              totalDiffs={diffIndices.length}
              onNextDiff={handleNextDiff}
              onPrevDiff={handlePrevDiff}
            />

            <DiffViewer
              rows={alignedRows}
              viewMode={viewMode}
              activeDiffIndex={activeDiffIndex}
              onActiveDiffChange={setActiveDiffIndex}
            />
          </div>
        )}
      </main>
    </div>
  );
}
