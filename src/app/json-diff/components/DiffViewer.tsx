import { useEffect, useRef, useState } from 'react';
import { ArrowUp, FolderTree, ChevronRight, ChevronDown } from 'lucide-react';
import { AlignedRow, CharDiffPart, DiffTreeNode, buildDiffTree } from '../utils/diffHelper';

interface DiffViewerProps {
  rows: AlignedRow[];
  viewMode: 'split' | 'unified';
  activeDiffIndex: number;
  onActiveDiffChange: (index: number) => void;
  leftText: string;
  rightText: string;
  isPlainTextMode: boolean;
}

interface TreeItemProps {
  node: DiffTreeNode;
  onSelect: (rowIndex: number) => void;
}

/**
 * Collapsible recursive tree rendering component for JSON structural diff outline.
 */
function DiffTreeItem({ node, onSelect }: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children.size > 0;

  const changeColor = {
    added: 'text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/5 px-1 py-0.5 rounded border border-emerald-500/10',
    removed: 'text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/5 px-1 py-0.5 rounded border border-rose-500/10',
    modified: 'text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/5 px-1 py-0.5 rounded border border-amber-500/10',
    none: 'text-gray-600 dark:text-gray-400 font-medium',
  }[node.changeType];

  return (
    <div className="pl-2 font-mono text-[11px] leading-5 select-none">
      <div className="flex items-center gap-1 group py-0.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded px-1 transition-colors">
        {hasChildren ? (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <span className={`${changeColor} truncate max-w-[140px]`} title={node.key}>
          {node.key}
        </span>

        {node.rowIndex !== -1 && (
          <button
            onClick={() => onSelect(node.rowIndex)}
            className="opacity-0 group-hover:opacity-100 text-[9px] px-1.5 py-0.5 rounded bg-indigo-500 text-white transition-all ml-auto hover:bg-indigo-600 cursor-pointer font-sans"
          >
            Go
          </button>
        )}
      </div>

      {hasChildren && isOpen && (
        <div className="border-l border-gray-200 dark:border-white/5 pl-2 ml-1.5 mt-0.5 flex flex-col gap-0.5">
          {Array.from(node.children.values()).map((child, idx) => (
            <DiffTreeItem key={idx} node={child} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DiffViewer({
  rows,
  viewMode,
  activeDiffIndex,
  onActiveDiffChange,
  leftText,
  rightText,
  isPlainTextMode,
}: DiffViewerProps) {
  const [showOutline, setShowOutline] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find all row indices that represent differences
  const diffRowsIndices = rows
    .filter(r => r.left.type !== 'unchanged' || r.right.type !== 'unchanged')
    .map(r => r.index);

  // Build outline tree map of differences
  const diffTreeRoot = buildDiffTree(rows, leftText, rightText, isPlainTextMode);

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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 200);
  };

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
    <div className="relative flex flex-col h-[680px] bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-xl">
      {/* Top Toolbar inside viewer */}
      <div className="flex items-center justify-between p-2.5 px-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#151515] text-xs font-semibold text-gray-500 select-none shrink-0 z-20">
        <button
          onClick={() => setShowOutline(!showOutline)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors shadow-sm cursor-pointer"
        >
          <FolderTree size={14} className="text-indigo-500" />
          {showOutline ? "Hide Outline" : "Show Outline"}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-gray-200 dark:bg-white/5 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
            {viewMode === 'split' ? 'Split Side-by-Side' : 'Unified Inline'}
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Outline Sidebar */}
        {showOutline && (
          <div className="w-64 border-r border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/10 flex flex-col h-full shrink-0 z-10">
            <div className="p-3 border-b border-gray-200 dark:border-white/10 font-semibold text-xs text-gray-500 flex justify-between items-center select-none bg-gray-50 dark:bg-white/[0.01]">
              <span>Change Outline</span>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-mono font-bold">
                {diffRowsIndices.length} changes
              </span>
            </div>
            <div className="flex-1 overflow-auto p-3 custom-scrollbar flex flex-col gap-1">
              {diffTreeRoot.children.size === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-600 p-2 italic text-center">
                  No structural differences
                </div>
              ) : (
                Array.from(diffTreeRoot.children.values()).map((child, idx) => (
                  <DiffTreeItem
                    key={idx}
                    node={child}
                    onSelect={(rowIdx) => {
                      onActiveDiffChange(diffRowsIndices.indexOf(rowIdx));
                    }}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Code Grid view */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto pr-3 custom-scrollbar select-text h-full relative"
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
                    {/* Left Column */}
                    <div className={`w-1/2 flex items-stretch leading-6 ${leftRowStyle}`}>
                      <div className="w-12 text-right text-gray-400 dark:text-gray-600 bg-gray-50/30 dark:bg-white/[0.002] pr-3 select-none border-r border-gray-100 dark:border-white/5 py-0.5 shrink-0 font-mono">
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

                    {/* Right Column */}
                    <div className={`w-1/2 flex items-stretch leading-6 ${rightRowStyle}`}>
                      <div className="w-12 text-right text-gray-400 dark:text-gray-600 bg-gray-50/30 dark:bg-white/[0.002] pr-3 select-none border-r border-gray-100 dark:border-white/5 py-0.5 shrink-0 font-mono">
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

                if (row.right.type === 'added' || row.right.type === 'modified') {
                  const isMod = row.right.type === 'modified';
                  const rowStyle = isMod ? styles.modified.rightBg : styles.added.bg;
                  const textStyle = isMod ? styles.modified.rightText : styles.added.text;
                  const signStyle = isMod ? styles.modified.rightSign : styles.added.sign;
                  const highlightClass = isMod ? styles.modified.charHighlightRight : styles.added.charHighlight;

                  subLines.push(
                    <div
                      key={`${row.index}-added`}
                      id={`diff-row-${row.index}`}
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

        {/* Overview Ruler (Minimap Ticks) */}
        <div className="absolute right-0 top-0 bottom-0 w-3 bg-gray-50 dark:bg-black/20 border-l border-gray-200 dark:border-white/5 z-20 select-none">
          {diffRowsIndices.map((rowIndex, idx) => {
            const row = rows[rowIndex];
            const topPercent = (rowIndex / rows.length) * 100;
            let colorClass = 'bg-amber-500';
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

        {/* Floating Scroll to Top button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="absolute bottom-6 right-6 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all z-30 cursor-pointer flex items-center justify-center border border-indigo-500/20"
            title="Scroll to Top"
          >
            <ArrowUp size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
