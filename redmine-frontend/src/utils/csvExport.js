export function exportTasksCsv(rows, columns, filenamePrefix = 'tasks-export') {
  if (!rows || !rows.length || !columns || !columns.length) {
    console.warn('[csvExport] Nothing to export');
    return;
  }

  const headers = columns.map((col) => escapeCsvField(col.label || col.key));
  const body = rows.map((row) =>
    columns
      .map((col) => escapeCsvField(resolveValue(row, col.key)))
      .join(',')
  );

  const csv = [headers.join(','), ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const timestamp = formatTimestamp(new Date());
  const filename = `${filenamePrefix}-${timestamp}.csv`;

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvField(value) {
  const stringValue = value === null || value === undefined ? '' : String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || /\s/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function resolveValue(issue, key) {
  if (key.startsWith('cf_')) {
    const cfId = Number(key.replace('cf_', ''));
    const field = issue.custom_fields?.find((cf) => cf.id === cfId);
    return field?.value ?? '';
  }
  switch (key) {
    case 'id':
      return issue.id;
    case 'subject':
      return issue.subject;
    case 'status':
      return issue.status?.name ?? '';
    case 'assigned_to':
      return issue.assigned_to?.name ?? '';
    case 'tracker':
      return issue.tracker?.name ?? '';
    case 'priority':
      return issue.priority?.name ?? '';
    case 'author':
      return issue.author?.name ?? '';
    case 'fixed_version':
      return issue.fixed_version?.name ?? '';
    case 'start_date':
      return issue.start_date ?? '';
    case 'due_date':
      return issue.due_date ?? '';
    case 'updated_on':
      return issue.updated_on ?? '';
    default:
      return issue[key] ?? '';
  }
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}


