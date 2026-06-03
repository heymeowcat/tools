import { useEffect, useRef } from 'react';
import { AlignedRow, CharDiffPart } from '../utils/diffHelper';

interface DiffViewerProps {
  rows: AlignedRow[];
  viewMode: 'split' | 'unified';
  activeDiffIndex: number;
  onActiveDiffChange: (index: number) => void;
}

export function DiffViewer({
  rows,
  viewMode,
  activeDiffIndex,
  onActiveDiffChange,
}: DiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Find all row indices that represent differences
  const diffRowsIndices = rows
    .filter(r => r.left.type !== 'unchanged' || r.right.type !== 'unchanged')
    .map(r => r.index);

  // Scroll to active diff row when activeDiffIndex changes
  useEffect(() => {
    if (activeDiffIndex >= 0 && activeDiffIndex < diffRowsIndices.length) {
      const rowIndex = diffRowsIndices[activeDiffIndex];
      const element = document.getElementById(`diff-row-${rowIndex}`);
      if (element && containerRef.current) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeDiffIndex, diffRowsIndices]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl text-gray-400 dark:text-gray-600">
        <p className="text-sm">No comparison data available. Enter JSON inputs to compare.</p>
      </div>
    );
  }

  const renderCharParts = (parts: CharDiffPart[] | undefined, defaultText: string, highlightClass: string) => {
    if (!parts) return defaultText;
    return parts.map((part, idx) => (
      <span
        key={idx}
        className={part.highlight ? `${highlightClass} px-0.5 rounded font-semibold` : ''}
      >
        {part.text}
      </span>
    ));
  };

  // Helper styles
  const styles = {
    unchanged: {
      leftBg: 'hover:bg-gray-50/50 dark:hover:bg-white/[0.01]',
      rightBg: 'hover:bg-gray-50/50 dark:hover:bg-white/[0.01]',
      leftSign: 'text-gray-300 dark:text-gray-700',
      rightSign: 'text-gray-300 dark:text-gray-700',
      leftText: 'text-gray-700 dark:text-gray-400',
      rightText: 'text-gray-700 dark:text-gray-400',
    },
    added: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/20 hover:bg-emerald-500/15 dark:hover:bg-emerald-950/30',
      sign: 'text-emerald-500 dark:text-emerald-400 font-bold',
      text: 'text-emerald-900 dark:text-emerald-300 font-medium',
      charHighlight: 'bg-emerald-200 dark:bg-emerald-800/50 text-emerald-950 dark:text-emerald-200',
    },
    removed: {
      bg: 'bg-rose-500/10 dark:bg-rose-950/20 hover:bg-rose-500/15 dark:hover:bg-rose-950/30',
      sign: 'text-rose-500 dark:text-rose-400 font-bold',
      text: 'text-rose-900 dark:text-rose-300 font-medium',
      charHighlight: 'bg-rose-200 dark:bg-rose-800/50 text-rose-950 dark:text-rose-200',
    },
    modified: {
      leftBg: 'bg-red-500/10 dark:bg-red-950/20 hover:bg-red-500/15 dark:hover:bg-red-950/30',
      rightBg: 'bg-emerald-500/10 dark:bg-emerald-950/20 hover:bg-emerald-500/15 dark:hover:bg-emerald-950/30',
      leftSign: 'text-rose-500 dark:text-rose-400 font-bold',
      rightSign: 'text-emerald-500 dark:text-emerald-400 font-bold',
      leftText: 'text-rose-900 dark:text-rose-300 font-medium',
      rightText: 'text-emerald-900 dark:text-emerald-300 font-medium',
      charHighlightLeft: 'bg-red-200/80 dark:bg-red-900/60 text-red-950 dark:text-red-100',
      charHighlightRight: 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100',
    },
    empty: {
      bg: 'bg-gray-50/30 dark:bg-white/[0.005] select-none opacity-50 pattern-grid',
    }
  };

  return (
    <div className="relative flex flex-1 h-[650px] bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-xl">
      {/* Overview Ruler (Minimap) */}
      <div className="absolute right-0 top-0 bottom-0 w-3 bg-gray-50 dark:bg-black/20 border-l border-gray-200 dark:border-white/5 z-20 select-none">
        {diffRowsIndices.map((rowIndex, idx) => {
          const row = rows[rowIndex];
          const topPercent = (rowIndex / rows.length) * 100;
          let colorClass = 'bg-amber-500'; // Default modified
          if (row.left.type === 'removed' && row.right.type === 'empty') colorClass = 'bg-rose-500';
          if (row.left.type === 'empty' && row.right.type === 'added') colorClass = 'bg-emerald-500';

          const isActive = idx === activeDiffIndex;

          return (
            <button
              key={idx}
              onClick={() => onActiveDiffChange(idx)}
              className={`absolute left-0 right-0 h-1 transition-all ${colorClass} cursor-pointer ${
                isActive ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 scale-y-150 z-30 opacity-100' : 'opacity-60 hover:opacity-100 hover:scale-y-125'
              }`}
              style={{ top: `${topPercent}%` }}
              title={`Difference ${idx + 1}`}
            />
          );
        })}
      </div>

      {/* Main Diff Code Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto pr-3 custom-scrollbar select-text h-full"
      >
        {viewMode === 'split' ? (
          // SIDE BY SIDE VIEW
          <div className="min-w-[800px] flex flex-col font-mono text-xs divide-y divide-gray-100 dark:divide-white/5">
            {/* Split View Header */}
            <div className="sticky top-0 z-10 flex divide-x divide-gray-200 dark:divide-white/10 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#151515] font-bold text-xs select-none">
              <div className="w-1/2 p-2 px-4 text-gray-500">Original JSON</div>
              <div className="w-1/2 p-2 px-4 text-gray-500">Modified JSON</div>
            </div>

            {rows.map((row) => {
              const isFocusedDiff = diffRowsIndices[activeDiffIndex] === row.index;
              const hasDiff = row.left.type !== 'unchanged' || row.right.type !== 'unchanged';
              
              let leftRowStyle = styles.unchanged.leftBg;
              let rightRowStyle = styles.unchanged.rightBg;
              let leftTextStyle = styles.unchanged.leftText;
              let rightTextStyle = styles.unchanged.rightText;
              let leftSignStyle = styles.unchanged.leftSign;
              let rightSignStyle = styles.unchanged.rightSign;
              let leftSign = ' ';
              let rightSign = ' ';

              if (row.left.type === 'removed') {
                leftRowStyle = styles.removed.bg;
                leftTextStyle = styles.removed.text;
                leftSignStyle = styles.removed.sign;
                leftSign = '-';
              }
              if (row.right.type === 'added') {
                rightRowStyle = styles.added.bg;
                rightTextStyle = styles.added.text;
                rightSignStyle = styles.added.sign;
                rightSign = '+';
              }
              if (row.left.type === 'modified') {
                leftRowStyle = styles.modified.leftBg;
                leftTextStyle = styles.modified.leftText;
                leftSignStyle = styles.modified.leftSign;
                leftSign = '-';
              }
              if (row.right.type === 'modified') {
                rightRowStyle = styles.modified.rightBg;
                rightTextStyle = styles.modified.rightText;
                rightSignStyle = styles.modified.rightSign;
                rightSign = '+';
              }
              if (row.left.type === 'empty') {
                leftRowStyle = styles.empty.bg;
              }
              if (row.right.type === 'empty') {
                rightRowStyle = styles.empty.bg;
              }

              return (
                <div
                  key={row.index}
                  id={`diff-row-${row.index}`}
                  className={`flex divide-x divide-gray-100 dark:divide-white/5 transition-colors ${
                    isFocusedDiff ? 'ring-2 ring-inset ring-indigo-500/50 dark:ring-indigo-400/50 bg-indigo-500/[0.03]' : ''
                  } ${hasDiff ? 'group/row' : ''}`}
                >
                  {/* Left Column (Original) */}
                  <div className={`w-1/2 flex items-stretch leading-6 ${leftRowStyle}`}>
                    <div className="w-12 text-right text-gray-400 dark:text-gray-600 bg-gray-50/30 dark:bg-white/[0.002] pr-3 select-none border-r border-gray-100 dark:border-white/5 py-0.5 shrink-0">
                      {row.left.lineNumber}
                    </div>
                    <div className={`w-6 text-center select-none py-0.5 shrink-0 ${leftSignStyle}`}>
                      {leftSign}
                    </div>
                    <div className={`flex-1 px-2 py-0.5 whitespace-pre-wrap break-all ${leftTextStyle}`}>
                      {row.left.type === 'modified'
                        ? renderCharParts(row.left.charParts, row.left.text, styles.modified.charHighlightLeft)
                        : renderCharParts(undefined, row.left.text, '')}
                    </div>
                  </div>

                  {/* Right Column (Modified) */}
                  <div className={`w-1/2 flex items-stretch leading-6 ${rightRowStyle}`}>
                    <div className="w-12 text-right text-gray-400 dark:text-gray-600 bg-gray-50/30 dark:bg-white/[0.002] pr-3 select-none border-r border-gray-100 dark:border-white/5 py-0.5 shrink-0">
                      {row.right.lineNumber}
                    </div>
                    <div className={`w-6 text-center select-none py-0.5 shrink-0 ${rightSignStyle}`}>
                      {rightSign}
                    </div>
                    <div className={`flex-1 px-2 py-0.5 whitespace-pre-wrap break-all ${rightTextStyle}`}>
                      {row.right.type === 'modified'
                        ? renderCharParts(row.right.charParts, row.right.text, styles.modified.charHighlightRight)
                        : renderCharParts(undefined, row.right.text, '')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // UNIFIED INLINE VIEW
          <div className="flex flex-col font-mono text-xs divide-y divide-gray-100 dark:divide-white/5">
            {rows.flatMap((row) => {
              const isFocusedDiff = diffRowsIndices[activeDiffIndex] === row.index;
              const subLines = [];

              // Unchanged
              if (row.left.type === 'unchanged') {
                subLines.push(
                  <div
                    key={`${row.index}-unchanged`}
                    id={`diff-row-${row.index}`}
                    className={`flex items-stretch leading-6 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] ${
                      isFocusedDiff ? 'ring-2 ring-inset ring-indigo-500/50 dark:ring-indigo-400/50 bg-indigo-500/[0.03]' : ''
                    }`}
                  >
                    <div className="w-10 text-right text-gray-400 dark:text-gray-600 pr-2 select-none border-r border-gray-100 dark:border-white/5 py-0.5 shrink-0">
                      {row.left.lineNumber}
                    </div>
                    <div className="w-10 text-right text-gray-400 dark:text-gray-600 pr-2 select-none border-r border-gray-100 dark:border-white/5 py-0.5 shrink-0">
                      {row.right.lineNumber}
                    </div>
                    <div className="w-6 text-center select-none py-0.5 shrink-0 text-gray-300 dark:text-gray-700">
                      &nbsp;
                    </div>
                    <div className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all text-gray-700 dark:text-gray-400">
                      {row.left.text}
                    </div>
                  </div>
                );
              }

              // Removed or Modified Left
              if (row.left.type === 'removed' || row.left.type === 'modified') {
                const isMod = row.left.type === 'modified';
                const rowStyle = isMod ? styles.modified.leftBg : styles.removed.bg;
                const textStyle = isMod ? styles.modified.leftText : styles.removed.text;
                const signStyle = isMod ? styles.modified.leftSign : styles.removed.sign;
                const highlightClass = isMod ? styles.modified.charHighlightLeft : styles.removed.charHighlight;

                subLines.push(
                  <div
                    key={`${row.index}-removed`}
                    id={!isMod || row.right.type === 'empty' ? `diff-row-${row.index}` : undefined}
                    className={`flex items-stretch leading-6 ${rowStyle} ${
                      isFocusedDiff ? 'ring-2 ring-inset ring-indigo-500/50 dark:ring-indigo-400/50 bg-indigo-500/[0.03]' : ''
                    }`}
                  >
                    <div className="w-10 text-right text-gray-400 dark:text-gray-600 pr-2 select-none border-r border-gray-100 dark:border-white/5 py-0.5 shrink-0">
                      {row.left.lineNumber}
                    </div>
                    <div className="w-10 text-right text-gray-400 dark:text-gray-600 pr-2 select-none border-r border-gray-100 dark:border-white/5 py-0.5 shrink-0 bg-red-500/5 dark:bg-red-950/10">
                      &nbsp;
                    </div>
                    <div className={`w-6 text-center select-none py-0.5 shrink-0 ${signStyle}`}>
                      -
                    </div>
                    <div className={`flex-1 px-2 py-0.5 whitespace-pre-wrap break-all ${textStyle}`}>
                      {row.left.charParts
                        ? renderCharParts(row.left.charParts, row.left.text, highlightClass)
                        : renderCharParts(undefined, row.left.text, '')}
                    </div>
                  </div>
                );
              }

              // Added or Modified Right
              if (row.right.type === 'added' || row.right.type === 'modified') {
                const isMod = row.right.type === 'modified';
                const rowStyle = isMod ? styles.modified.rightBg : styles.added.bg;
                const textStyle = isMod ? styles.modified.rightText : styles.added.text;
                const signStyle = isMod ? styles.modified.rightSign : styles.added.sign;
                const highlightClass = isMod ? styles.modified.charHighlightRight : styles.added.charHighlight;

                subLines.push(
                  <div
                    key={`${row.index}-added`}
                    id={`diff-row-${row.index}`} // Place ID here so focus anchors correctly to the right side if there was a modification
                    className={`flex items-stretch leading-6 ${rowStyle} ${
                      isFocusedDiff ? 'ring-2 ring-inset ring-indigo-500/50 dark:ring-indigo-400/50 bg-indigo-500/[0.03]' : ''
                    }`}
                  >
                    <div className="w-10 text-right text-gray-400 dark:text-gray-600 pr-2 select-none border-r border-gray-100 dark:border-white/5 py-0.5 shrink-0 bg-emerald-500/5 dark:bg-emerald-950/10">
                      &nbsp;
                    </div>
                    <div className="w-10 text-right text-gray-400 dark:text-gray-600 pr-2 select-none border-r border-gray-100 dark:border-white/5 py-0.5 shrink-0">
                      {row.right.lineNumber}
                    </div>
                    <div className={`w-6 text-center select-none py-0.5 shrink-0 ${signStyle}`}>
                      +
                    </div>
                    <div className={`flex-1 px-2 py-0.5 whitespace-pre-wrap break-all ${textStyle}`}>
                      {row.right.charParts
                        ? renderCharParts(row.right.charParts, row.right.text, highlightClass)
                        : renderCharParts(undefined, row.right.text, '')}
                    </div>
                  </div>
                );
              }

              return subLines;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
