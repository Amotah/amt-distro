import { useEffect, useState } from 'react';
import { Download, RefreshCw, AlertCircle, Database } from 'lucide-react';
import { getTrialBalanceReport, syncAccountingEntries, type TrialBalanceReport } from '../../utils/admin-api';
import { exportToPDF, formatCurrency, formatNumber } from '../../utils/pdf-export';
import { toast } from 'sonner';

export function TrialBalanceReport() {
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrialBalanceReport();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trial balance');
      console.error('Error loading trial balance:', err);
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
    exportToPDF('trial-balance-table', 'Trial-Balance', 'Trial Balance Report', {
      orientation: 'landscape',
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

  const hasData = report.accounts.some(a => a.debit > 0 || a.credit > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Trial Balance Report</h2>
          <p className="text-sm text-gray-600">As at {report.reportDate}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
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
            disabled={loading}
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

      {/* Table */}
      <div id="trial-balance-table" className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Account Code</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Account Name</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Category</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Debit</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Credit</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {report.accounts.map((account) => (
              <tr key={account.code} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-mono text-gray-600">{account.code}</td>
                <td className="px-6 py-3 text-gray-700">{account.name}</td>
                <td className="px-6 py-3">
                  <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 capitalize">
                    {account.category}
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-gray-600">
                  {account.debit > 0 ? formatCurrency(account.debit) : '-'}
                </td>
                <td className="px-6 py-3 text-right text-gray-600">
                  {account.credit > 0 ? formatCurrency(account.credit) : '-'}
                </td>
                <td className={`px-6 py-3 text-right font-medium ${
                  account.balance > 0 ? 'text-green-600' : account.balance < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {formatCurrency(Math.abs(account.balance))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-300 font-bold">
            <tr>
              <td colSpan={3} className="px-6 py-3">
                TOTALS
              </td>
              <td className="px-6 py-3 text-right text-gray-900">
                {formatCurrency(report.totalDebits)}
              </td>
              <td className="px-6 py-3 text-right text-gray-900">
                {formatCurrency(report.totalCredits)}
              </td>
              <td className="px-6 py-3 text-right text-gray-900">
                {formatCurrency(Math.abs(report.totalBalance))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Debits</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(report.totalDebits)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Credits</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(report.totalCredits)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Difference (Should be 0)</p>
          <p className={`text-2xl font-bold ${report.totalBalance === 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(report.totalBalance))}
          </p>
        </div>
      </div>

      {/* Note */}
      {report.totalDebits !== report.totalCredits && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800">Trial Balance Alert</p>
            <p className="text-yellow-700 text-sm">
              Total debits do not equal total credits. This may indicate posting errors.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
