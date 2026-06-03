import { useEffect, useRef, useState } from 'react';
import { ArrowUp, FolderTree, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { AlignedRow, CharDiffPart, buildLinePaths } from '../utils/diffHelper';

interface DiffViewerProps {
  rows: AlignedRow[];
  viewMode: 'split' | 'unified';
  activeDiffIndex: number;
  onActiveDiffChange: (index: number) => void;
  leftText: string;
  rightText: string;
  isPlainTextMode: boolean;
}

interface OutlineItem {
  fullPath: string[];
  changeType: 'added' | 'removed' | 'modified';
  rowIndex: number;
}

interface OutlinePathItemProps {
  fullPath: string[];
  changeType: 'added' | 'removed' | 'modified';
  rowIndex: number;
  onSelect: (rowIndex: number) => void;
}

/**
 * Renders a flat, compact path for differences with ellipsis prefix collapse/expansion to prevent horizontal overflow.
 */
function OutlinePathItem({ fullPath, changeType, rowIndex, onSelect }: OutlinePathItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const dotColor = {
    added: 'bg-emerald-500',
    removed: 'bg-rose-500',
    modified: 'bg-amber-500',
  }[changeType];

  const displayPath = () => {
    if (fullPath.length <= 2 || isExpanded) {
      return fullPath.join(' ➔ ');
    }

    const lastTwo = fullPath.slice(-2);
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation(); // Stop navigation click
            setIsExpanded(true);
          }}
          className="px-1 py-0.5 rounded bg-gray-200/60 hover:bg-gray-300 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 font-bold hover:text-indigo-500 transition-colors text-[9px] cursor-pointer"
          title="Show full path"
        >
          ...
        </button>
        <span>➔ {lastTwo.join(' ➔ ')}</span>
      </span>
    );
  };

  return (
    <button
      onClick={() => onSelect(rowIndex)}
      className="w-full text-left p-1.5 px-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all flex items-center gap-2 group cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-white/5"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0 font-mono text-[11px] text-gray-600 dark:text-gray-400">
        <div className="truncate group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
          {displayPath()}
        </div>
      </div>
    </button>
  );
}

interface RowGroup {
  type: 'visible' | 'collapsed';
  rows?: AlignedRow[];
  startIdx?: number;
  endIdx?: number;
  count?: number;
  blockKey?: string;
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
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Find all row indices that represent differences
  const diffRowsIndices = rows
    .filter(r => r.left.type !== 'unchanged' || r.right.type !== 'unchanged')
    .map(r => r.index);

  // Parse path maps for left and right documents to build outline
  let leftFormatted = leftText;
  let rightFormatted = rightText;

  try {
    const leftParsed = JSON.parse(leftText);
    leftFormatted = JSON.stringify(leftParsed, null, 2);
  } catch {}

  try {
    const rightParsed = JSON.parse(rightText);
    rightFormatted = JSON.stringify(rightParsed, null, 2);
  } catch {}

  const leftPaths = buildLinePaths(leftFormatted);
  const rightPaths = buildLinePaths(rightFormatted);

  // Gather outline items representing differences
  const rawOutlineItems: OutlineItem[] = [];
  rows.forEach((row) => {
    const hasDiff = row.left.type !== 'unchanged' || row.right.type !== 'unchanged';
    if (!hasDiff) return;

    let path: string[] = [];
    if (row.right.lineNumber && row.right.lineNumber - 1 < rightPaths.length) {
      path = rightPaths[row.right.lineNumber - 1];
    } else if (row.left.lineNumber && row.left.lineNumber - 1 < leftPaths.length) {
      path = leftPaths[row.left.lineNumber - 1];
    }

    if (path.length === 0) return;

    const type =
      row.right.type === 'added'
        ? 'added'
        : row.left.type === 'removed'
        ? 'removed'
        : 'modified';

    rawOutlineItems.push({
      fullPath: path,
      changeType: type,
      rowIndex: row.index,
    });
  });

  // Deduplicate outline items by path and type
  const outlineItems: OutlineItem[] = [];
  let lastPathStr = '';
  let lastType = '';
  rawOutlineItems.forEach((item) => {
    const pathStr = item.fullPath.join('➔');
    if (pathStr !== lastPathStr || item.changeType !== lastType) {
      outlineItems.push(item);
      lastPathStr = pathStr;
      lastType = item.changeType;
    }
  });

  // Segment rows into visible and collapsed chunks for hiding unchanged sections
  const getRowGroups = (): RowGroup[] => {
    const groups: RowGroup[] = [];
    let i = 0;

    const isChanged = (r: AlignedRow) =>
      r.left.type !== 'unchanged' || r.right.type !== 'unchanged';

    while (i < rows.length) {
      if (isChanged(rows[i])) {
        const visibleBlock: AlignedRow[] = [];
        while (i < rows.length && isChanged(rows[i])) {
          visibleBlock.push(rows[i]);
          i++;
        }
        groups.push({ type: 'visible', rows: visibleBlock });
      } else {
        const startIdx = i;
        while (i < rows.length && !isChanged(rows[i])) {
          i++;
        }
        const endIdx = i;
        const count = endIdx - startIdx;

        const threshold = 10;
        const contextLines = 3;

        if (count <= threshold) {
          groups.push({ type: 'visible', rows: rows.slice(startIdx, endIdx) });
        } else {
          const blockKey = `${startIdx}-${endIdx}`;
          if (expandedKeys.has(blockKey)) {
            groups.push({ type: 'visible', rows: rows.slice(startIdx, endIdx) });
          } else {
            // Context before
            groups.push({ type: 'visible', rows: rows.slice(startIdx, startIdx + contextLines) });
            // Collapsed middle
            groups.push({
              type: 'collapsed',
              startIdx: startIdx + contextLines,
              endIdx: endIdx - contextLines,
              count: count - contextLines * 2,
              blockKey,
            });
            // Context after
            groups.push({ type: 'visible', rows: rows.slice(endIdx - contextLines, endIdx) });
          }
        }
      }
    }
    return groups;
  };

  const rowGroups = getRowGroups();

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
    },
  };

  return (
    <div className="relative flex flex-col h-[680px] bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-xl">
      {/* Top Toolbar inside viewer */}
      <div className="flex items-center justify-between p-2.5 px-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#151515] text-xs font-semibold text-gray-500 select-none shrink-0 z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOutline(!showOutline)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors shadow-sm cursor-pointer"
          >
            <FolderTree size={14} className="text-indigo-500" />
            {showOutline ? 'Hide Outline' : 'Show Outline'}
          </button>

          {expandedKeys.size > 0 && (
            <button
              onClick={() => setExpandedKeys(new Set())}
              className="text-[10px] text-gray-400 hover:text-indigo-500 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Collapse Code Blocks
            </button>
          )}
        </div>
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
                {outlineItems.length} items
              </span>
            </div>
            <div className="flex-1 overflow-auto p-2 custom-scrollbar flex flex-col gap-0.5">
              {outlineItems.length === 0 ? (
                <div className="text-xs text-gray-400 dark:text-gray-600 p-4 italic text-center">
                  No structural differences
                </div>
              ) : (
                outlineItems.map((item, idx) => (
                  <OutlinePathItem
                    key={idx}
                    fullPath={item.fullPath}
                    changeType={item.changeType}
                    rowIndex={item.rowIndex}
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

              {rowGroups.map((group, groupIdx) => {
                if (group.type === 'collapsed') {
                  return (
                    <div
                      key={`collapsed-${groupIdx}`}
                      onClick={() => {
                        const nextSet = new Set(expandedKeys);
                        if (group.blockKey) nextSet.add(group.blockKey);
                        setExpandedKeys(nextSet);
                      }}
                      className="w-full flex items-center justify-center py-3 bg-gray-100/50 dark:bg-white/[0.02] hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 text-gray-400 font-semibold cursor-pointer border-y border-gray-100 dark:border-white/5 transition-colors text-xs font-sans gap-2 select-none"
                    >
                      <span>↕</span>
                      <span>Show {group.count} unchanged lines</span>
                      <span>↕</span>
                    </div>
                  );
                }

                return group.rows?.map((row) => {
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
                        isFocusedDiff
                          ? 'ring-2 ring-inset ring-indigo-500/50 dark:ring-indigo-400/50 bg-indigo-500/[0.03]'
                          : ''
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
                            ? renderCharParts(
                                row.left.charParts,
                                row.left.text,
                                styles.modified.charHighlightLeft
                              )
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
                            ? renderCharParts(
                                row.right.charParts,
                                row.right.text,
                                styles.modified.charHighlightRight
                              )
                            : renderCharParts(undefined, row.right.text, '')}
                        </div>
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          ) : (
            // UNIFIED INLINE VIEW
            <div className="flex flex-col font-mono text-xs divide-y divide-gray-100 dark:divide-white/5">
              {rowGroups.map((group, groupIdx) => {
                if (group.type === 'collapsed') {
                  return (
                    <div
                      key={`collapsed-${groupIdx}`}
                      onClick={() => {
                        const nextSet = new Set(expandedKeys);
                        if (group.blockKey) nextSet.add(group.blockKey);
                        setExpandedKeys(nextSet);
                      }}
                      className="w-full flex items-center justify-center py-3 bg-gray-100/50 dark:bg-white/[0.02] hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 text-gray-400 font-semibold cursor-pointer border-y border-gray-100 dark:border-white/5 transition-colors text-xs font-sans gap-2 select-none"
                    >
                      <span>↕</span>
                      <span>Show {group.count} unchanged lines</span>
                      <span>↕</span>
                    </div>
                  );
                }

                return group.rows?.flatMap((row) => {
                  const isFocusedDiff = diffRowsIndices[activeDiffIndex] === row.index;
                  const subLines = [];

                  if (row.left.type === 'unchanged') {
                    subLines.push(
                      <div
                        key={`${row.index}-unchanged`}
                        id={`diff-row-${row.index}`}
                        className={`flex items-stretch leading-6 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] ${
                          isFocusedDiff
                            ? 'ring-2 ring-inset ring-indigo-500/50 dark:ring-indigo-400/50 bg-indigo-500/[0.03]'
                            : ''
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
                    const highlightClass = isMod
                      ? styles.modified.charHighlightLeft
                      : styles.removed.charHighlight;

                    subLines.push(
                      <div
                        key={`${row.index}-removed`}
                        id={!isMod || row.right.type === 'empty' ? `diff-row-${row.index}` : undefined}
                        className={`flex items-stretch leading-6 ${rowStyle} ${
                          isFocusedDiff
                            ? 'ring-2 ring-inset ring-indigo-500/50 dark:ring-indigo-400/50 bg-indigo-500/[0.03]'
                            : ''
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
                    const highlightClass = isMod
                      ? styles.modified.charHighlightRight
                      : styles.added.charHighlight;

                    subLines.push(
                      <div
                        key={`${row.index}-added`}
                        id={`diff-row-${row.index}`}
                        className={`flex items-stretch leading-6 ${rowStyle} ${
                          isFocusedDiff
                            ? 'ring-2 ring-inset ring-indigo-500/50 dark:ring-indigo-400/50 bg-indigo-500/[0.03]'
                            : ''
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
                });
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
                  isActive
                    ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 scale-y-150 z-30 opacity-100'
                    : 'opacity-60 hover:opacity-100 hover:scale-y-125'
                }`}
                style={{ top: `${topPercent}%` }}
                title={`Difference ${idx + 1}`}
              />
            );
          })}
        </div>

        {/* Floating Navigation Control (Prev, Next, Go to Top) */}
        <div className="absolute bottom-6 right-6 flex items-center bg-white/95 dark:bg-[#151515]/95 backdrop-blur border border-gray-200 dark:border-white/10 rounded-full shadow-2xl p-1 z-30 gap-0.5">
          <button
            onClick={() => {
              if (diffRowsIndices.length === 0) return;
              onActiveDiffChange(
                (activeDiffIndex - 1 + diffRowsIndices.length) % diffRowsIndices.length
              );
            }}
            className="p-2.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            title="Previous Difference"
          >
            <ChevronUp size={15} />
          </button>

          <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />

          <button
            onClick={() => {
              if (diffRowsIndices.length === 0) return;
              onActiveDiffChange((activeDiffIndex + 1) % diffRowsIndices.length);
            }}
            className="p-2.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            title="Next Difference"
          >
            <ChevronDown size={15} />
          </button>

          {showScrollTop && (
            <>
              <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />
              <button
                onClick={scrollToTop}
                className="p-2.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                title="Scroll to Top"
              >
                <ArrowUp size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
