import React, { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import {
  Upload,
  FileSpreadsheet,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Trash2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface UploadHistory {
  id: string;
  fileName: string;
  reportType: 'royalties' | 'analytics';
  month: string;
  status: 'processed' | 'error' | 'pending';
  dateUploaded: string;
  fileSize: string;
  errorMessage?: string;
}

export function RoyaltyUpload() {
  const { hasPermission } = useAdmin();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<'royalties' | 'analytics'>('royalties');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Mock upload history data
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([
    {
      id: '1',
      fileName: 'royalties_jan_2026.xlsx',
      reportType: 'royalties',
      month: 'January 2026',
      status: 'processed',
      dateUploaded: '2026-02-15T10:30:00',
      fileSize: '2.4 MB',
    },
    {
      id: '2',
      fileName: 'analytics_dec_2025.csv',
      reportType: 'analytics',
      month: 'December 2025',
      status: 'processed',
      dateUploaded: '2026-01-10T14:22:00',
      fileSize: '1.8 MB',
    },
    {
      id: '3',
      fileName: 'royalties_dec_2025.xlsx',
      reportType: 'royalties',
      month: 'December 2025',
      status: 'error',
      dateUploaded: '2025-12-28T09:15:00',
      fileSize: '3.1 MB',
      errorMessage: 'Invalid data format in row 145',
    },
    {
      id: '4',
      fileName: 'analytics_nov_2025.csv',
      reportType: 'analytics',
      month: 'November 2025',
      status: 'processed',
      dateUploaded: '2025-12-05T16:45:00',
      fileSize: '2.2 MB',
    },
    {
      id: '5',
      fileName: 'royalties_oct_2025.xlsx',
      reportType: 'royalties',
      month: 'October 2025',
      status: 'pending',
      dateUploaded: '2025-11-02T11:20:00',
      fileSize: '2.9 MB',
    },
  ]);

  const canUpload = hasPermission('reports.upload');
  const canView = hasPermission('reports.view');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      if (validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        setSelectedFile(file);
      } else {
        alert('Please upload a CSV or Excel file');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedMonth || !selectedYear) {
      alert('Please select a file, month, and year');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Simulate upload
    setTimeout(() => {
      const newUpload: UploadHistory = {
        id: Date.now().toString(),
        fileName: selectedFile.name,
        reportType,
        month: `${selectedMonth} ${selectedYear}`,
        status: 'processed',
        dateUploaded: new Date().toISOString(),
        fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
      };

      setUploadHistory([newUpload, ...uploadHistory]);
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
      setSelectedMonth('');
      setSelectedYear('');
      setShowSuccessMessage(true);

      setTimeout(() => setShowSuccessMessage(false), 3000);
    }, 2000);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this upload record?')) {
      setUploadHistory(uploadHistory.filter((item) => item.id !== id));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      processed: 'bg-green-100 text-green-700',
      error: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    return styles[status as keyof typeof styles] || 'bg-white/10 text-[#A0A7B8]';
  };

  const monthOptions = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const yearOptions = Array.from({ length: 6 }, (_, index) => String(new Date().getFullYear() - index));

  if (!canView) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-[#A0A7B8]">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#0B0F1A] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Royalty Upload</h1>
          <p className="text-[#A0A7B8]">Upload CSV or Excel files for royalty and analytics reports</p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">File uploaded successfully!</p>
          </div>
        )}

        {/* Upload Section */}
        {canUpload && (
          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-white">Upload New File</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-[#A0A7B8] mb-2">
                  File Upload
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center w-full px-4 py-12 border-2 border-dashed border-[#7B61FF]/20 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-[#7B61FF]/10 transition"
                  >
                    <div className="text-center">
                      <FileSpreadsheet className="w-12 h-12 text-[#A0A7B8] mx-auto mb-3" />
                      <p className="text-sm text-[#A0A7B8] mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-[#A0A7B8]">CSV or Excel files only</p>
                    </div>
                  </label>
                </div>
                {selectedFile && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-[#A0A7B8] bg-blue-50 p-3 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-[#A0A7B8]">
                      ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Report Type */}
                <div>
                  <label className="block text-sm font-medium text-[#A0A7B8] mb-2">
                    Report Type
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as 'royalties' | 'analytics')}
                    className="w-full px-4 py-3 bg-[#0F1525] border border-[#7B61FF]/20 rounded-lg focus:ring-2 focus:ring-[#7B61FF] outline-none text-white text-white"
                    title="Report type"
                  >
                    <option value="royalties">Royalties</option>
                    <option value="analytics">Analytics</option>
                  </select>
                </div>

                {/* Report Period */}
                <div>
                  <label className="block text-sm font-medium text-[#A0A7B8] mb-2">
                    Report Period
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#A0A7B8]" />
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[#0F1525] border border-[#7B61FF]/20 rounded-lg focus:ring-2 focus:ring-[#7B61FF] outline-none text-white appearance-none text-white"
                        title="Report month"
                      >
                        <option value="">Select month</option>
                        {monthOptions.map((month) => (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </div>

                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full px-4 py-3 bg-[#0F1525] border border-[#7B61FF]/20 rounded-lg focus:ring-2 focus:ring-[#7B61FF] outline-none text-white text-white"
                      title="Report year"
                    >
                      <option value="">Select year</option>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || !selectedMonth || !selectedYear || isUploading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Upload File
                    </>
                  )}
                </button>

                {/* Progress Bar */}
                {isUploading && (
                  <progress
                    className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600"
                    max={100}
                    value={uploadProgress}
                    title="Upload progress"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload History */}
        <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20">
          <div className="p-6 border-b border-[#7B61FF]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-white">Upload History</h2>
              </div>
              <span className="text-sm text-[#A0A7B8]">{uploadHistory.length} uploads</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0B0F1A] border-b border-[#7B61FF]/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    Report Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    Date Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#A0A7B8] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7B61FF]/10">
                {uploadHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <FileSpreadsheet className="w-12 h-12 text-[#A0A7B8] mx-auto mb-3" />
                      <p className="text-[#A0A7B8]">No uploads yet</p>
                    </td>
                  </tr>
                ) : (
                  uploadHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-[#0B0F1A]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#A0A7B8]" />
                          <span className="text-sm font-medium text-white">
                            {item.fileName}
                          </span>
                        </div>
                        {item.errorMessage && (
                          <p className="text-xs text-red-600 mt-1">{item.errorMessage}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#A0A7B8] capitalize">{item.reportType}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#A0A7B8]">{item.month}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                              item.status
                            )}`}
                          >
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#A0A7B8]">
                          {new Date(item.dateUploaded).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#A0A7B8]">{item.fileSize}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 hover:bg-[#7B61FF]/10 rounded-lg transition"
                            title="Download"
                          >
                            <Download className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 hover:bg-red-900/20 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#A0A7B8] mb-1">Total Uploads</p>
                <p className="text-3xl font-bold text-white">{uploadHistory.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#A0A7B8] mb-1">Processed</p>
                <p className="text-3xl font-bold text-green-600">
                  {uploadHistory.filter((item) => item.status === 'processed').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-[#121826] rounded-xl border border-[#7B61FF]/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#A0A7B8] mb-1">Errors</p>
                <p className="text-3xl font-bold text-red-600">
                  {uploadHistory.filter((item) => item.status === 'error').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}