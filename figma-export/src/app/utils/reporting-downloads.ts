import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const BRAND_NAME = 'AMTDISTRO';

export type ReportWorkbookSheet = {
  name: string;
  rows: Array<Array<string | number>>;
};

export type ReportPdfSection = {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
};

export type ReportPdfChart = {
  title: string;
  type: 'bar' | 'line';
  color?: string;
  data: Array<{
    label: string;
    value: number;
  }>;
};

function sanitizeSheetName(name: string) {
  const cleaned = name.replace(/[\\/?*\[\]:]/g, ' ').trim();
  return cleaned.slice(0, 31) || 'Sheet1';
}

function drawPdfImprint(pdf: jsPDF) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(72);
  pdf.setTextColor(242, 242, 242);
  pdf.text(BRAND_NAME, 298, 430, { align: 'center', angle: 24 });
}

export function downloadReportWorkbook(fileName: string, sheets: ReportWorkbookSheet[]) {
  const workbook = XLSX.utils.book_new();
  const generatedAt = new Date().toLocaleString();

  sheets.forEach((sheet) => {
    const maxDataColumns = sheet.rows.reduce((max, row) => Math.max(max, row.length), 1);
    const imprintColumns = Math.max(maxDataColumns, 8);
    const imprintLine = Array.from({ length: imprintColumns }, () => BRAND_NAME);
    const brandedRows: Array<Array<string | number>> = [
      [BRAND_NAME],
      imprintLine,
      [`Generated: ${generatedAt}`],
      [],
      ...sheet.rows,
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(brandedRows);
    worksheet['!merges'] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: imprintColumns - 1 },
      },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheet.name));
  });

  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}

export function downloadReportPdf(options: {
  fileName: string;
  title: string;
  subtitle?: string;
  summary?: Array<[string, string]>;
  charts?: ReportPdfChart[];
  sections: ReportPdfSection[];
}) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 40;
  const right = 555;
  let top = 44;
  drawPdfImprint(pdf);

  const drawChartBlock = (chart: ReportPdfChart) => {
    const chartLeft = left;
    const chartTop = top;
    const chartWidth = right - left;
    const chartHeight = 180;
    const plotLeft = chartLeft + 36;
    const plotRight = chartLeft + chartWidth - 16;
    const plotBottom = chartTop + chartHeight - 28;
    const plotTop = chartTop + 24;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;
    const maxValue = Math.max(...chart.data.map((item) => item.value), 1);
    const color = chart.color || '#FF6B00';

    ensureSpace(chartHeight + 28);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(20, 20, 20);
    pdf.text(chart.title, chartLeft, top);
    top += 12;

    pdf.setDrawColor(230, 230, 230);
    pdf.rect(chartLeft, top, chartWidth, chartHeight);
    pdf.line(plotLeft, plotTop, plotLeft, plotBottom);
    pdf.line(plotLeft, plotBottom, plotRight, plotBottom);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    if (chart.type === 'bar') {
      const barWidth = chart.data.length > 0 ? Math.min(34, (plotWidth / chart.data.length) * 0.6) : 20;
      chart.data.forEach((item, index) => {
        const x = plotLeft + (plotWidth / Math.max(chart.data.length, 1)) * index + 8;
        const height = maxValue > 0 ? (item.value / maxValue) * (plotHeight - 12) : 0;
        const y = plotBottom - height;
        const rgb = hexToRgb(color);
        pdf.setFillColor(rgb.r, rgb.g, rgb.b);
        pdf.rect(x, y, barWidth, height, 'F');
        pdf.setTextColor(90, 90, 90);
        pdf.text(item.label.slice(0, 12), x, plotBottom + 12);
      });
    } else {
      const points = chart.data.map((item, index) => ({
        x: plotLeft + (plotWidth / Math.max(chart.data.length - 1, 1)) * index,
        y: plotBottom - (maxValue > 0 ? (item.value / maxValue) * (plotHeight - 12) : 0),
        label: item.label,
      }));
      const rgb = hexToRgb(color);
      pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
      pdf.setLineWidth(2);
      points.forEach((point, index) => {
        if (index > 0) {
          const previous = points[index - 1];
          pdf.line(previous.x, previous.y, point.x, point.y);
        }
        pdf.setFillColor(rgb.r, rgb.g, rgb.b);
        pdf.circle(point.x, point.y, 2.5, 'F');
        pdf.setTextColor(90, 90, 90);
        pdf.text(point.label.slice(0, 10), point.x - 8, plotBottom + 12);
      });
    }

    top += chartHeight + 22;
  };

  const ensureSpace = (requiredHeight: number) => {
    if (top + requiredHeight <= 790) {
      return;
    }

    pdf.addPage();
    drawPdfImprint(pdf);
    top = 44;
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(255, 107, 0);
  pdf.text(BRAND_NAME, left, top);
  top += 14;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(20, 20, 20);
  pdf.text(options.title, left, top);
  top += 18;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated ${new Date().toLocaleString()}`, left, top);
  top += 14;

  if (options.subtitle) {
    const subtitleLines = pdf.splitTextToSize(options.subtitle, right - left);
    pdf.text(subtitleLines, left, top);
    top += subtitleLines.length * 12;
  }

  if (options.summary && options.summary.length > 0) {
    top += 12;
    pdf.setTextColor(20, 20, 20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', left, top);
    top += 16;

    options.summary.forEach(([label, value]) => {
      ensureSpace(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${label}:`, left, top);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, left + 130, top);
      top += 16;
    });
  }

  if (options.charts && options.charts.length > 0) {
    top += 16;
    options.charts.forEach((chart) => drawChartBlock(chart));
  }

  options.sections.forEach((section) => {
    top += 14;
    ensureSpace(44);
    pdf.setTextColor(20, 20, 20);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(section.title, left, top);
    top += 16;

    pdf.setFontSize(9);
    const usableWidth = right - left;
    const columnWidth = usableWidth / Math.max(section.columns.length, 1);
    section.columns.forEach((column, index) => {
      pdf.text(column, left + index * columnWidth, top);
    });
    top += 8;
    pdf.line(left, top, right, top);
    top += 14;

    section.rows.forEach((row) => {
      ensureSpace(24);
      row.forEach((value, index) => {
        const cell = String(value ?? '');
        const lines = pdf.splitTextToSize(cell, columnWidth - 6);
        pdf.setFont('helvetica', 'normal');
        pdf.text(lines.slice(0, 2), left + index * columnWidth, top);
      });
      top += 20;
    });
  });

  pdf.save(options.fileName.endsWith('.pdf') ? options.fileName : `${options.fileName}.pdf`);
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const safe = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized.padEnd(6, '0').slice(0, 6);

  return {
    r: Number.parseInt(safe.slice(0, 2), 16),
    g: Number.parseInt(safe.slice(2, 4), 16),
    b: Number.parseInt(safe.slice(4, 6), 16),
  };
}