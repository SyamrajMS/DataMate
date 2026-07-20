import { useMemo, useState } from 'react';
import { CardHeader, displayValue, EmptyState, humanize, VisualizationCard } from './shared';
import type { DataRow, VisualizationProps } from './types';

type SortDirection = 'ascending' | 'descending';

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return displayValue(left).localeCompare(displayValue(right), undefined, { numeric: true, sensitivity: 'base' });
}

/** A responsive SQL-result table with dynamic columns and client-side sorting. */
export default function RelationalTable({ payload }: VisualizationProps) {
  const { data, config } = payload;
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null);
  const columns = useMemo(() => (data?.[0] ? Object.keys(data[0]) : []), [data]);
  const sortedRows = useMemo(() => {
    if (!sort) return data ?? [];
    return [...data].sort((left: DataRow, right: DataRow) => {
      const result = compareValues(left[sort.key], right[sort.key]);
      return sort.direction === 'ascending' ? result : -result;
    });
  }, [data, sort]);

  const toggleSort = (key: string) => {
    setSort((current) => current?.key === key && current.direction === 'ascending'
      ? { key, direction: 'descending' }
      : { key, direction: 'ascending' });
  };

  if (!data?.length) return <VisualizationCard><EmptyState /></VisualizationCard>;

  return (
    <VisualizationCard>
      <CardHeader eyebrow="Raw query result" title={config.title} />
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
          <thead className="bg-gray-50/80 dark:bg-gray-800/50">
            <tr>
              {columns.map((column) => {
                const isSorted = sort?.key === column;
                return (
                  <th key={column} scope="col" className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <button type="button" onClick={() => toggleSort(column)} className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-300">
                      {humanize(column)} <span aria-hidden="true" className={isSorted ? 'text-indigo-500' : 'text-gray-300'}>{isSorted && sort?.direction === 'ascending' ? '↑' : '↕'}</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
            {sortedRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="even:bg-gray-50/70 hover:bg-indigo-50/70 dark:even:bg-gray-800/40 dark:hover:bg-indigo-500/10">
                {columns.map((column) => <td key={column} className="whitespace-nowrap px-5 py-3.5 text-gray-700 dark:text-gray-200">{displayValue(row[column])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </VisualizationCard>
  );
}
