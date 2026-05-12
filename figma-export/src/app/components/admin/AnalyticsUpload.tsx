import { useEffect, useMemo, useState } from 'react';
import { Upload, FileSpreadsheet, Calendar, CheckCircle, XCircle, AlertCircle, LoaderCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { getAnalyticsUploadReports, type AdminAnalyticsUploadReport, uploadAnalyticsReport } from '../../utils/admin-api';
import { parseAnalyticsUploadFile } from '../../utils/analytics-import';

export default function AnalyticsUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<AdminAnalyticsUploadReport[]>([]);

  const reportTypes = [
    'Spotify Analytics',
    'Apple Music Analytics',
    'YouTube Music Analytics',
    'Deezer Analytics',
    'Amazon Music Analytics',
    'Tidal Analytics',
    'All Platforms Combined'
  ];

  const monthOptions = [
    { label: 'January', value: '01' },
    { label: 'February', value: '02' },
    { label: 'March', value: '03' },
    { label: 'April', value: '04' },
    { label: 'May', value: '05' },
    { label: 'June', value: '06' },
    { label: 'July', value: '07' },
    { label: 'August', value: '08' },
    { label: 'September', value: '09' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
  ];

  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const year = new Date().getFullYear() - index;
    return { label: String(year), value: String(year) };
  });

  const buildReportPeriodLabel = (monthValue: string, yearValue: string) => {
    const monthLabel = monthOptions.find((month) => month.value === monthValue)?.label;
    return monthLabel && yearValue ? `${monthLabel} ${yearValue}` : '';
  };

  const selectedPlatformLabel = useMemo(() => reportType.replace(/ analytics$/i, '').trim(), [reportType]);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        const reports = await getAnalyticsUploadReports();
        if (active) {
          setUploadHistory(reports);
        }
      } catch (error) {
        if (active) {
          setUploadStatus('error');
          setUploadMessage(error instanceof Error ? error.message : 'Failed to load analytics upload history.');
        }
      } finally {
        if (active) {
          setLoadingHistory(false);
        }
      }
    };

    void loadHistory();

    return () => {
      active = false;
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setUploadStatus('idle');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setUploadStatus('idle');
      }
    }
  };

  const validateFile = (file: File): boolean => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      setUploadStatus('error');
      setUploadMessage('Invalid file type. Please upload CSV or Excel files only.');
      return false;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setUploadStatus('error');
      setUploadMessage('File size exceeds 50MB limit.');
      return false;
    }

    return true;
  };

  const handleUpload = async () => {
    if (!selectedFile || !reportType || !selectedMonth || !selectedYear) {
      setUploadStatus('error');
      setUploadMessage('Please fill in all required fields.');
      return;
    }

    setUploading(true);
    setUploadStatus('idle');

    try {
      const rows = await parseAnalyticsUploadFile(selectedFile, selectedPlatformLabel || 'Unknown');
      if (rows.length === 0) {
        throw new Error('No analytics rows could be parsed from this file. Check the file columns and data rows.');
      }

      const uploadedReport = await uploadAnalyticsReport({
        fileName: selectedFile.name,
        reportType,
        platform: selectedPlatformLabel || undefined,
        reportMonth: selectedMonth,
        reportYear: selectedYear,
        rows,
      });

      setUploadHistory((currentHistory) => [uploadedReport, ...currentHistory]);
      setUploadStatus('success');
      setUploadMessage(`Uploaded ${selectedFile.name}. Processed ${uploadedReport.recordsProcessed.toLocaleString()} rows and matched ${uploadedReport.matchedRecords.toLocaleString()} of them to existing tracks.`);
      
      setSelectedFile(null);
      setReportType('');
      setSelectedMonth('');
      setSelectedYear('');
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics Upload</h1>
        <p className="text-gray-400 mt-2">Upload analytics reports from streaming platforms</p>
      </div>

      {/* Upload Form */}
      <Card className="border-[#333] bg-[#0A0A0A]">
        <CardHeader>
          <CardTitle className="text-white">Upload Analytics Report</CardTitle>
          <CardDescription className="text-gray-400">
            Upload CSV or Excel files containing analytics data from streaming platforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Area */}
          <div className="space-y-2">
            <Label className="text-white">Analytics File *</Label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-[#FF6B00] bg-[#FF6B00]/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
              />
              
              {selectedFile ? (
                <div className="space-y-3">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-[#FF6B00]" />
                  <div>
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="text-gray-400 text-sm">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="border-[#333] text-white hover:bg-[#1a1a1a]"
                  >
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <div>
                    <p className="text-white font-medium">Drop your file here or click to browse</p>
                    <p className="text-gray-400 text-sm mt-1">Supports CSV, XLS, XLSX (Max 50MB)</p>
                  </div>
                  <label htmlFor="file-upload">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="border-[#333] text-white hover:bg-[#1a1a1a]"
                    >
                      Choose File
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Report Type */}
          <div className="space-y-2">
            <Label className="text-white">Report Type *</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger 
                className="bg-[#0A0A0A] border-[#333] text-white hover:bg-[#1a1a1a]"
              >
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#333]">
                {reportTypes.map((type) => (
                  <SelectItem 
                    key={type} 
                    value={type} 
                    className="text-white hover:bg-[#FF6B00]/20 focus:bg-[#FF6B00]/20 focus:text-white cursor-pointer"
                  >
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Report Period */}
          <div className="space-y-2">
            <Label className="text-white flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Report Period *
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger 
                  className="bg-[#0A0A0A] border-[#333] text-white hover:bg-[#1a1a1a]"
                >
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#333]">
                  {monthOptions.map((month) => (
                    <SelectItem 
                      key={month.value} 
                      value={month.value} 
                      className="text-white hover:bg-[#FF6B00]/20 focus:bg-[#FF6B00]/20 focus:text-white cursor-pointer"
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger 
                  className="bg-[#0A0A0A] border-[#333] text-white hover:bg-[#1a1a1a]"
                >
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#333]">
                  {yearOptions.map((year) => (
                    <SelectItem 
                      key={year.value} 
                      value={year.value} 
                      className="text-white hover:bg-[#FF6B00]/20 focus:bg-[#FF6B00]/20 focus:text-white cursor-pointer"
                    >
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Upload Status Alert */}
          {uploadStatus !== 'idle' && (
            <Alert className={uploadStatus === 'success' ? 'border-[#1DB954] bg-[#1DB954]/10' : 'border-red-500 bg-red-500/10'}>
              <AlertDescription className={uploadStatus === 'success' ? 'text-[#1DB954]' : 'text-red-500'}>
                {uploadMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !reportType || !selectedMonth || !selectedYear || uploading}
            className="w-full bg-[#FF6B00] text-white hover:bg-[#e66000]"
          >
            {uploading ? (
              <>
                <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Analytics Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Upload History */}
      <Card className="border-[#333] bg-[#0A0A0A]">
        <CardHeader>
          <CardTitle className="text-white">Upload History</CardTitle>
          <CardDescription className="text-gray-400">
            Recent analytics report uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center gap-3 py-8 text-gray-400">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              <span>Loading analytics uploads...</span>
            </div>
          ) : uploadHistory.length === 0 ? (
            <div className="text-center py-8">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No uploads yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploadHistory.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between rounded-lg border border-[#333] bg-[#1a1a1a] p-4"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(upload.status)}
                    <div>
                      <p className="text-white font-medium">{upload.fileName}</p>
                      <p className="text-gray-400 text-sm">
                        {upload.reportType} • {buildReportPeriodLabel(upload.reportMonth, upload.reportYear) || upload.reportPeriodLabel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-300 text-sm">{new Date(upload.uploadedAt).toLocaleDateString()}</p>
                    <p className="text-[#1DB954] text-sm">{upload.recordsProcessed.toLocaleString()} rows</p>
                    <p className="text-gray-400 text-xs">Matched {upload.matchedRecords.toLocaleString()} • Unmatched {upload.unmatchedRecords.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="border-[#333] bg-[#0A0A0A]">
        <CardHeader>
          <CardTitle className="text-white">File Format Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-gray-300 text-sm">
            <p><strong className="text-white">Supported Formats:</strong> CSV, XLS, XLSX</p>
            <p><strong className="text-white">Maximum File Size:</strong> 50MB</p>
            <p><strong className="text-white">Required Columns:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-gray-400">
              <li>Track ISRC or Track ID</li>
              <li>Track UPC </li>
              <li>Streams or Plays count</li>
              <li>Date</li>
              <li>Listeners, territory, revenue, duration, saves, playlist adds, and demographics when available</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}