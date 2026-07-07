import { useEffect, useState } from 'react';
import { Download, RefreshCw, AlertCircle, Database } from 'lucide-react';
import { getIncomeStatementReport, syncAccountingEntries, type IncomeStatementReport } from '../../utils/admin-api';
import { exportToPDF, formatCurrency } from '../../utils/pdf-export';
import { toast } from 'sonner';

export function IncomeStatementReport() {
  const [report, setReport] = useState<IncomeStatementReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadReport();
  }, [startDate, endDate]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getIncomeStatementReport(startDate, endDate);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load income statement');
      console.error('Error loading income statement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await syncAccountingEntries();
      toast.success(`✓ ${result.message}`);
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
    exportToPDF('income-statement-table', 'Income-Statement', 'Income Statement (P&L)', {
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

  const hasData = report.totalRevenue > 0 || report.totalExpenses > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Income Statement (P&L)</h2>
          <p className="text-sm text-gray-600">
            Period: {report.period.startDate} to {report.period.endDate}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
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

      {/* Income Statement Table */}
      <div id="income-statement-table" className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700 w-2/3">Description</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* Revenue Section */}
            <tr className="bg-green-50 font-semibold">
              <td colSpan={2} className="px-6 py-3 text-green-900">
                REVENUE
              </td>
            </tr>
            {report.revenue.length > 0 ? (
              report.revenue.map((item) => (
                <tr key={item.code} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-700 pl-12">
                    <span className="font-mono text-xs text-gray-500">{item.code}</span> {item.name}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(item.amount)}</td>
                </tr>
              ))
            ) : (
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-500 pl-12">No revenue recorded</td>
                <td className="px-6 py-3 text-right">-</td>
              </tr>
            )}
            <tr className="bg-green-100 border-t-2 border-green-300 font-bold">
              <td className="px-6 py-3 text-green-900">Total Revenue</td>
              <td className="px-6 py-3 text-right text-green-900">{formatCurrency(report.totalRevenue)}</td>
            </tr>

            {/* Expenses Section */}
            <tr className="bg-red-50 font-semibold">
              <td colSpan={2} className="px-6 py-3 text-red-900">
                EXPENSES
              </td>
            </tr>
            {report.expenses.length > 0 ? (
              report.expenses.map((item) => (
                <tr key={item.code} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-700 pl-12">
                    <span className="font-mono text-xs text-gray-500">{item.code}</span> {item.name}
                  </td>
                  <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(item.amount)}</td>
                </tr>
              ))
            ) : (
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-500 pl-12">No expenses recorded</td>
                <td className="px-6 py-3 text-right">-</td>
              </tr>
            )}
            <tr className="bg-red-100 border-t-2 border-red-300 font-bold">
              <td className="px-6 py-3 text-red-900">Total Expenses</td>
              <td className="px-6 py-3 text-right text-red-900">{formatCurrency(report.totalExpenses)}</td>
            </tr>

            {/* Net Income */}
            <tr className={`text-white text-base font-bold ${
              report.netIncome >= 0 ? 'bg-green-700' : 'bg-red-700'
            }`}>
              <td className="px-6 py-4">NET INCOME</td>
              <td className="px-6 py-4 text-right">
                {report.netIncome >= 0 ? '+' : '-'}
                {formatCurrency(Math.abs(report.netIncome))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">Total Revenue</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(report.totalRevenue)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">Total Expenses</p>
          <p className="text-2xl font-bold text-red-900">{formatCurrency(report.totalExpenses)}</p>
        </div>
        <div className={`border rounded-lg p-4 ${
          report.netIncome >= 0
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-sm ${report.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            Net Income
          </p>
          <p className={`text-2xl font-bold ${report.netIncome >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            {report.netIncome >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(report.netIncome))}
          </p>
        </div>
      </div>

      {/* Profitability Metrics */}
      {hasData && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-bold text-gray-900 mb-3">Profitability Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Profit Margin</p>
              <p className="text-lg font-bold text-gray-900">
                {report.totalRevenue > 0
                  ? ((report.netIncome / report.totalRevenue) * 100).toFixed(2)
                  : '0.00'}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Expense Ratio</p>
              <p className="text-lg font-bold text-gray-900">
                {report.totalRevenue > 0
                  ? ((report.totalExpenses / report.totalRevenue) * 100).toFixed(2)
                  : '0.00'}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
