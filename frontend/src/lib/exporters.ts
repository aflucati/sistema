export interface WindowRow {
  cd: string;
  modal: string;
  geography: string;
  commercialLocation: string;
  locality: string;
  metodoCd: string;
  prazoCd: number;
  metodoTr: string;
  prazoTr: number;
  prazoCliente: number;
  horarioInicial: string | number;
  horarioFinal: string | number;
  rotaFixa: string;
  segunda: string;
  terca: string;
  quarta: string;
  quinta: string;
  sexta: string;
  sabado: string;
  domingo: string;
}

const EXPORT_HEADERS = [
  'CD',
  'Modal',
  'Geografia',
  'Localizacao Comercial',
  'Localidade',
  'Metodo de Oferta Prazo CD',
  'Prazo CD',
  'Metodo de Oferta Prazo TR',
  'Prazo TR',
  'Prazo Cliente',
  'Horario Inicial',
  'Horario Final',
  'Rota Fixa',
  'Segunda',
  'Terca',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sabado',
  'Domingo',
] as const;

function mapRowToExportRecord(row: any): Record<string, any> {
  return {
    CD: row.cd || '-',
    Modal: row.modal || '-',
    Geografia: row.geography || '-',
    'Localizacao Comercial': row.commercialLocation || '-',
    Localidade: row.locality || '-',
    'Metodo de Oferta Prazo CD': row.metodoCd || '-',
    'Prazo CD': row.prazoCd || 0,
    'Metodo de Oferta Prazo TR': row.metodoTr || '-',
    'Prazo TR': row.prazoTr || 0,
    'Prazo Cliente': row.prazoCliente || 0,
    'Horario Inicial': row.horarioInicial || '-',
    'Horario Final': row.horarioFinal || '-',
    'Rota Fixa': row.rotaFixa || '-',
    Segunda: row.segunda || '-',
    Terca: row.terca || '-',
    Quarta: row.quarta || '-',
    Quinta: row.quinta || '-',
    Sexta: row.sexta || '-',
    Sabado: row.sabado || '-',
    Domingo: row.domingo || '-',
  };
}

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const exportToXLSX = (rows: any[], fileName: string = 'resultado_prazos.xlsx') => {
  // Gerar TSV com BOM para Excel
  const records = rows.map(mapRowToExportRecord);
  const lines: string[] = [EXPORT_HEADERS.join('\t')];
  
  records.forEach(record => {
    const values = EXPORT_HEADERS.map(h => {
      const val = String(record[h] || '');
      return val.includes('\t') || val.includes('\n') ? `"${val}"` : val;
    });
    lines.push(values.join('\t'));
  });
  
  // BOM para Excel reconhecer UTF-8
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'application/vnd.ms-excel;charset=utf-8' });
  downloadBlob(blob, fileName);
};

export const exportToCSV = (rows: any[], fileName: string = 'resultado_prazos.csv') => {
  const records = rows.map(mapRowToExportRecord);
  const lines: string[] = [];
  
  // Header
  const headerLine = EXPORT_HEADERS.map(h => `"${String(h)}"`).join(',');
  lines.push(headerLine);
  
  // Data rows
  records.forEach(record => {
    const values = EXPORT_HEADERS.map(h => {
      const val = String(record[h] || '');
      return `"${val.replace(/"/g, '""')}"`;
    });
    lines.push(values.join(','));
  });
  
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, fileName);
};

export const exportToHTML = (rows: any[], fileName: string = 'resultado_prazos.html') => {
  const records = rows.map(mapRowToExportRecord);
  
  const tableRows = records.map(row => `
    <tr>
      ${EXPORT_HEADERS.map((header) => `<td>${String(row[header] || '')}</td>`).join('')}
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Resultado de Prazos</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th { background-color: #007bff; color: white; padding: 10px; text-align: left; }
        td { border: 1px solid #ddd; padding: 8px; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <h1>Resultado de Cálculo de Prazos</h1>
      <p>Total de linhas: ${rows.length}</p>
      <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
      <table>
        <thead>
          <tr>
            ${EXPORT_HEADERS.map((h) => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, fileName);
};

export const copyToClipboard = (rows: any[]) => {
  const records = rows.map(mapRowToExportRecord);
  const lines: string[] = [EXPORT_HEADERS.join('\t')];
  
  records.forEach(record => {
    const values = EXPORT_HEADERS.map(h => record[h]);
    lines.push(values.join('\t'));
  });
  
  const text = lines.join('\n');
  
  navigator.clipboard.writeText(text).then(() => {
    alert('Dados copiados para a área de transferência!');
  }).catch(() => {
    alert('Erro ao copiar para a área de transferência');
  });
};
