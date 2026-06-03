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

/**
 * Tracks the structural JSON path (e.g. ["config", "shortcuts", "compare"]) for each line of a formatted JSON.
 */
export function buildLinePaths(jsonText: string): string[][] {
  const lines = jsonText.split('\n');
  const paths: string[][] = [];
  const stack: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if this line is closing an object/array
    const isClose = line.startsWith('}') || line.startsWith(']');
    if (isClose && stack.length > 0) {
      stack.pop();
    }

    // Determine key names on this line
    let currentKey: string | null = null;
    const keyMatch = line.match(/"([^"]+)"\s*:/);
    if (keyMatch) {
      currentKey = keyMatch[1];
    }

    const linePath = currentKey !== null ? [...stack, currentKey] : [...stack];
    paths.push(linePath);

    // Check if this line opens a new object/array
    const isOpen = line.endsWith('{') || line.endsWith('[') || line.endsWith('{,') || line.endsWith('[,') || line.endsWith('},') || line.endsWith('],');
    if (isOpen) {
      if (currentKey !== null) {
        stack.push(currentKey);
      } else {
        // Nested array/object opening without key
        if (i > 0) {
          stack.push(`[${stack.length}]`);
        }
      }
    }
  }

  return paths;
}

export interface DiffTreeNode {
  key: string;
  changeType: 'added' | 'removed' | 'modified' | 'none';
  rowIndex: number;
  children: Map<string, DiffTreeNode>;
}

/**
 * Recursively builds a tree representing all the modified, added, and deleted nodes in the JSON structure.
 */
export function buildDiffTree(
  rows: AlignedRow[],
  leftText: string,
  rightText: string,
  isPlainTextMode: boolean
): DiffTreeNode {
  const root: DiffTreeNode = {
    key: 'root',
    changeType: 'none',
    rowIndex: -1,
    children: new Map(),
  };

  if (isPlainTextMode) {
    // Plain text mode has no key paths, list lines that changed directly
    rows.forEach((row) => {
      const hasDiff = row.left.type !== 'unchanged' || row.right.type !== 'unchanged';
      if (hasDiff) {
        const type = row.right.type === 'added' ? 'added' : (row.left.type === 'removed' ? 'removed' : 'modified');
        const lineName = `Line ${row.left.lineNumber || row.right.lineNumber}`;
        root.children.set(lineName, {
          key: lineName,
          changeType: type,
          rowIndex: row.index,
          children: new Map(),
        });
      }
    });
    return root;
  }

  let leftFormatted = leftText;
  let rightFormatted = rightText;

  try {
    const leftParsed = JSON.parse(leftText);
    leftFormatted = JSON.stringify(leftParsed, null, 2);
  } catch {
    // use as is
  }

  try {
    const rightParsed = JSON.parse(rightText);
    rightFormatted = JSON.stringify(rightParsed, null, 2);
  } catch {
    // use as is
  }

  const leftPaths = buildLinePaths(leftFormatted);
  const rightPaths = buildLinePaths(rightFormatted);

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

    let current = root;
    for (let depth = 0; depth < path.length; depth++) {
      const segment = path[depth];
      const isLeaf = depth === path.length - 1;

      let child = current.children.get(segment);
      if (!child) {
        child = {
          key: segment,
          changeType: 'none',
          rowIndex: -1,
          children: new Map(),
        };
        current.children.set(segment, child);
      }

      if (isLeaf) {
        const type =
          row.right.type === 'added'
            ? 'added'
            : row.left.type === 'removed'
            ? 'removed'
            : 'modified';
        child.changeType = type;
        child.rowIndex = row.index;
      }

      current = child;
    }
  });

  return root;
}
