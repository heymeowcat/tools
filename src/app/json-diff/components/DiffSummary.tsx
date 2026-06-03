import { ChevronUp, ChevronDown, Split, Layers, Sparkles, SlidersHorizontal } from 'lucide-react';

interface DiffSummaryProps {
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  totalRows: number;
  
  // View options
  viewMode: 'split' | 'unified';
  setViewMode: (mode: 'split' | 'unified') => void;
  sortKeys: boolean;
  setSortKeys: (val: boolean) => void;
  ignoreWhitespace: boolean;
  setIgnoreWhitespace: (val: boolean) => void;
  isPlainTextMode: boolean;
  setIsPlainTextMode: (val: boolean) => void;

  // Navigation
  activeDiffIndex: number; // 0-indexed index of currently focused difference
  totalDiffs: number; // Total number of differences
  onNextDiff: () => void;
  onPrevDiff: () => void;
}

export function DiffSummary({
  addedCount,
  removedCount,
  modifiedCount,
  totalRows,
  viewMode,
  setViewMode,
  sortKeys,
  setSortKeys,
  ignoreWhitespace,
  setIgnoreWhitespace,
  isPlainTextMode,
  setIsPlainTextMode,
  activeDiffIndex,
  totalDiffs,
  onNextDiff,
  onPrevDiff,
}: DiffSummaryProps) {
  // Similarity calculation
  const totalChanges = addedCount + removedCount + modifiedCount;
  const similarity = totalRows > 0 
    ? Math.max(0, Math.min(100, Math.round(((totalRows - totalChanges) / totalRows) * 100))) 
    : 100;

  return (
    <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-4 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 select-none animate-in fade-in duration-300">
      
      {/* Similarity & Breakdown Stats */}
      <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 flex items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <Sparkles size={14} className="absolute top-1 right-1 opacity-70 animate-pulse" />
            {similarity}%
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Match Rate</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {totalChanges === 0 ? "JSON files are identical" : `${totalChanges} line differences`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Additions */}
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>+{addedCount}</span>
            <span className="text-gray-400 dark:text-gray-500 font-normal">added</span>
          </div>

          {/* Deletions */}
          <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-1.5 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>-{removedCount}</span>
            <span className="text-gray-400 dark:text-gray-500 font-normal">deleted</span>
          </div>

          {/* Modifications */}
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>~{modifiedCount}</span>
            <span className="text-gray-400 dark:text-gray-500 font-normal">modified</span>
          </div>
        </div>
      </div>

      {/* Control Panel: Toggles & Layout Options */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
        {/* Toggle Configs */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-black/30 rounded-lg p-0.5 border border-gray-200 dark:border-white/5 text-xs">
          <button
            onClick={() => setSortKeys(!sortKeys)}
            disabled={isPlainTextMode}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
              sortKeys && !isPlainTextMode
                ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
            title="Sort object keys alphabetically recursively before diffing"
          >
            Sort Keys
          </button>
          
          <button
            onClick={() => setIgnoreWhitespace(!ignoreWhitespace)}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
              ignoreWhitespace
                ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Ignore differences in spaces and indentation"
          >
            Ignore Space
          </button>

          <button
            onClick={() => setIsPlainTextMode(!isPlainTextMode)}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
              isPlainTextMode
                ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Compare as raw plain text instead of formatting/validating JSON"
          >
            Plain Text
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex bg-gray-100 dark:bg-black/30 rounded-lg p-0.5 border border-gray-200 dark:border-white/5 text-xs">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium transition-all ${
              viewMode === 'split'
                ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Split size={14} />
            Split
          </button>
          
          <button
            onClick={() => setViewMode('unified')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium transition-all ${
              viewMode === 'unified'
                ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Layers size={14} />
            Unified
          </button>
        </div>

        {/* Diff Navigation */}
        {totalDiffs > 0 && (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-white/10">
            <span className="text-xs text-gray-500 font-mono">
              {activeDiffIndex + 1}/{totalDiffs}
            </span>
            <div className="flex gap-0.5">
              <button
                onClick={onPrevDiff}
                className="p-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-l-md transition-colors"
                title="Previous Difference"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={onNextDiff}
                className="p-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-r-md transition-colors"
                title="Next Difference"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
