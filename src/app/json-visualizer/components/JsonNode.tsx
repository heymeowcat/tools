'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type JsonValue = string | number | boolean | null | object | any[];

interface JsonNodeProps {
  keyName?: string;
  value: JsonValue;
  depth?: number;
  isLast?: boolean;
  path?: string;
  initiallyExpanded?: boolean;
  searchTerm?: string;
}

export function JsonNode({
  keyName,
  value,
  depth = 0,
  isLast = true,
  path = '',
  initiallyExpanded = true,
  searchTerm = '',
}: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsExpanded(initiallyExpanded);
  }, [initiallyExpanded]);

  // Auto-expand if search term matches key or value
  useEffect(() => {
    if (searchTerm && matchesSearch(keyName, value, searchTerm)) {
      setIsExpanded(true);
    }
  }, [searchTerm, keyName, value]);

  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;
  const isEmpty = isExpandable && Object.keys(value).length === 0;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDataType = (val: JsonValue): string => {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    return typeof val;
  };

  const matchesSearch = (key: string | undefined, val: JsonValue, term: string): boolean => {
    if (!term) return false;
    const lowerTerm = term.toLowerCase();
    if (key && key.toLowerCase().includes(lowerTerm)) return true;
    if (typeof val === 'string' && val.toLowerCase().includes(lowerTerm)) return true;
    if (typeof val === 'number' && String(val).includes(lowerTerm)) return true;
    return false;
  };

  const isMatch = matchesSearch(keyName, value, searchTerm);
  
  // If searching, only show if this node or its children match
  // This is a simple implementation; for a "best" visualizer, we might want more complex filtering
  // But for now, highlighting is good.

  const renderValue = (val: JsonValue) => {
    if (val === null) return <span className="text-rose-600 dark:text-rose-400 font-bold">null</span>;
    if (typeof val === 'boolean') return <span className="text-purple-600 dark:text-purple-400 font-bold">{String(val)}</span>;
    if (typeof val === 'number') return <span className="text-blue-600 dark:text-blue-400">{val}</span>;
    if (typeof val === 'string') return <span className="text-emerald-600 dark:text-emerald-400">"{val}"</span>;
    return null;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500';
      case 'number': return 'bg-blue-500/10 text-blue-600 dark:text-blue-500';
      case 'boolean': return 'bg-purple-500/10 text-purple-600 dark:text-purple-500';
      case 'null': return 'bg-rose-500/10 text-rose-600 dark:text-rose-500';
      case 'object': return 'bg-orange-500/10 text-orange-600 dark:text-orange-500';
      case 'array': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-500';
    }
  };

  return (
    <div 
      className={clsx(
        "font-mono text-sm leading-6",
        isMatch && "bg-yellow-500/20 dark:bg-yellow-500/10 -mx-2 px-2 rounded"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start group">
        {/* Toggler for expandable nodes */}
        {isExpandable && !isEmpty ? (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="mr-1 mt-1 p-0.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5 mr-1" /> // Spacer
        )}

        <div className="flex-1 break-all">
          {/* Key */}
          {keyName && (
            <span className="text-gray-700 dark:text-gray-300 mr-2">
              "{keyName}":
            </span>
          )}

          {/* Value or Opening Bracket */}
          {isExpandable ? (
            <span>
              <span className="text-amber-600 dark:text-yellow-500">{isArray ? '[' : '{'}</span>
              
              {/* Collapsed Preview */}
              {!isExpanded && (
                <button 
                  onClick={() => setIsExpanded(true)}
                  className="mx-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xs italic"
                >
                  {isArray ? `Array(${value.length})` : `Object(${Object.keys(value).length})`} ...
                </button>
              )}

              {/* Empty State */}
              {isEmpty && (
                <span className="text-gray-400 dark:text-gray-500 text-xs mx-1">
                  {isArray ? 'empty' : 'empty'}
                </span>
              )}
            </span>
          ) : (
            renderValue(value)
          )}

          {/* Closing Bracket for collapsed or empty */}
          {isExpandable && (!isExpanded || isEmpty) && (
            <span>
              <span className="text-amber-600 dark:text-yellow-500">{isArray ? ']' : '}'}</span>
              {!isLast && <span className="text-gray-400 dark:text-gray-500">,</span>}
            </span>
          )}

          {/* Comma for primitives */}
          {!isExpandable && !isLast && <span className="text-gray-400 dark:text-gray-500">,</span>}

          {/* Type Badge (visible on hover) */}
          {isHovered && (
            <span className={twMerge(
              "ml-3 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity select-none",
              getTypeColor(getDataType(value))
            )}>
              {getDataType(value)}
            </span>
          )}

          {/* Copy Button (visible on hover) */}
          {isHovered && (
            <button
              onClick={handleCopy}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Copy value"
            >
              {copied ? <Check size={12} className="text-emerald-600 dark:text-emerald-500" /> : <Copy size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpandable && isExpanded && !isEmpty && (
        <div className="ml-5 border-l border-gray-200 dark:border-gray-800 pl-2">
          {isArray ? (
            (value as any[]).map((item, index) => (
              <JsonNode
                key={index}
                value={item}
                depth={depth + 1}
                isLast={index === (value as any[]).length - 1}
                path={`${path}[${index}]`}
                initiallyExpanded={initiallyExpanded}
                searchTerm={searchTerm}
              />
            ))
          ) : (
            Object.entries(value as object).map(([key, val], index, arr) => (
              <JsonNode
                key={key}
                keyName={key}
                value={val}
                depth={depth + 1}
                isLast={index === arr.length - 1}
                path={`${path}.${key}`}
                initiallyExpanded={initiallyExpanded}
                searchTerm={searchTerm}
              />
            ))
          )}
        </div>
      )}

      {/* Closing Bracket for expanded */}
      {isExpandable && isExpanded && !isEmpty && (
        <div className="ml-5">
          <span className="text-amber-600 dark:text-yellow-500">{isArray ? ']' : '}'}</span>
          {!isLast && <span className="text-gray-400 dark:text-gray-500">,</span>}
        </div>
      )}
    </div>
  );
}
