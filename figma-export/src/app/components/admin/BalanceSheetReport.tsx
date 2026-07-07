import { useEffect, useState } from 'react';
import { Download, RefreshCw, AlertCircle, Database } from 'lucide-react';
import { getBalanceSheetReport, syncAccountingEntries, type BalanceSheetReport } from '../../utils/admin-api';
import { exportToPDF, formatCurrency } from '../../utils/pdf-export';
import { toast } from 'sonner';

export function BalanceSheetReport() {
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBalanceSheetReport(selectedDate);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balance sheet');
      console.error('Error loading balance sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await syncAccountingEntries();
      toast.success(`✓ ${result.message}`);
      // Reload report after sync
      await loadReport();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sync entries';
      toast.error(`✗ ${errorMsg}`);
      setError(errorMsg);
    } finally {
      setSyncing(false);
    }
  };

  const handleExportPDF = () => {
    exportToPDF('balance-sheet-table', 'Balance-Sheet', 'Balance Sheet Report', {
      orientation: 'portrait',
      paperSize: 'a4',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <div>
          <p className="font-semibold text-red-800">Error</p>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const isBalanced = Math.abs(report.assets.totalAssets - report.totalLiabilitiesAndEquity) < 1; // Account for floating point
  const hasData = report.assets.totalAssets > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Balance Sheet</h2>
          <p className="text-sm text-gray-600">As at {report.reportDate}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition"
          >
            <Database className="w-4 h-4" />
            {syncing ? 'Syncing...' : 'Sync Real Data'}
          </button>
          <button
            onClick={loadReport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* No Data Notice */}
      {!hasData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-semibold text-blue-800">No transaction data yet</p>
            <p className="text-blue-700 text-sm">Click "Sync Real Data" to pull transaction data from Paystack, royalties, and payroll</p>
          </div>
        </div>
      )}

      {/* Balance Sheet Table */}
      <div id="balance-sheet-table" className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 w-1/2">ASSETS</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* Current Assets */}
              <tr className="bg-purple-50">
                <td colSpan={2} className="px-6 py-2 font-semibold text-purple-900">
                  Current Assets
                </td>
              </tr>
              {report.assets.current.map((item) => (
                <tr key={item.code} className="hover:bg-gray-50">
                  <td className="px-6 py-2 text-gray-700 pl-12">{item.name}</td>
                  <td className="px-6 py-2 text-right text-gray-600">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              <tr className="bg-purple-100 border-t border-purple-300">
                <td className="px-6 py-2 font-semibold text-purple-900 pl-12">Total Current Assets</td>
                <td className="px-6 py-2 text-right font-bold text-purple-900">
                  {formatCurrency(report.assets.totalCurrent)}
                </td>
              </tr>

              {/* Fixed Assets */}
              <tr className="bg-purple-50">
                <td colSpan={2} className="px-6 py-2 font-semibold text-purple-900">
                  Fixed Assets
                </td>
              </tr>
              {report.assets.fixed.map((item) => (
                <tr key={item.code} className="hover:bg-gray-50">
                  <td className="px-6 py-2 text-gray-700 pl-12">{item.name}</td>
                  <td className="px-6 py-2 text-right text-gray-600">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              <tr className="bg-purple-100 border-t border-purple-300">
                <td className="px-6 py-2 font-semibold text-purple-900 pl-12">Total Fixed Assets</td>
                <td className="px-6 py-2 text-right font-bold text-purple-900">
                  {formatCurrency(report.assets.totalFixed)}
                </td>
              </tr>

              {/* Total Assets */}
              <tr className="bg-purple-900 text-white text-base font-bold">
                <td className="px-6 py-3">TOTAL ASSETS</td>
                <td className="px-6 py-3 text-right">{formatCurrency(report.assets.totalAssets)}</td>
              </tr>
            </tbody>
          </table>

          <table className="w-full text-sm border-t-2 border-gray-300">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700 w-1/2">LIABILITIES & EQUITY</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* Current Liabilities */}
              <tr className="bg-blue-50">
                <td colSpan={2} className="px-6 py-2 font-semibold text-blue-900">
                  Current Liabilities
                </td>
              </tr>
              {report.liabilities.current.map((item) => (
                <tr key={item.code} className="hover:bg-gray-50">
                  <td className="px-6 py-2 text-gray-700 pl-12">{item.name}</td>
                  <td className="px-6 py-2 text-right text-gray-600">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              <tr className="bg-blue-100 border-t border-blue-300">
                <td className="px-6 py-2 font-semibold text-blue-900 pl-12">Total Current Liabilities</td>
                <td className="px-6 py-2 text-right font-bold text-blue-900">
                  {formatCurrency(report.liabilities.totalCurrent)}
                </td>
              </tr>

              {/* Long-term Liabilities */}
              <tr className="bg-blue-50">
                <td colSpan={2} className="px-6 py-2 font-semibold text-blue-900">
                  Long-term Liabilities
                </td>
              </tr>
              {report.liabilities.longTerm.map((item) => (
                <tr key={item.code} className="hover:bg-gray-50">
                  <td className="px-6 py-2 text-gray-700 pl-12">{item.name}</td>
                  <td className="px-6 py-2 text-right text-gray-600">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              <tr className="bg-blue-100 border-t border-blue-300">
                <td className="px-6 py-2 font-semibold text-blue-900 pl-12">Total Long-term Liabilities</td>
                <td className="px-6 py-2 text-right font-bold text-blue-900">
                  {formatCurrency(report.liabilities.totalLongTerm)}
                </td>
              </tr>

              {/* Total Liabilities */}
              <tr className="bg-blue-900 text-white font-bold">
                <td className="px-6 py-3">TOTAL LIABILITIES</td>
                <td className="px-6 py-3 text-right">{formatCurrency(report.liabilities.totalLiabilities)}</td>
              </tr>

              {/* Equity */}
              <tr className="bg-green-50">
                <td colSpan={2} className="px-6 py-2 font-semibold text-green-900">
                  Equity
                </td>
              </tr>
              {report.equity.items.map((item) => (
                <tr key={item.code} className="hover:bg-gray-50">
                  <td className="px-6 py-2 text-gray-700 pl-12">{item.name}</td>
                  <td className="px-6 py-2 text-right text-gray-600">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
              <tr className="bg-green-100 border-t border-green-300">
                <td className="px-6 py-2 font-semibold text-green-900 pl-12">Total Equity</td>
                <td className="px-6 py-2 text-right font-bold text-green-900">
                  {formatCurrency(report.equity.totalEquity)}
                </td>
              </tr>

              {/* Total Liabilities & Equity */}
              <tr className="bg-gray-900 text-white text-base font-bold">
                <td className="px-6 py-3">TOTAL LIABILITIES & EQUITY</td>
                <td className="px-6 py-3 text-right">{formatCurrency(report.totalLiabilitiesAndEquity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Check */}
      {hasData && (
        isBalanced ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            <p className="text-green-700 font-medium">✓ Balance Sheet is balanced: Assets = Liabilities + Equity</p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Balance Sheet Not Balanced</p>
              <p className="text-red-700 text-sm">
                Difference: {formatCurrency(Math.abs(report.assets.totalAssets - report.totalLiabilitiesAndEquity))}
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
