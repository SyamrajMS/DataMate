import { ArrowUpDown, MoreHorizontal } from 'lucide-react';

const label = (key) => key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function TableComponent({ data }) {
  if (!data?.length) return <p className="empty-state">No rows returned for this query.</p>;
  const columns = Object.keys(data[0]);
  return (
    <div className="table-scroll">
      <table>
        <thead><tr>{columns.map((column, i) => <th key={column}>{label(column)} {i < 2 && <ArrowUpDown size={12} />}</th>)}<th aria-label="Actions" /></tr></thead>
        <tbody>{data.map((row, rowIndex) => <tr key={rowIndex}>{columns.map((column) => <td key={column} className={column === 'status' ? 'status-cell' : ''}><span>{row[column]}</span></td>)}<td><button className="icon-button table-action" aria-label="Row actions"><MoreHorizontal size={17} /></button></td></tr>)}</tbody>
      </table>
    </div>
  );
}
