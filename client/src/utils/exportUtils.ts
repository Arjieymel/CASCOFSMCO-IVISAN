/**
 * Export array of JSON objects to CSV (Excel compatible)
 */
export const exportToExcel = (data: Record<string, any>[], filename: string) => {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header row
  csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] ?? '';
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Print styled HTML table document in new browser tab
 */
export const printReport = (title: string, headers: string[], rows: (string | number)[][]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const headerHtml = headers.map(h => `<th style="border: 1px solid #CBD5E1; padding: 10px; background-color: #F8FAFC; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase;">${h}</th>`).join('');
  const rowsHtml = rows.map(r => `
    <tr>
      ${r.map(cell => `<td style="border: 1px solid #E2E8F0; padding: 10px; font-size: 13px;">${cell ?? ''}</td>`).join('')}
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - CASCOFAMCO</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; color: #1E293B; }
          .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #1F6B3D; padding-bottom: 15px; }
          .header h1 { margin: 0; color: #1F6B3D; font-size: 22px; }
          .header h2 { margin: 5px 0 0 0; font-size: 16px; font-weight: 600; color: #334155; }
          .header p { margin: 3px 0 0 0; font-size: 12px; color: #64748B; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .footer { margin-top: 30px; font-size: 11px; text-align: right; color: #94A3B8; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CASCOFAMCO</h1>
          <p>Capiz Small Coconut Farmers Marketing Cooperative</p>
          <h2>${title}</h2>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
        <table>
          <thead>
            <tr>${headerHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">
          <p>CASCOFAMCO Cooperative Management Information System - Books of Accounts</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};

/**
 * Export HTML report to PDF (via print preview prompt styled for PDF download)
 */
export const exportToPDF = (title: string, headers: string[], rows: (string | number)[][]) => {
  printReport(title, headers, rows);
};
