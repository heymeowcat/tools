import { diffLines, diffChars } from 'diff';

export interface AlignedCell {
  lineNumber?: number;
  text: string;
  type: 'empty' | 'unchanged' | 'added' | 'removed' | 'modified';
  charParts?: CharDiffPart[];
}

export interface AlignedRow {
  left: AlignedCell;
  right: AlignedCell;
  index: number; // Row index for tracking and mapping
}

export interface CharDiffPart {
  text: string;
  highlight: boolean;
}

export interface ParseResult {
  data: any;
  error: string | null;
  lineCount: number;
}

/**
 * Validates and parses JSON.
 * Returns the parsed object or an error message.
 */
export function parseJSON(text: string): ParseResult {
  const lineCount = text.split('\n').length;
  if (!text.trim()) {
    return { data: null, error: null, lineCount };
  }
  try {
    const data = JSON.parse(text);
    return { data, error: null, lineCount };
  } catch (err) {
    return { data: null, error: (err as Error).message, lineCount };
  }
}

/**
 * Recursively sorts keys of an object alphabetically.
 */
export function sortObjectKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((result: any, key) => {
        result[key] = sortObjectKeys(obj[key]);
        return result;
      }, {});
  }
  return obj;
}

/**
 * Helper to split a diff block into lines, handling trailing newlines.
 */
function getLines(value: string): string[] {
  const lines = value.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

/**
 * Computes character-level differences between two strings.
 */
export function computeCharDiff(left: string, right: string): { leftParts: CharDiffPart[], rightParts: CharDiffPart[] } {
  const diffs = diffChars(left, right);
  const leftParts: CharDiffPart[] = [];
  const rightParts: CharDiffPart[] = [];

  for (const part of diffs) {
    if (part.removed) {
      leftParts.push({ text: part.value, highlight: true });
    } else if (part.added) {
      rightParts.push({ text: part.value, highlight: true });
    } else {
      leftParts.push({ text: part.value, highlight: false });
      rightParts.push({ text: part.value, highlight: false });
    }
  }

  return { leftParts, rightParts };
}

interface DiffHelperOptions {
  sortKeys: boolean;
  ignoreWhitespace: boolean;
  isPlainTextMode: boolean;
}

/**
 * Performs a line-by-line diff between two text blocks and aligns them side-by-side.
 */
export function computeAlignedDiff(
  leftText: string,
  rightText: string,
  options: DiffHelperOptions
): { rows: AlignedRow[]; addedCount: number; removedCount: number; modifiedCount: number } {
  let leftFormatted = leftText;
  let rightFormatted = rightText;

  // Format and sort JSON if not in plain text mode and it parses correctly
  if (!options.isPlainTextMode) {
    try {
      const leftParsed = JSON.parse(leftText);
      const leftData = options.sortKeys ? sortObjectKeys(leftParsed) : leftParsed;
      leftFormatted = JSON.stringify(leftData, null, 2);
    } catch {
      // Fallback to original text if JSON is invalid
    }

    try {
      const rightParsed = JSON.parse(rightText);
      const rightData = options.sortKeys ? sortObjectKeys(rightParsed) : rightParsed;
      rightFormatted = JSON.stringify(rightData, null, 2);
    } catch {
      // Fallback to original text if JSON is invalid
    }
  }

  const changes = diffLines(leftFormatted, rightFormatted, {
    ignoreWhitespace: options.ignoreWhitespace,
  });

  const rows: AlignedRow[] = [];
  let leftLineNum = 1;
  let rightLineNum = 1;
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  let rowIndex = 0;

  let i = 0;
  while (i < changes.length) {
    const current = changes[i];

    if (!current.added && !current.removed) {
      // Unchanged lines
      const lines = getLines(current.value);
      for (const line of lines) {
        rows.push({
          index: rowIndex++,
          left: { lineNumber: leftLineNum++, text: line, type: 'unchanged' },
          right: { lineNumber: rightLineNum++, text: line, type: 'unchanged' },
        });
      }
      i++;
    } else if (current.removed && i + 1 < changes.length && changes[i + 1].added) {
      // Modification (Removed followed by Added)
      const next = changes[i + 1];
      const leftLines = getLines(current.value);
      const rightLines = getLines(next.value);

      const minLen = Math.min(leftLines.length, rightLines.length);
      for (let j = 0; j < minLen; j++) {
        // Run inline character level diff for modifications
        const { leftParts, rightParts } = computeCharDiff(leftLines[j], rightLines[j]);
        rows.push({
          index: rowIndex++,
          left: { lineNumber: leftLineNum++, text: leftLines[j], type: 'modified', charParts: leftParts },
          right: { lineNumber: rightLineNum++, text: rightLines[j], type: 'modified', charParts: rightParts },
        });
        modifiedCount++;
      }

      if (leftLines.length > minLen) {
        for (let j = minLen; j < leftLines.length; j++) {
          rows.push({
            index: rowIndex++,
            left: { lineNumber: leftLineNum++, text: leftLines[j], type: 'removed' },
            right: { text: '', type: 'empty' },
          });
          removedCount++;
        }
      } else if (rightLines.length > minLen) {
        for (let j = minLen; j < rightLines.length; j++) {
          rows.push({
            index: rowIndex++,
            left: { text: '', type: 'empty' },
            right: { lineNumber: rightLineNum++, text: rightLines[j], type: 'added' },
          });
          addedCount++;
        }
      }
      i += 2;
    } else if (current.added && i + 1 < changes.length && changes[i + 1].removed) {
      // Modification (Added followed by Removed - rare edge case)
      const next = changes[i + 1];
      const leftLines = getLines(next.value);
      const rightLines = getLines(current.value);

      const minLen = Math.min(leftLines.length, rightLines.length);
      for (let j = 0; j < minLen; j++) {
        const { leftParts, rightParts } = computeCharDiff(leftLines[j], rightLines[j]);
        rows.push({
          index: rowIndex++,
          left: { lineNumber: leftLineNum++, text: leftLines[j], type: 'modified', charParts: leftParts },
          right: { lineNumber: rightLineNum++, text: rightLines[j], type: 'modified', charParts: rightParts },
        });
        modifiedCount++;
      }

      if (leftLines.length > minLen) {
        for (let j = minLen; j < leftLines.length; j++) {
          rows.push({
            index: rowIndex++,
            left: { lineNumber: leftLineNum++, text: leftLines[j], type: 'removed' },
            right: { text: '', type: 'empty' },
          });
          removedCount++;
        }
      } else if (rightLines.length > minLen) {
        for (let j = minLen; j < rightLines.length; j++) {
          rows.push({
            index: rowIndex++,
            left: { text: '', type: 'empty' },
            right: { lineNumber: rightLineNum++, text: rightLines[j], type: 'added' },
          });
          addedCount++;
        }
      }
      i += 2;
    } else if (current.removed) {
      // Standalone Removed
      const lines = getLines(current.value);
      for (const line of lines) {
        rows.push({
          index: rowIndex++,
          left: { lineNumber: leftLineNum++, text: line, type: 'removed' },
          right: { text: '', type: 'empty' },
        });
        removedCount++;
      }
      i++;
    } else {
      // Standalone Added
      const lines = getLines(current.value);
      for (const line of lines) {
        rows.push({
          index: rowIndex++,
          left: { text: '', type: 'empty' },
          right: { lineNumber: rightLineNum++, text: line, type: 'added' },
        });
        addedCount++;
      }
      i++;
    }
  }

  return { rows, addedCount, removedCount, modifiedCount };
}
