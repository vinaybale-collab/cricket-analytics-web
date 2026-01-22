'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  highlight?: boolean;
}

interface DataTableProps {
  title: string;
  subtitle?: string;
  columns: Column[];
  data: any[];
  highlightFirst?: boolean;
  maxRows?: number;
  sortable?: boolean;
}

const DataTable: React.FC<DataTableProps> = ({
  title,
  subtitle,
  columns,
  data,
  highlightFirst = false,
  maxRows,
  sortable = true
}) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortKey, sortDirection]);

  const displayData = maxRows ? sortedData.slice(0, maxRows) : sortedData;

  const getAlignment = (align?: string) => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${getAlignment(col.align)} ${sortable ? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none' : ''}`}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                    {col.label}
                    {sortable && (
                      <span className="inline-flex flex-col">
                        {sortKey === col.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-4 h-4 text-purple-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-purple-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-gray-300" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {displayData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`transition-colors ${
                  highlightFirst && rowIndex === 0
                    ? 'bg-purple-50 dark:bg-purple-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-6 py-4 text-sm ${getAlignment(col.align)} ${
                      col.highlight
                        ? 'font-semibold text-purple-600 dark:text-purple-400'
                        : 'text-gray-700 dark:text-gray-300'
                    } ${highlightFirst && rowIndex === 0 ? 'font-medium' : ''}`}
                  >
                    {col.format ? col.format(row[col.key]) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {maxRows && data.length > maxRows && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
          Showing {maxRows} of {data.length} rows
        </div>
      )}
    </div>
  );
};

export default DataTable;
