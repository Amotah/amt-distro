/**
 * PDF Export Utility
 * Exports accounting reports as PDF using html2canvas and jsPDF
 * Falls back to HTML print if libraries unavailable
 */

export async function exportToPDF(
  elementId: string,
  fileName: string,
  title: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    paperSize?: 'a4' | 'letter';
  }
): Promise<void> {
  try {
    // Try to use html2pdf if available (via CDN or npm)
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with ID "${elementId}" not found`);
      fallbackPrint(fileName);
      return;
    }

    // Check if html2pdf is available globally
    if ((window as any).html2pdf) {
      const html2pdf = (window as any).html2pdf;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { 
          orientation: options?.orientation || 'portrait', 
          unit: 'mm', 
          format: options?.paperSize || 'a4' 
        }
      };
      html2pdf().set(opt).from(element).save();
    } else {
      // Fallback to print
      console.log('html2pdf not available, using print fallback');
      fallbackPrint(fileName);
    }
  } catch (error) {
    console.error('PDF export error:', error);
    fallbackPrint(fileName);
  }
}

function fallbackPrint(fileName: string): void {
  // Open print dialog
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const printContent = document.body.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${fileName}</title>
        <style>
          body { font-family: Arial, sans-serif; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}

/**
 * Format currency for display (Nigerian Naira by default)
 */
export function formatCurrency(amount: number, currency: 'NGN' | 'USD' | 'GBP' = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number, decimals = 2): string {
  return Number(num).toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
