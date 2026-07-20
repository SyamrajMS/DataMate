import type { PropsWithChildren } from 'react';

export function VisualizationCard({ children }: PropsWithChildren) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {children}
    </section>
  );
}

export function EmptyState({ message = 'No data is available for this result yet.' }: { message?: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-lg text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-300">⌁</span>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Nothing to visualize</p>
      <p className="max-w-sm text-xs leading-5 text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

export function CardHeader({ title, eyebrow }: { title?: string; eyebrow: string }) {
  return (
    <header className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">{eyebrow}</p>
      {title && <h2 className="mt-1 text-base font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h2>}
    </header>
  );
}

export function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replaceAll(',', ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function humanize(key: string): string {
  return key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
