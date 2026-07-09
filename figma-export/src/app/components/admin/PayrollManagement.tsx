import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Banknote,
  Calculator,
  CircleDollarSign,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Landmark,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  calculatePayrollRun,
  closePayrollTaxYear,
  getPayrollOverview,
  getPayrollPayStubs,
  getPayrollReports,
  getPayrollTaxSummary,
  reviewPayrollTimesheet,
  retryFailedPayrollPayments,
  savePayrollEmployee,
  savePayrollTimesheet,
  transitionPayrollRun,
  updatePayrollConfig,
  type PayrollEmployee,
  type PayrollEmployeeStatus,
  type PayrollOverviewResponse,
  type PayrollPayFrequency,
  type PayrollPaymentMethod,
  type PayrollReportsResponse,
  type PayrollRun,
  type PayrollRunLine,
  type PayrollTaxSummaryResponse,
  type PayrollTimesheet,
} from '../../utils/admin-api';

type Tab = 'employees' | 'setup' | 'timesheets' | 'processing' | 'distribution' | 'stubs' | 'tax' | 'reports';

type TimesheetDraft = {
  regularHours: number;
  overtimeHours: number;
  paidTimeOffHours: number;
  unpaidLeaveHours: number;
  managerComment: string;
};

type StubRecord = {
  runId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  period: {
    startDate: string;
    endDate: string;
    payDate: string;
    payFrequency: PayrollPayFrequency;
  };
  currency: string;
  grossPay: number;
  earnings: {
    basePay: number;
    housingAllowance: number;
    transportAllowance: number;
    mealAllowance: number;
    variablePay: number;
  };
  deductions: PayrollRunLine['deductions'];
  deductionSummary: {
    paye: number;
    pension: number;
    nhf: number;
    stateLevy: number;
    localLevy: number;
    healthInsurance: number;
    voluntaryRetirement: number;
    other: number;
    unpaidLeaveAdjustment: number;
    total: number;
  };
  employerContribution: PayrollRunLine['employerContribution'];
  employerContributionSummary: {
    pension: number;
    nhf: number;
    nsitf: number;
    stateLevy: number;
    healthInsurance: number;
    voluntaryRetirementMatch: number;
    total: number;
  };
  netPay: number;
  paymentMethod: PayrollPaymentMethod;
  paymentStatus: 'pending' | 'succeeded' | 'failed';
  ytd: {
    gross: number;
    net: number;
    federal: number;
    socialSecurity: number;
    medicare: number;
    state: number;
    local: number;
    healthInsurance: number;
    retirement401k: number;
    other: number;
    unpaidLeaveAdjustment: number;
    deductionsTotal: number;
  };
};

const TABS: Array<{ id: Tab; label: string; icon: typeof Users }> = [
  { id: 'employees', label: 'Employee Master', icon: Users },
  { id: 'setup', label: 'Payroll Setup', icon: Landmark },
  { id: 'timesheets', label: 'Timesheets', icon: Clock3 },
  { id: 'processing', label: 'Payroll Run', icon: Calculator },
  { id: 'distribution', label: 'Approval & Distribution', icon: Banknote },
  { id: 'stubs', label: 'Payslips', icon: FileText },
  { id: 'tax', label: 'Tax Compliance', icon: ShieldAlert },
  { id: 'reports', label: 'Reports & GL', icon: FileSpreadsheet },
];

function createEmptyEmployee(): Partial<PayrollEmployee> {
  return {
    employeeId: '',
    name: '',
    department: '',
    position: '',
    status: 'active',
    hireDate: new Date().toISOString().slice(0, 10),
    salary: 0,
    currency: 'NGN',
    personalInfo: { email: '', phone: '', address: '', taxId: '', emergencyContact: '' },
    employmentDetails: { manager: '', employmentType: 'full_time' },
    compensation: { baseSalary: 0, hourlyRate: 0, payFrequency: 'monthly' },
    taxInfo: {
      filingStatus: 'single',
      w4Withholding: 0,
      state: 'LA',
      localTaxRate: 0,
      federalRateOverride: undefined,
      stateRateOverride: undefined,
    },
    benefits: {
      healthInsurance: 0,
      healthInsuranceEmployer: 0,
      housingAllowance: 0,
      transportAllowance: 0,
      mealAllowance: 0,
      pensionEmployeePercent: 8,
      nhfEmployeePercent: 2.5,
      retirement401kEnabled: false,
      retirement401kPercent: 0,
      retirement401kEmployerMatchPercent: 0,
      otherDeductions: 0,
    },
    directDeposit: { bankName: '', accountNumberMasked: '', routingNumberMasked: '' },
    leave: { ptoAccruedHours: 0, ptoUsedHours: 0, sickAccruedHours: 0, sickUsedHours: 0, carryoverHours: 0 },
  };
}

function normalizeEmployee(employee: Partial<PayrollEmployee>): PayrollEmployee {
  const empty = createEmptyEmployee();
  return {
    id: employee.id || `employee-${employee.employeeId || employee.name || Math.random().toString(36).slice(2)}`,
    employeeId: employee.employeeId || '',
    name: employee.name || 'Unknown employee',
    department: employee.department || 'Unassigned',
    position: employee.position || 'Unassigned',
    status: employee.status || 'active',
    hireDate: employee.hireDate || new Date().toISOString().slice(0, 10),
    salary: Number(employee.salary ?? employee.compensation?.baseSalary ?? 0) || 0,
    lastPayDate: employee.lastPayDate,
    currency: String(employee.currency || 'NGN').toUpperCase(),
    personalInfo: {
      ...empty.personalInfo,
      ...employee.personalInfo,
    },
    employmentDetails: {
      ...empty.employmentDetails,
      ...employee.employmentDetails,
    },
    compensation: {
      ...empty.compensation,
      ...employee.compensation,
    },
    taxInfo: {
      ...empty.taxInfo,
      ...employee.taxInfo,
    },
    benefits: {
      ...empty.benefits,
      ...employee.benefits,
    },
    directDeposit: {
      ...empty.directDeposit,
      ...employee.directDeposit,
    },
    leave: {
      ...empty.leave,
      ...employee.leave,
    },
    createdAt: employee.createdAt || new Date().toISOString(),
    updatedAt: employee.updatedAt || new Date().toISOString(),
  };
}

function normalizeConfig(config: PayrollOverviewResponse['config'] | null | undefined): PayrollOverviewResponse['config'] {
  return {
    baseCurrency: String(config?.baseCurrency || 'NGN').toUpperCase(),
    supportedCurrencies: Array.isArray(config?.supportedCurrencies) && config?.supportedCurrencies.length > 0
      ? config.supportedCurrencies.map((code) => String(code || '').toUpperCase()).filter(Boolean)
      : ['NGN', 'USD'],
    exchangeRates: config?.exchangeRates || { NGN: 1, USD: 0.00063 },
    payFrequencies: Array.isArray(config?.payFrequencies) && config.payFrequencies.length > 0 ? config.payFrequencies : ['weekly', 'bi_weekly', 'monthly'],
    taxRates: {
      federalIncomeTaxRate: Number(config?.taxRates?.federalIncomeTaxRate || 0),
      socialSecurityRateEmployee: Number(config?.taxRates?.socialSecurityRateEmployee || 0),
      socialSecurityRateEmployer: Number(config?.taxRates?.socialSecurityRateEmployer || 0),
      medicareRateEmployee: Number(config?.taxRates?.medicareRateEmployee || 0),
      medicareRateEmployer: Number(config?.taxRates?.medicareRateEmployer || 0),
      futaRateEmployer: Number(config?.taxRates?.futaRateEmployer || 0),
      sutaRateByState: config?.taxRates?.sutaRateByState || {},
      stateIncomeRateByState: config?.taxRates?.stateIncomeRateByState || {},
      payeRateDefault: Number((config?.taxRates?.payeRateDefault ?? config?.taxRates?.federalIncomeTaxRate) || 0),
      pensionRateEmployee: Number((config?.taxRates?.pensionRateEmployee ?? config?.taxRates?.socialSecurityRateEmployee) || 0),
      pensionRateEmployer: Number((config?.taxRates?.pensionRateEmployer ?? config?.taxRates?.socialSecurityRateEmployer) || 0),
      nhfRateEmployee: Number((config?.taxRates?.nhfRateEmployee ?? config?.taxRates?.medicareRateEmployee) || 0),
      nhfRateEmployer: Number((config?.taxRates?.nhfRateEmployer ?? config?.taxRates?.medicareRateEmployer) || 0),
      nsitfRateEmployer: Number((config?.taxRates?.nsitfRateEmployer ?? config?.taxRates?.futaRateEmployer) || 0),
      stateLevyRateByState: config?.taxRates?.stateLevyRateByState || config?.taxRates?.sutaRateByState || {},
    },
    deductions: {
      standardDeduction: Number(config?.deductions?.standardDeduction || 0),
      personalExemption: Number(config?.deductions?.personalExemption || 0),
    },
    wageRules: {
      overtimeMultiplier: Number(config?.wageRules?.overtimeMultiplier || 1.5),
      overtimeAfterHours: Number(config?.wageRules?.overtimeAfterHours || 40),
      minWageByState: config?.wageRules?.minWageByState || {},
    },
    taxYearClosed: config?.taxYearClosed || [],
    updatedAt: config?.updatedAt || new Date().toISOString(),
  };
}

function normalizeRunLine(line: Partial<PayrollRunLine>): PayrollRunLine {
  return {
    employeeId: line.employeeId || '',
    employeeName: line.employeeName || 'Unknown employee',
    department: line.department || 'Unassigned',
    currency: String(line.currency || 'NGN').toUpperCase(),
    grossPay: Number(line.grossPay || 0),
    deductions: {
      federalWithholding: Number(line.deductions?.federalWithholding || 0),
      socialSecurity: Number(line.deductions?.socialSecurity || 0),
      medicare: Number(line.deductions?.medicare || 0),
      stateIncomeTax: Number(line.deductions?.stateIncomeTax || 0),
      localIncomeTax: Number(line.deductions?.localIncomeTax || 0),
      healthInsurance: Number(line.deductions?.healthInsurance || 0),
      retirement401k: Number(line.deductions?.retirement401k || 0),
      other: Number(line.deductions?.other || 0),
      unpaidLeaveAdjustment: Number(line.deductions?.unpaidLeaveAdjustment || 0),
    },
    employerContribution: {
      socialSecurity: Number(line.employerContribution?.socialSecurity || 0),
      medicare: Number(line.employerContribution?.medicare || 0),
      futa: Number(line.employerContribution?.futa || 0),
      suta: Number(line.employerContribution?.suta || 0),
      healthInsurance: Number(line.employerContribution?.healthInsurance || 0),
      retirement401kMatch: Number(line.employerContribution?.retirement401kMatch || 0),
    },
    netPay: Number(line.netPay || 0),
    anomalyFlags: Array.isArray(line.anomalyFlags) ? line.anomalyFlags : [],
    paymentMethod: line.paymentMethod || 'direct_deposit',
    paymentStatus: line.paymentStatus || 'pending',
    paymentReference: line.paymentReference,
  };
}

function normalizeRun(run: Partial<PayrollRun>): PayrollRun {
  return {
    id: run.id || `run-${run.period?.payDate || Date.now()}`,
    period: {
      id: run.period?.id || `${run.period?.startDate || ''}_${run.period?.endDate || ''}_${run.period?.payFrequency || 'monthly'}`,
      startDate: run.period?.startDate || new Date().toISOString().slice(0, 10),
      endDate: run.period?.endDate || new Date().toISOString().slice(0, 10),
      payDate: run.period?.payDate || new Date().toISOString().slice(0, 10),
      payFrequency: run.period?.payFrequency || 'monthly',
    },
    status: run.status || 'draft',
    preparedBy: run.preparedBy,
    reviewedBy: run.reviewedBy,
    approvedBy: run.approvedBy,
    preparedAt: run.preparedAt,
    reviewedAt: run.reviewedAt,
    approvedAt: run.approvedAt,
    paidAt: run.paidAt,
    lines: Array.isArray(run.lines) ? run.lines.map((line) => normalizeRunLine(line)) : [],
    totals: {
      gross: Number(run.totals?.gross || 0),
      deductions: Number(run.totals?.deductions || 0),
      net: Number(run.totals?.net || 0),
      employerCost: Number(run.totals?.employerCost || 0),
    },
    paymentMethod: run.paymentMethod || 'direct_deposit',
    achBatchCsv: run.achBatchCsv,
    createdAt: run.createdAt || new Date().toISOString(),
    updatedAt: run.updatedAt || new Date().toISOString(),
  };
}

function normalizeTimesheet(timesheet: Partial<PayrollTimesheet>): PayrollTimesheet {
  return {
    id: timesheet.id || `${timesheet.periodId || 'period'}-${timesheet.employeeId || 'employee'}`,
    periodId: timesheet.periodId || '',
    employeeId: timesheet.employeeId || '',
    regularHours: Number(timesheet.regularHours || 0),
    overtimeHours: Number(timesheet.overtimeHours || 0),
    paidTimeOffHours: Number(timesheet.paidTimeOffHours || 0),
    unpaidLeaveHours: Number(timesheet.unpaidLeaveHours || 0),
    status: timesheet.status || 'draft',
    managerComment: timesheet.managerComment,
    submittedAt: timesheet.submittedAt,
    approvedAt: timesheet.approvedAt,
    approvedBy: timesheet.approvedBy,
    createdAt: timesheet.createdAt || new Date().toISOString(),
    updatedAt: timesheet.updatedAt || new Date().toISOString(),
  };
}

function normalizeOverview(data: PayrollOverviewResponse): PayrollOverviewResponse {
  const config = normalizeConfig(data?.config);
  const supportedCurrencies = config.supportedCurrencies.length > 0 ? config.supportedCurrencies : ['NGN', 'USD'];
  const exchangeRates = { NGN: 1, ...config.exchangeRates };
  for (const currencyCode of supportedCurrencies) {
    if (!exchangeRates[currencyCode]) {
      exchangeRates[currencyCode] = 1;
    }
  }

  return {
    employees: Array.isArray(data?.employees) ? data.employees.map((employee) => normalizeEmployee(employee)) : [],
    config: {
      ...config,
      supportedCurrencies,
      exchangeRates,
    },
    timesheets: Array.isArray(data?.timesheets) ? data.timesheets.map((timesheet) => normalizeTimesheet(timesheet)) : [],
    runs: Array.isArray(data?.runs) ? data.runs.map((run) => normalizeRun(run)) : [],
    dashboard: {
      employeeCount: Number(data?.dashboard?.employeeCount || 0),
      activeEmployees: Number(data?.dashboard?.activeEmployees || 0),
      pendingTimesheets: Number(data?.dashboard?.pendingTimesheets || 0),
      lastRunTotals: data?.dashboard?.lastRunTotals
        ? {
            gross: Number(data.dashboard.lastRunTotals.gross || 0),
            deductions: Number(data.dashboard.lastRunTotals.deductions || 0),
            net: Number(data.dashboard.lastRunTotals.net || 0),
            employerCost: Number(data.dashboard.lastRunTotals.employerCost || 0),
          }
        : null,
      complianceAlerts: Array.isArray(data?.dashboard?.complianceAlerts) ? data.dashboard.complianceAlerts : [],
    },
  };
}

function normalizeTaxSummary(summary: PayrollTaxSummaryResponse | null | undefined): PayrollTaxSummaryResponse {
  const quarterlyPayeRemittance = Array.isArray(summary?.quarterlyPayeRemittance)
    ? summary.quarterlyPayeRemittance
    : Array.isArray(summary?.quarterly941)
      ? summary.quarterly941
      : [];
  const annualEmployeeTaxCards = Array.isArray(summary?.annualEmployeeTaxCards)
    ? summary.annualEmployeeTaxCards
    : Array.isArray(summary?.annual?.w2)
      ? summary.annual.w2
      : [];
  const annualContractorPayments = Array.isArray(summary?.annualContractorPayments)
    ? summary.annualContractorPayments
    : Array.isArray(summary?.annual?.form1099)
      ? summary.annual.form1099
      : [];

  return {
    year: Number(summary?.year || new Date().getFullYear()),
    totals: {
      totalWages: Number(summary?.totals?.totalWages || 0),
      federalWithheld: Number(summary?.totals?.federalWithheld || 0),
      ficaEmployee: Number(summary?.totals?.ficaEmployee || 0),
      stateWithheld: Number(summary?.totals?.stateWithheld || 0),
      localWithheld: Number(summary?.totals?.localWithheld || 0),
      ficaEmployer: Number(summary?.totals?.ficaEmployer || 0),
      futa: Number(summary?.totals?.futa || 0),
      suta: Number(summary?.totals?.suta || 0),
      payeWithheld: Number((summary?.totals?.payeWithheld ?? summary?.totals?.federalWithheld) || 0),
      pensionEmployee: Number((summary?.totals?.pensionEmployee ?? summary?.totals?.ficaEmployee) || 0),
      nhfEmployee: Number(summary?.totals?.nhfEmployee || 0),
      statePayeWithheld: Number((summary?.totals?.statePayeWithheld ?? summary?.totals?.stateWithheld) || 0),
      localLevyWithheld: Number((summary?.totals?.localLevyWithheld ?? summary?.totals?.localWithheld) || 0),
      pensionEmployer: Number((summary?.totals?.pensionEmployer ?? summary?.totals?.ficaEmployer) || 0),
      nhfEmployer: Number(summary?.totals?.nhfEmployer || 0),
      nsitf: Number((summary?.totals?.nsitf ?? summary?.totals?.futa) || 0),
      stateLevy: Number((summary?.totals?.stateLevy ?? summary?.totals?.suta) || 0),
      employeeStatutory: Number((summary?.totals?.employeeStatutory ?? summary?.totals?.ficaEmployee) || 0),
      employerStatutory: Number((summary?.totals?.employerStatutory ?? summary?.totals?.ficaEmployer) || 0),
    },
    quarterly941: Array.isArray(summary?.quarterly941) ? summary.quarterly941 : quarterlyPayeRemittance,
    quarterlyPayeRemittance,
    annual: {
      w2: Array.isArray(summary?.annual?.w2) ? summary.annual.w2 : annualEmployeeTaxCards,
      w3TransmittalCount: Number(summary?.annual?.w3TransmittalCount || 0),
      form1099: Array.isArray(summary?.annual?.form1099) ? summary.annual.form1099 : annualContractorPayments,
    },
    annualEmployeeTaxCards,
    annualContractorPayments,
    alerts: Array.isArray(summary?.alerts) ? summary.alerts : [],
  };
}

function normalizeReports(reportSet: PayrollReportsResponse | null | undefined): PayrollReportsResponse {
  return {
    payrollRegister: Array.isArray(reportSet?.payrollRegister) ? reportSet.payrollRegister : [],
    payrollSummary: Array.isArray(reportSet?.payrollSummary) ? reportSet.payrollSummary : [],
    deductionReport: Array.isArray(reportSet?.deductionReport) ? reportSet.deductionReport : [],
    laborCostAnalysis: Array.isArray(reportSet?.laborCostAnalysis) ? reportSet.laborCostAnalysis : [],
    payrollTaxLiability: normalizeTaxSummary(reportSet?.payrollTaxLiability),
    contractor1099: Array.isArray(reportSet?.contractor1099) ? reportSet.contractor1099 : [],
    contractorPayments: Array.isArray(reportSet?.contractorPayments)
      ? reportSet.contractorPayments
      : Array.isArray(reportSet?.contractor1099)
        ? reportSet.contractor1099
        : [],
    accountingEntries: Array.isArray(reportSet?.accountingEntries) ? reportSet.accountingEntries : [],
  };
}

function normalizeStubRecord(record: Record<string, unknown>): StubRecord {
  const stub = record as Partial<StubRecord>;
  return {
    runId: String(stub.runId || ''),
    employeeId: String(stub.employeeId || ''),
    employeeName: String(stub.employeeName || 'Unknown employee'),
    employeeEmail: String(stub.employeeEmail || ''),
    period: {
      startDate: String(stub.period?.startDate || ''),
      endDate: String(stub.period?.endDate || ''),
      payDate: String(stub.period?.payDate || ''),
      payFrequency: stub.period?.payFrequency || 'monthly',
    },
    currency: String(stub.currency || 'NGN').toUpperCase(),
    grossPay: Number(stub.grossPay || 0),
    earnings: {
      basePay: Number(stub.earnings?.basePay || 0),
      housingAllowance: Number(stub.earnings?.housingAllowance || 0),
      transportAllowance: Number(stub.earnings?.transportAllowance || 0),
      mealAllowance: Number(stub.earnings?.mealAllowance || 0),
      variablePay: Number(stub.earnings?.variablePay || 0),
    },
    deductions: {
      federalWithholding: Number(stub.deductions?.federalWithholding || 0),
      socialSecurity: Number(stub.deductions?.socialSecurity || 0),
      medicare: Number(stub.deductions?.medicare || 0),
      stateIncomeTax: Number(stub.deductions?.stateIncomeTax || 0),
      localIncomeTax: Number(stub.deductions?.localIncomeTax || 0),
      healthInsurance: Number(stub.deductions?.healthInsurance || 0),
      retirement401k: Number(stub.deductions?.retirement401k || 0),
      other: Number(stub.deductions?.other || 0),
      unpaidLeaveAdjustment: Number(stub.deductions?.unpaidLeaveAdjustment || 0),
    },
    deductionSummary: {
      paye: Number(stub.deductionSummary?.paye || 0),
      pension: Number(stub.deductionSummary?.pension || 0),
      nhf: Number(stub.deductionSummary?.nhf || 0),
      stateLevy: Number(stub.deductionSummary?.stateLevy || 0),
      localLevy: Number(stub.deductionSummary?.localLevy || 0),
      healthInsurance: Number(stub.deductionSummary?.healthInsurance || 0),
      voluntaryRetirement: Number(stub.deductionSummary?.voluntaryRetirement || 0),
      other: Number(stub.deductionSummary?.other || 0),
      unpaidLeaveAdjustment: Number(stub.deductionSummary?.unpaidLeaveAdjustment || 0),
      total: Number(stub.deductionSummary?.total || 0),
    },
    employerContribution: {
      socialSecurity: Number(stub.employerContribution?.socialSecurity || 0),
      medicare: Number(stub.employerContribution?.medicare || 0),
      futa: Number(stub.employerContribution?.futa || 0),
      suta: Number(stub.employerContribution?.suta || 0),
      healthInsurance: Number(stub.employerContribution?.healthInsurance || 0),
      retirement401kMatch: Number(stub.employerContribution?.retirement401kMatch || 0),
    },
    employerContributionSummary: {
      pension: Number(stub.employerContributionSummary?.pension || 0),
      nhf: Number(stub.employerContributionSummary?.nhf || 0),
      nsitf: Number(stub.employerContributionSummary?.nsitf || 0),
      stateLevy: Number(stub.employerContributionSummary?.stateLevy || 0),
      healthInsurance: Number(stub.employerContributionSummary?.healthInsurance || 0),
      voluntaryRetirementMatch: Number(stub.employerContributionSummary?.voluntaryRetirementMatch || 0),
      total: Number(stub.employerContributionSummary?.total || 0),
    },
    netPay: Number(stub.netPay || 0),
    paymentMethod: stub.paymentMethod || 'direct_deposit',
    paymentStatus: stub.paymentStatus || 'pending',
    ytd: {
      gross: Number(stub.ytd?.gross || 0),
      net: Number(stub.ytd?.net || 0),
      federal: Number(stub.ytd?.federal || 0),
      socialSecurity: Number(stub.ytd?.socialSecurity || 0),
      medicare: Number(stub.ytd?.medicare || 0),
      state: Number(stub.ytd?.state || 0),
      local: Number(stub.ytd?.local || 0),
      healthInsurance: Number(stub.ytd?.healthInsurance || 0),
      retirement401k: Number(stub.ytd?.retirement401k || 0),
      other: Number(stub.ytd?.other || 0),
      unpaidLeaveAdjustment: Number(stub.ytd?.unpaidLeaveAdjustment || 0),
      deductionsTotal: Number(stub.ytd?.deductionsTotal || 0),
    },
  };
}

function currency(amount: number, code = 'NGN') {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const normalizedCode = String(code || 'NGN').trim().toUpperCase();

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCode,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 2,
    }).format(safeAmount);
  }
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ');
}

function paymentMethodLabel(value: PayrollPaymentMethod) {
  if (value === 'direct_deposit') return 'Bank Transfer';
  if (value === 'check') return 'Cheque';
  return 'Paycard';
}

function payPeriodsPerYear(payFrequency: PayrollPayFrequency) {
  if (payFrequency === 'weekly') return 52;
  if (payFrequency === 'bi_weekly') return 26;
  return 12;
}

function lineDeductionTotal(line: PayrollRunLine) {
  return line.deductions.federalWithholding
    + line.deductions.socialSecurity
    + line.deductions.medicare
    + line.deductions.stateIncomeTax
    + line.deductions.localIncomeTax
    + line.deductions.healthInsurance
    + line.deductions.retirement401k
    + line.deductions.other
    + line.deductions.unpaidLeaveAdjustment;
}

function lineEmployerTotal(line: PayrollRunLine) {
  return line.employerContribution.socialSecurity
    + line.employerContribution.medicare
    + line.employerContribution.futa
    + line.employerContribution.suta
    + line.employerContribution.healthInsurance
    + line.employerContribution.retirement401kMatch;
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function recordsToCsv(records: Array<Record<string, unknown>>) {
  if (records.length === 0) return '';
  const headers = Object.keys(records[0]);
  const lines = records.map((record) => headers.map((header) => csvEscape(record[header])).join(','));
  return [headers.join(','), ...lines].join('\n');
}

function downloadTextFile(fileName: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function runWorkflowLabel(run: PayrollRun) {
  return `${run.period.payDate} • ${formatLabel(run.period.payFrequency)} • ${run.status}`;
}

function badgeClass(status: string) {
  if (status === 'active' || status === 'approved' || status === 'paid' || status === 'succeeded' || status === 'locked' || status === 'completed') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'reviewed' || status === 'prepared' || status === 'submitted' || status === 'pending' || status === 'due_soon') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  if (status === 'failed' || status === 'inactive' || status === 'rejected' || status === 'overdue') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }
  return 'border-[#333] bg-[#161616] text-[#D1D5DB]';
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${badgeClass(value)}`}>{formatLabel(value)}</span>;
}

function SummaryMetric({ label, value, tone = 'text-white' }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="border-[#222] bg-[#111] p-3">
      <p className="text-xs text-[#9CA3AF]">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone}`}>{value}</p>
    </Card>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="border-[#222] bg-[#111] p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description ? <p className="mt-1 text-xs text-[#9CA3AF]">{description}</p> : null}
      </div>
      {children}
    </Card>
  );
}

export function PayrollManagement() {
  const [tab, setTab] = useState<Tab>('employees');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTaxYear, setSelectedTaxYear] = useState(new Date().getFullYear());
  const [refreshKey, setRefreshKey] = useState(0);

  const [overview, setOverview] = useState<PayrollOverviewResponse | null>(null);
  const [taxSummary, setTaxSummary] = useState<PayrollTaxSummaryResponse | null>(null);
  const [reports, setReports] = useState<PayrollReportsResponse | null>(null);

  const [employeeForm, setEmployeeForm] = useState<Partial<PayrollEmployee>>(() => createEmptyEmployee());
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'all' | PayrollEmployeeStatus>('all');

  const [periodForm, setPeriodForm] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    payDate: new Date().toISOString().slice(0, 10),
    payFrequency: 'bi_weekly' as PayrollPayFrequency,
  });
  const [paymentMethod, setPaymentMethod] = useState<PayrollPaymentMethod>('direct_deposit');
  const [selectedRunId, setSelectedRunId] = useState('');
  const [timesheetDrafts, setTimesheetDrafts] = useState<Record<string, TimesheetDraft>>({});
  const [stubs, setStubs] = useState<StubRecord[]>([]);
  const [complianceMonth, setComplianceMonth] = useState(new Date().toISOString().slice(0, 7));

  const employees = overview?.employees || [];
  const runs = overview?.runs || [];
  const timesheets = overview?.timesheets || [];

  const selectedRun = useMemo(() => runs.find((run) => run.id === selectedRunId) || runs[0] || null, [runs, selectedRunId]);
  const employeeLookup = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);
  const complianceMonthDate = useMemo(() => {
    const [year, month] = complianceMonth.split('-').map((value) => Number(value));
    return new Date(year || new Date().getFullYear(), (month || 1) - 1, 1);
  }, [complianceMonth]);
  const monthlyRun = useMemo(() => runs.find((run) => run.period.payDate.slice(0, 7) === complianceMonth) || null, [runs, complianceMonth]);

  const currentPeriodId = `${periodForm.startDate}_${periodForm.endDate}_${periodForm.payFrequency}`;

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch = [employee.name, employee.employeeId, employee.department, employee.position]
        .join(' ')
        .toLowerCase()
        .includes(employeeSearch.toLowerCase());
      const matchesStatus = employeeStatusFilter === 'all' || employee.status === employeeStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employeeSearch, employeeStatusFilter, employees]);

  const jurisdictionCodes = useMemo(() => {
    if (!overview) return [];
    const codes = new Set<string>([
      ...Object.keys(overview.config.taxRates.stateIncomeRateByState),
      ...Object.keys(overview.config.taxRates.stateLevyRateByState || {}),
      ...Object.keys(overview.config.taxRates.sutaRateByState),
      ...Object.keys(overview.config.wageRules.minWageByState),
      ...employees.map((employee) => employee.taxInfo.state),
    ]);
    return Array.from(codes).sort();
  }, [overview, employees]);

  useEffect(() => {
    const controller = new AbortController();
    const TIMEOUT_MS = 15_000;

    function withTimeout<T>(promise: Promise<T>): Promise<T> {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_MS)
        ),
      ]);
    }

    async function run() {
      setLoading(true);
      try {
        const [overviewResult, taxResult, reportsResult] = await Promise.allSettled([
          withTimeout(getPayrollOverview()),
          withTimeout(getPayrollTaxSummary(selectedTaxYear)),
          withTimeout(getPayrollReports()),
        ]);

        if (controller.signal.aborted) return;

        if (overviewResult.status === 'fulfilled') {
          const safeOverview = normalizeOverview(overviewResult.value);
          setOverview(safeOverview);
          setSelectedRunId((current) => {
            const stillExists = safeOverview.runs.some((r) => r.id === current);
            return stillExists ? current : safeOverview.runs[0]?.id || '';
          });
        } else {
          toast.error('Failed to load payroll overview');
          setOverview(normalizeOverview({} as PayrollOverviewResponse));
        }

        setTaxSummary(taxResult.status === 'fulfilled' ? normalizeTaxSummary(taxResult.value) : normalizeTaxSummary(null));
        setReports(reportsResult.status === 'fulfilled' ? normalizeReports(reportsResult.value) : normalizeReports(null));
      } catch {
        if (!controller.signal.aborted) {
          toast.error('Failed to load payroll data');
          setOverview(normalizeOverview({} as PayrollOverviewResponse));
          setTaxSummary(normalizeTaxSummary(null));
          setReports(normalizeReports(null));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void run();
    return () => { controller.abort(); };
  }, [selectedTaxYear, refreshKey]);

  function loadAll() {
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    const nextDrafts: Record<string, TimesheetDraft> = {};
    for (const employee of employees) {
      const existing = timesheets.find((item) => item.periodId === currentPeriodId && item.employeeId === employee.id);
      nextDrafts[employee.id] = {
        regularHours: existing?.regularHours ?? 0,
        overtimeHours: existing?.overtimeHours ?? 0,
        paidTimeOffHours: existing?.paidTimeOffHours ?? 0,
        unpaidLeaveHours: existing?.unpaidLeaveHours ?? 0,
        managerComment: existing?.managerComment ?? '',
      };
    }
    setTimesheetDrafts(nextDrafts);
  }, [currentPeriodId, employees, timesheets]);

  function resetEmployeeForm() {
    setEditingEmployeeId(null);
    setEmployeeForm(createEmptyEmployee());
  }

  function timesheetFor(employeeId: string) {
    return timesheets.find((item) => item.periodId === currentPeriodId && item.employeeId === employeeId);
  }

  function updateEmployeeForm<K extends keyof PayrollEmployee>(key: K, value: PayrollEmployee[K]) {
    setEmployeeForm((current) => ({ ...current, [key]: value }));
  }

  function updateTimesheetDraft(employeeId: string, field: keyof TimesheetDraft, value: number | string) {
    setTimesheetDrafts((current) => ({
      ...current,
      [employeeId]: {
        ...(current[employeeId] || { regularHours: 0, overtimeHours: 0, paidTimeOffHours: 0, unpaidLeaveHours: 0, managerComment: '' }),
        [field]: value,
      },
    }));
  }

  async function onSaveEmployee() {
    setSaving(true);
    try {
      await savePayrollEmployee({ ...employeeForm, id: editingEmployeeId || undefined });
      toast.success(editingEmployeeId ? 'Employee profile updated' : 'Employee added');
      resetEmployeeForm();
      await loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  }

  async function onSaveConfig() {
    if (!overview) return;
    setSaving(true);
    try {
      const config = await updatePayrollConfig(overview.config);
      setOverview({ ...overview, config });
      toast.success('Payroll setup updated');
      loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save config');
    } finally {
      setSaving(false);
    }
  }

  async function persistTimesheet(employeeId: string, status?: PayrollTimesheet['status']) {
    const draft = timesheetDrafts[employeeId];
    if (!draft) return;
    try {
      const list = await savePayrollTimesheet({
        periodId: currentPeriodId,
        employeeId,
        regularHours: draft.regularHours,
        overtimeHours: draft.overtimeHours,
        paidTimeOffHours: draft.paidTimeOffHours,
        unpaidLeaveHours: draft.unpaidLeaveHours,
        managerComment: draft.managerComment || undefined,
        status,
      });
      setOverview((current) => (current ? { ...current, timesheets: list } : current));
      toast.success(status === 'submitted' ? 'Timesheet submitted' : 'Timesheet saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save timesheet');
    }
  }

  async function onReviewTimesheet(employeeId: string, status: 'approved' | 'rejected') {
    try {
      const item = await reviewPayrollTimesheet({
        periodId: currentPeriodId,
        employeeId,
        status,
        managerComment: timesheetDrafts[employeeId]?.managerComment || undefined,
      });
      setOverview((current) => {
        if (!current) return current;
        const next = current.timesheets.filter((entry) => !(entry.periodId === item.periodId && entry.employeeId === item.employeeId));
        return { ...current, timesheets: [item, ...next] };
      });
      toast.success(`Timesheet ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to review timesheet');
    }
  }

  async function onCalculatePayroll() {
    try {
      const run = await calculatePayrollRun({
        ...periodForm,
        paymentMethod,
      });
      toast.success('Payroll run prepared');
      setSelectedRunId(run.id);
      loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to prepare payroll');
    }
  }

  async function onTransition(action: 'review' | 'approve' | 'pay' | 'lock') {
    if (!selectedRun) return;
    try {
      await transitionPayrollRun(selectedRun.id, action, paymentMethod);
      toast.success(`Payroll ${action} completed`);
      loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payroll transition failed');
    }
  }

  async function onRetryFailedPayments() {
    if (!selectedRun) return;
    try {
      await retryFailedPayrollPayments(selectedRun.id);
      toast.success('Failed transfers retried');
      loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Retry failed');
    }
  }

  async function onLoadStubs() {
    if (!selectedRun) return;
    try {
      const rows = await getPayrollPayStubs(selectedRun.id);
      setStubs(rows.map((row) => normalizeStubRecord(row)));
      toast.success('Pay stubs generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load pay stubs');
    }
  }

  async function onCloseTaxYear() {
    try {
      await closePayrollTaxYear(selectedTaxYear);
      toast.success(`Tax year ${selectedTaxYear} closed and payroll records locked`);
      loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to close tax year');
    }
  }

  function updateJurisdiction(code: string, field: 'stateIncomeRateByState' | 'sutaRateByState' | 'minWageByState', value: number) {
    if (!overview) return;

    if (field === 'minWageByState') {
      setOverview({
        ...overview,
        config: {
          ...overview.config,
          wageRules: {
            ...overview.config.wageRules,
            minWageByState: { ...overview.config.wageRules.minWageByState, [code]: value },
          },
        },
      });
      return;
    }

    setOverview({
      ...overview,
      config: {
        ...overview.config,
        taxRates: {
          ...overview.config.taxRates,
          [field]: { ...overview.config.taxRates[field], [code]: value },
          ...(field === 'sutaRateByState'
            ? { stateLevyRateByState: { ...(overview.config.taxRates.stateLevyRateByState || {}), [code]: value } }
            : {}),
        },
      },
    });
  }

  function exportReport(name: string, rows: Array<Record<string, unknown>>) {
    const csv = recordsToCsv(rows);
    if (!csv) {
      toast.error('No rows available for export');
      return;
    }
    downloadTextFile(name, csv, 'text/csv;charset=utf-8');
  }

  function exportNigeriaRemittanceTemplate(template: 'paye' | 'pension' | 'nhf') {
    if (!selectedRun) {
      toast.error('Select a payroll run before exporting remittance templates');
      return;
    }

    const rows = selectedRun.lines.map((line, index) => {
      const employee = employeeLookup.get(line.employeeId);
      const monthlyGross = Number(line.grossPay || 0);
      const paye = Number(line.deductions.federalWithholding || 0);
      const pension = Number(line.deductions.socialSecurity || 0);
      const nhf = Number(line.deductions.medicare || 0);

      return {
        sn: index + 1,
        employeeId: employee?.employeeId || line.employeeId,
        employeeName: line.employeeName,
        taxId: employee?.personalInfo.taxId || '',
        stateCode: employee?.taxInfo.state || '',
        payPeriod: `${selectedRun.period.startDate} to ${selectedRun.period.endDate}`,
        payDate: selectedRun.period.payDate,
        grossPay: monthlyGross,
        taxableIncome: monthlyGross,
        payeWithheld: paye,
        pensionEmployee: pension,
        nhfEmployee: nhf,
        totalRemittance: template === 'paye' ? paye : template === 'pension' ? pension : nhf,
      };
    });

    const templateName = template === 'paye' ? 'firs-paye-schedule' : template === 'pension' ? 'pencom-pension-schedule' : 'nhf-schedule';
    exportReport(`${templateName}-${selectedRun.period.payDate}.csv`, rows);
  }

  // Nigerian NIBSS bank codes (NIP)
  const NIGERIAN_BANK_CODES: Record<string, string> = {
    'gtbank': '058', 'guaranty trust': '058', 'gtb': '058',
    'access': '044', 'access bank': '044',
    'uba': '033', 'united bank for africa': '033',
    'zenith': '057', 'zenith bank': '057',
    'first bank': '011', 'firstbank': '011', 'fbn': '011',
    'fidelity': '070', 'fidelity bank': '070',
    'stanbic': '221', 'stanbic ibtc': '221',
    'fcmb': '214', 'first city': '214',
    'sterling': '232', 'sterling bank': '232',
    'union bank': '032',
    'polaris': '076', 'polaris bank': '076',
    'wema': '035', 'wema bank': '035',
    'keystone': '082', 'keystone bank': '082',
    'ecobank': '050',
    'heritage': '030', 'heritage bank': '030',
    'providus': '101', 'providus bank': '101',
    'opay': '999992', 'kuda': '090267',
    'moniepoint': '50515', 'palmpay': '999991',
  };

  function resolveBankCode(bankName: string, storedCode: string): string {
    if (!bankName) return storedCode || '000';
    const key = bankName.trim().toLowerCase();
    return NIGERIAN_BANK_CODES[key] || storedCode || '000';
  }

  function exportBankPayrollFile(format: 'gtbank' | 'access' | 'uba' | 'zenith' | 'firstbank' | 'fidelity') {
    if (!selectedRun) {
      toast.error('Select a payroll run before exporting bank files');
      return;
    }

    const directDepositLines = selectedRun.lines.filter((line) => line.paymentMethod === 'direct_deposit');
    if (directDepositLines.length === 0) {
      toast.error('No direct deposit records found for the selected run');
      return;
    }

    const payDate = selectedRun.period.payDate;
    const shortNarr = `SAL/${payDate.replace(/-/g, '').slice(0, 8)}`;

    // ── GTBank (GT World / Internet Banking Bulk) ──────────────────────
    // Official columns: S/N | ACCOUNT NAME | ACCOUNT NUMBER | BANK | BANK CODE | AMOUNT | NARRATION | CURRENCY
    if (format === 'gtbank') {
      const rows = directDepositLines.map((line, i) => {
        const emp = employeeLookup.get(line.employeeId);
        const acctNo = emp?.directDeposit.accountNumberMasked || '';
        const bankName = (emp as any)?.directDeposit?.bankName || '';
        const bankCode = resolveBankCode(bankName, emp?.directDeposit.routingNumberMasked || '');
        return {
          'S/N': i + 1,
          'ACCOUNT NAME': line.employeeName.toUpperCase(),
          'ACCOUNT NUMBER': acctNo,
          'BANK NAME': bankName.toUpperCase() || 'N/A',
          'BANK CODE': bankCode,
          'AMOUNT': Number(line.netPay || 0).toFixed(2),
          'NARRATION': `${shortNarr} ${line.employeeName}`.slice(0, 50),
          'CURRENCY': 'NGN',
        };
      });
      exportReport(`GTBank-Payroll-Upload-${payDate}.csv`, rows);
      return;
    }

    // ── Access Bank (PayDirect / InterBank Transfers Bulk Template) ────
    // Official columns: S/N | BENEFICIARY NAME | BENEFICIARY ACCOUNT NUMBER | BENEFICIARY BANK CODE | AMOUNT | PAYMENT DESCRIPTION | CURRENCY | PAYMENT TYPE
    if (format === 'access') {
      const rows = directDepositLines.map((line, i) => {
        const emp = employeeLookup.get(line.employeeId);
        const acctNo = emp?.directDeposit.accountNumberMasked || '';
        const bankName = (emp as any)?.directDeposit?.bankName || '';
        const bankCode = resolveBankCode(bankName, emp?.directDeposit.routingNumberMasked || '');
        return {
          'S/N': i + 1,
          'BENEFICIARY NAME': line.employeeName.toUpperCase(),
          'BENEFICIARY ACCOUNT NUMBER': acctNo,
          'BENEFICIARY BANK CODE': bankCode,
          'AMOUNT': Number(line.netPay || 0).toFixed(2),
          'PAYMENT DESCRIPTION': `${shortNarr} ${line.employeeName}`.slice(0, 60),
          'CURRENCY': 'NGN',
          'PAYMENT TYPE': 'NIP',
        };
      });
      exportReport(`Access-Bank-Payroll-Upload-${payDate}.csv`, rows);
      return;
    }

    // ── UBA (UBA Internet Banking Bulk Payment Template) ───────────────
    // Official columns: S/N | EMPLOYEE NAME | ACCOUNT NUMBER | BANK CODE | AMOUNT | NARRATION | VALUE DATE
    if (format === 'uba') {
      const rows = directDepositLines.map((line, i) => {
        const emp = employeeLookup.get(line.employeeId);
        const acctNo = emp?.directDeposit.accountNumberMasked || '';
        const bankName = (emp as any)?.directDeposit?.bankName || '';
        const bankCode = resolveBankCode(bankName, emp?.directDeposit.routingNumberMasked || '');
        return {
          'S/N': i + 1,
          'EMPLOYEE NAME': line.employeeName.toUpperCase(),
          'ACCOUNT NUMBER': acctNo,
          'BANK CODE': bankCode,
          'AMOUNT': Number(line.netPay || 0).toFixed(2),
          'NARRATION': `${shortNarr} ${line.employeeName}`.slice(0, 60),
          'VALUE DATE': payDate,
        };
      });
      exportReport(`UBA-Payroll-Upload-${payDate}.csv`, rows);
      return;
    }

    // ── Zenith Bank (Business Online Bulk Payment Template) ───────────
    // Official columns: S/N | ACCOUNT NAME | ACCOUNT NUMBER | BANK | SORT CODE | AMOUNT | REMARKS | PAYMENT MODE | CURRENCY
    if (format === 'zenith') {
      const rows = directDepositLines.map((line, i) => {
        const emp = employeeLookup.get(line.employeeId);
        const acctNo = emp?.directDeposit.accountNumberMasked || '';
        const bankName = (emp as any)?.directDeposit?.bankName || '';
        const bankCode = resolveBankCode(bankName, emp?.directDeposit.routingNumberMasked || '');
        return {
          'S/N': i + 1,
          'ACCOUNT NAME': line.employeeName.toUpperCase(),
          'ACCOUNT NUMBER': acctNo,
          'BANK': bankName.toUpperCase() || 'N/A',
          'SORT CODE': bankCode,
          'AMOUNT': Number(line.netPay || 0).toFixed(2),
          'REMARKS': `${shortNarr} ${line.employeeName}`.slice(0, 50),
          'PAYMENT MODE': 'NIP',
          'CURRENCY': 'NGN',
        };
      });
      exportReport(`Zenith-Bank-Payroll-Upload-${payDate}.csv`, rows);
      return;
    }

    // ── First Bank (FirstOnline Bulk Salary Payment) ──────────────────
    // Official columns: S/N | BENEFICIARY ACCOUNT NAME | BENEFICIARY ACCOUNT NUMBER | BENEFICIARY BANK CODE | AMOUNT (KOBO) | NARRATION | CHANNEL
    if (format === 'firstbank') {
      const rows = directDepositLines.map((line, i) => {
        const emp = employeeLookup.get(line.employeeId);
        const acctNo = emp?.directDeposit.accountNumberMasked || '';
        const bankName = (emp as any)?.directDeposit?.bankName || '';
        const bankCode = resolveBankCode(bankName, emp?.directDeposit.routingNumberMasked || '');
        const amountKobo = Math.round(Number(line.netPay || 0) * 100);
        return {
          'S/N': i + 1,
          'BENEFICIARY ACCOUNT NAME': line.employeeName.toUpperCase(),
          'BENEFICIARY ACCOUNT NUMBER': acctNo,
          'BENEFICIARY BANK CODE': bankCode,
          'AMOUNT (KOBO)': amountKobo,
          'NARRATION': `${shortNarr} ${line.employeeName}`.slice(0, 50),
          'CHANNEL': 'NIP',
        };
      });
      exportReport(`FirstBank-Payroll-Upload-${payDate}.csv`, rows);
      return;
    }

    // ── Fidelity Bank (Fidelity i-Bank Bulk Transfer) ─────────────────
    // Official columns: S/N | RECEIVER NAME | ACCOUNT NUMBER | BANK CODE | AMOUNT | DESCRIPTION | TRANSACTION DATE
    if (format === 'fidelity') {
      const rows = directDepositLines.map((line, i) => {
        const emp = employeeLookup.get(line.employeeId);
        const acctNo = emp?.directDeposit.accountNumberMasked || '';
        const bankName = (emp as any)?.directDeposit?.bankName || '';
        const bankCode = resolveBankCode(bankName, emp?.directDeposit.routingNumberMasked || '');
        return {
          'S/N': i + 1,
          'RECEIVER NAME': line.employeeName.toUpperCase(),
          'ACCOUNT NUMBER': acctNo,
          'BANK CODE': bankCode,
          'AMOUNT': Number(line.netPay || 0).toFixed(2),
          'DESCRIPTION': `${shortNarr} ${line.employeeName}`.slice(0, 50),
          'TRANSACTION DATE': payDate,
        };
      });
      exportReport(`Fidelity-Bank-Payroll-Upload-${payDate}.csv`, rows);
    }
  }

  function monthIso(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  function buildComplianceDate(base: Date, dayOfMonth: number, monthOffset = 0) {
    return monthIso(new Date(base.getFullYear(), base.getMonth() + monthOffset, dayOfMonth));
  }

  function complianceStatus(dueDate: string, completed: boolean): 'completed' | 'overdue' | 'due_soon' | 'upcoming' {
    if (completed) return 'completed';
    const now = new Date();
    const due = new Date(dueDate);
    if (now > due) return 'overdue';
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return 'due_soon';
    return 'upcoming';
  }

  const complianceMilestones = useMemo(() => {
    const payrollCompleted = monthlyRun?.status === 'paid' || monthlyRun?.status === 'locked';
    const nextMonthStart = new Date(complianceMonthDate.getFullYear(), complianceMonthDate.getMonth() + 1, 1);

    return [
      {
        id: 'timesheet-cutoff',
        item: 'Timesheet Cutoff',
        dueDate: buildComplianceDate(complianceMonthDate, 25),
        owner: 'HR Operations',
        status: complianceStatus(buildComplianceDate(complianceMonthDate, 25), Boolean(monthlyRun?.preparedAt)),
      },
      {
        id: 'salary-payment',
        item: 'Salary Payment',
        dueDate: buildComplianceDate(complianceMonthDate, 28),
        owner: 'Finance',
        status: complianceStatus(buildComplianceDate(complianceMonthDate, 28), payrollCompleted),
      },
      {
        id: 'pension-remittance',
        item: 'Pension Remittance (PENCOM)',
        dueDate: buildComplianceDate(nextMonthStart, 7),
        owner: 'Finance',
        status: complianceStatus(buildComplianceDate(nextMonthStart, 7), payrollCompleted),
      },
      {
        id: 'paye-remittance',
        item: 'PAYE Remittance (FIRS/State IRS)',
        dueDate: buildComplianceDate(nextMonthStart, 10),
        owner: 'Tax',
        status: complianceStatus(buildComplianceDate(nextMonthStart, 10), payrollCompleted),
      },
      {
        id: 'nhf-remittance',
        item: 'NHF Remittance',
        dueDate: buildComplianceDate(nextMonthStart, 10),
        owner: 'Finance',
        status: complianceStatus(buildComplianceDate(nextMonthStart, 10), payrollCompleted),
      },
      {
        id: 'nsitf-remittance',
        item: 'NSITF Filing',
        dueDate: buildComplianceDate(nextMonthStart, 15),
        owner: 'Compliance',
        status: complianceStatus(buildComplianceDate(nextMonthStart, 15), payrollCompleted),
      },
    ] as const;
  }, [complianceMonthDate, monthlyRun]);

  const complianceCalendarAlerts = useMemo(() => {
    return complianceMilestones
      .filter((item) => item.status === 'overdue' || item.status === 'due_soon')
      .map((item) => `${item.item} is ${item.status === 'overdue' ? 'overdue' : 'due soon'} (${item.dueDate})`);
  }, [complianceMilestones]);

  function printStub(stub: StubRecord) {
    const content = [
      `Employee: ${stub.employeeName}`,
      `Period: ${stub.period.startDate} to ${stub.period.endDate}`,
      `Pay Date: ${stub.period.payDate}`,
      `Base Salary: ${currency(stub.earnings.basePay, stub.currency)}`,
      `Allowances: ${currency(stub.earnings.housingAllowance + stub.earnings.transportAllowance + stub.earnings.mealAllowance, stub.currency)}`,
      `Gross Pay: ${currency(stub.grossPay, stub.currency)}`,
      `Net Pay: ${currency(stub.netPay, stub.currency)}`,
      `PAYE: ${currency(stub.deductionSummary.paye, stub.currency)}`,
      `Pension: ${currency(stub.deductionSummary.pension, stub.currency)}`,
      `NHF: ${currency(stub.deductionSummary.nhf, stub.currency)}`,
      `State + LGA: ${currency(stub.deductionSummary.stateLevy + stub.deductionSummary.localLevy, stub.currency)}`,
      `Total Deductions YTD: ${currency(stub.ytd.deductionsTotal, stub.currency)}`,
    ].join('\n');
      downloadTextFile(`${stub.employeeName.replace(/\s+/g, '_')}_payslip.txt`, content);
  }

  function emailStub(stub: StubRecord) {
    if (typeof window === 'undefined') return;
    const subject = encodeURIComponent(`Payslip for ${stub.period.payDate}`);
    const body = encodeURIComponent([
      `Hello ${stub.employeeName},`,
      '',
      `Your payroll for ${stub.period.startDate} to ${stub.period.endDate} has been processed.`,
      `Gross pay: ${currency(stub.grossPay, stub.currency)}`,
      `Net pay: ${currency(stub.netPay, stub.currency)}`,
      `Payment status: ${formatLabel(stub.paymentStatus)}`,
    ].join('\n'));
    window.open(`mailto:${stub.employeeEmail}?subject=${subject}&body=${body}`, '_blank');
  }

  if (loading || !overview || !taxSummary || !reports) {
    return (
      <div className="rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] p-6 text-[#B3B3B3]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading payroll system...
        </div>
      </div>
    );
  }

  const pendingApprovals = runs.filter((run) => run.status === 'prepared' || run.status === 'reviewed').length;
  const failedPayments = selectedRun?.lines.filter((line) => line.paymentStatus === 'failed').length || 0;
  const salaryEmployees = employees.filter((employee) => employee.employmentDetails.employmentType === 'full_time');
  const hourlyEmployees = employees.filter((employee) => employee.employmentDetails.employmentType !== 'full_time');

  return (
    <div className="space-y-6 rounded-xl border border-[#FF6B00]/20 bg-[#0A0A0A] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
            <CircleDollarSign className="h-5 w-5 text-[#FF6B00]" />
            Payroll Management
          </h1>
          <p className="mt-1 text-sm text-[#B3B3B3]">
            Live payroll administration for employee records, wage compliance, pay runs, tax filings, payslips, and accounting entries.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setTab('processing')}>
            <Calculator className="mr-2 h-4 w-4" />
            Process Payroll
          </Button>
          <Button onClick={() => loadAll()} className="bg-[#FF6B00] text-white hover:bg-[#E55A00]">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryMetric label="Employees" value={String(overview.dashboard.employeeCount)} />
        <SummaryMetric label="Active Staff" value={String(overview.dashboard.activeEmployees)} tone="text-emerald-400" />
        <SummaryMetric label="Pending Timesheets" value={String(overview.dashboard.pendingTimesheets)} tone="text-amber-400" />
        <SummaryMetric label="Pending Approvals" value={String(pendingApprovals)} tone="text-[#60A5FA]" />
        <SummaryMetric label="Last Net Payroll" value={currency(overview.dashboard.lastRunTotals?.net || 0, overview.config.baseCurrency)} tone="text-[#F97316]" />
      </div>

      {overview.dashboard.complianceAlerts.length > 0 ? (
        <Card className="border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Compliance Alerts
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {overview.dashboard.complianceAlerts.map((alert) => (
              <div key={alert} className="rounded-lg border border-amber-500/20 bg-black/10 p-2 text-xs">
                {alert}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="border-[#222] bg-[#111] p-3">
        <div className="grid gap-2 lg:grid-cols-4">
          {[
            { step: '1. Prepare', detail: selectedRun?.preparedAt ? `Prepared ${selectedRun.preparedAt.slice(0, 10)}` : 'Ready for payroll calculation' },
            { step: '2. Review', detail: selectedRun?.reviewedAt ? `Reviewed by ${selectedRun.reviewedBy || 'finance'}` : 'Finance manager review required' },
            { step: '3. Approve', detail: selectedRun?.approvedAt ? `Approved by ${selectedRun.approvedBy || 'signatory'}` : 'Owner approval required before payment' },
            { step: '4. Distribute', detail: selectedRun?.paidAt ? `${failedPayments} failed payment(s) require follow-up` : 'Bank transfer, cheque, and paycard supported' },
          ].map((item) => (
            <div key={item.step} className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
              <p className="text-xs font-semibold text-white">{item.step}</p>
              <p className="mt-1 text-xs text-[#9CA3AF]">{item.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              tab === item.id ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-white' : 'border-[#333] text-[#B3B3B3]'
            }`}
            onClick={() => setTab(item.id)}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'employees' ? (
        <div className="space-y-4">
          <SectionCard title="Employee Directory" description="Directory table with live employee status, salary, and last pay date.">
            <div className="mb-3 grid gap-3 lg:grid-cols-[2fr_220px]">
              <div>
                <Label htmlFor="employee-search">Search employees</Label>
                <Input id="employee-search" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} placeholder="Search by name, ID, department, or position" />
              </div>
              <div>
                <Label htmlFor="employee-status-filter">Status filter</Label>
                <select
                  id="employee-status-filter"
                  title="Employee status filter"
                  className="h-10 w-full rounded-md border border-[#333] bg-[#0A0A0A] px-2 text-sm"
                  value={employeeStatusFilter}
                  onChange={(e) => setEmployeeStatusFilter(e.target.value as 'all' | PayrollEmployeeStatus)}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On leave</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-[#D1D5DB]">
                <thead className="text-[#9CA3AF]">
                  <tr>
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Employee ID</th>
                    <th className="pb-2">Department</th>
                    <th className="pb-2">Position</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Hire Date</th>
                    <th className="pb-2">Salary</th>
                    <th className="pb-2">Last Pay Date</th>
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="border-t border-[#222]">
                      <td className="py-2">{employee.name}</td>
                      <td>{employee.employeeId}</td>
                      <td>{employee.department}</td>
                      <td>{employee.position}</td>
                      <td><StatusBadge value={employee.status} /></td>
                      <td>{employee.hireDate}</td>
                      <td>{currency(employee.salary, employee.currency)}</td>
                      <td>{employee.lastPayDate || '-'}</td>
                      <td>
                        <button
                          className="rounded bg-white/10 px-2 py-1 text-xs"
                          onClick={() => {
                            setEmployeeForm(employee);
                            setEditingEmployeeId(employee.id);
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td className="py-6 text-[#9CA3AF]" colSpan={9}>No employees match the current filters.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Employee Profile" description="Personal info, employment details, compensation, tax setup, statutory deductions, bank payment details, and emergency contact.">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="employee-name">Name</Label>
                    <Input id="employee-name" value={employeeForm.name || ''} onChange={(e) => updateEmployeeForm('name', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="employee-id">Employee ID</Label>
                    <Input id="employee-id" value={employeeForm.employeeId || ''} onChange={(e) => updateEmployeeForm('employeeId', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="employee-status">Status</Label>
                    <select
                      id="employee-status"
                      title="Employee status"
                      className="h-10 w-full rounded-md border border-[#333] bg-[#0A0A0A] px-2 text-sm"
                      value={employeeForm.status || 'active'}
                      onChange={(e) => updateEmployeeForm('status', e.target.value as PayrollEmployeeStatus)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On leave</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="employee-hire-date">Hire Date</Label>
                    <Input id="employee-hire-date" type="date" value={employeeForm.hireDate || ''} onChange={(e) => updateEmployeeForm('hireDate', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="employee-email">Email</Label>
                    <Input id="employee-email" value={employeeForm.personalInfo?.email || ''} onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      personalInfo: { ...(employeeForm.personalInfo || createEmptyEmployee().personalInfo), email: e.target.value },
                    })} />
                  </div>
                  <div>
                    <Label htmlFor="employee-phone">Phone</Label>
                    <Input id="employee-phone" value={employeeForm.personalInfo?.phone || ''} onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      personalInfo: { ...(employeeForm.personalInfo || createEmptyEmployee().personalInfo), phone: e.target.value },
                    })} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="employee-address">Address</Label>
                  <Input id="employee-address" value={employeeForm.personalInfo?.address || ''} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    personalInfo: { ...(employeeForm.personalInfo || createEmptyEmployee().personalInfo), address: e.target.value },
                  })} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="employee-tax-id">Tax ID (TIN)</Label>
                    <Input id="employee-tax-id" value={employeeForm.personalInfo?.taxId || ''} onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      personalInfo: { ...(employeeForm.personalInfo || createEmptyEmployee().personalInfo), taxId: e.target.value },
                    })} />
                  </div>
                  <div>
                    <Label htmlFor="employee-emergency">Emergency Contact</Label>
                    <Input id="employee-emergency" value={employeeForm.personalInfo?.emergencyContact || ''} onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      personalInfo: { ...(employeeForm.personalInfo || createEmptyEmployee().personalInfo), emergencyContact: e.target.value },
                    })} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="employee-department">Department</Label>
                    <Input id="employee-department" value={employeeForm.department || ''} onChange={(e) => updateEmployeeForm('department', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="employee-position">Position</Label>
                    <Input id="employee-position" value={employeeForm.position || ''} onChange={(e) => updateEmployeeForm('position', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="employee-manager">Manager</Label>
                    <Input id="employee-manager" value={employeeForm.employmentDetails?.manager || ''} onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      employmentDetails: { ...(employeeForm.employmentDetails || createEmptyEmployee().employmentDetails), manager: e.target.value },
                    })} />
                  </div>
                  <div>
                    <Label htmlFor="employee-employment-type">Employment Type</Label>
                    <select
                      id="employee-employment-type"
                      title="Employment type"
                      className="h-10 w-full rounded-md border border-[#333] bg-[#0A0A0A] px-2 text-sm"
                      value={employeeForm.employmentDetails?.employmentType || 'full_time'}
                      onChange={(e) => setEmployeeForm({
                        ...employeeForm,
                        employmentDetails: {
                          ...(employeeForm.employmentDetails || createEmptyEmployee().employmentDetails),
                          employmentType: e.target.value as PayrollEmployee['employmentDetails']['employmentType'],
                        },
                      })}
                    >
                      <option value="full_time">Full-time</option>
                      <option value="part_time">Part-time</option>
                      <option value="contractor">Contractor</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="employee-base-salary">Annual Base Salary</Label>
                    <Input id="employee-base-salary" type="number" value={employeeForm.compensation?.baseSalary || 0} onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      salary: Number(e.target.value) || 0,
                      compensation: { ...(employeeForm.compensation || createEmptyEmployee().compensation), baseSalary: Number(e.target.value) || 0 },
                    })} />
                  </div>
                  <div>
                    <Label htmlFor="employee-hourly-rate">Hourly Rate</Label>
                    <Input id="employee-hourly-rate" type="number" value={employeeForm.compensation?.hourlyRate || 0} onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      compensation: { ...(employeeForm.compensation || createEmptyEmployee().compensation), hourlyRate: Number(e.target.value) || 0 },
                    })} />
                  </div>
                  <div>
                    <Label htmlFor="employee-pay-frequency">Pay Frequency</Label>
                    <select
                      id="employee-pay-frequency"
                      title="Pay frequency"
                      className="h-10 w-full rounded-md border border-[#333] bg-[#0A0A0A] px-2 text-sm"
                      value={employeeForm.compensation?.payFrequency || 'monthly'}
                      onChange={(e) => setEmployeeForm({
                        ...employeeForm,
                        compensation: {
                          ...(employeeForm.compensation || createEmptyEmployee().compensation),
                          payFrequency: e.target.value as PayrollPayFrequency,
                        },
                      })}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="bi_weekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="employee-currency">Currency</Label>
                    <select
                      id="employee-currency"
                      title="Employee currency"
                      className="h-10 w-full rounded-md border border-[#333] bg-[#0A0A0A] px-2 text-sm"
                      value={employeeForm.currency || overview.config.baseCurrency}
                      onChange={(e) => updateEmployeeForm('currency', e.target.value)}
                    >
                      {overview.config.supportedCurrencies.map((code) => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="employee-filing-status">Tax Category</Label>
                    <select
                      id="employee-filing-status"
                      title="Tax filing status"
                      className="h-10 w-full rounded-md border border-[#333] bg-[#0A0A0A] px-2 text-sm"
                      value={employeeForm.taxInfo?.filingStatus || 'single'}
                      onChange={(e) => setEmployeeForm({
                        ...employeeForm,
                        taxInfo: {
                          ...(employeeForm.taxInfo || createEmptyEmployee().taxInfo),
                          filingStatus: e.target.value as PayrollEmployee['taxInfo']['filingStatus'],
                        },
                      })}
                    >
                      <option value="single">Single</option>
                      <option value="married_joint">Married filing jointly</option>
                      <option value="married_separate">Married filing separately</option>
                      <option value="head_of_household">Head of household</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="employee-w4">Additional PAYE Adjustment</Label>
                    <Input id="employee-w4" type="number" value={employeeForm.taxInfo?.w4Withholding || 0} onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      taxInfo: { ...(employeeForm.taxInfo || createEmptyEmployee().taxInfo), w4Withholding: Number(e.target.value) || 0 },
                    })} />
                  </div>
                  <div>
                    <Label htmlFor="employee-state">State / Jurisdiction</Label>
                    <Input id="employee-state" value={employeeForm.taxInfo?.state || ''} onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      taxInfo: { ...(employeeForm.taxInfo || createEmptyEmployee().taxInfo), state: e.target.value.toUpperCase() },
                    })} />
                  </div>
                  <div>
                    <Label htmlFor="employee-local-tax">LGA Levy Rate</Label>
                    <Input id="employee-local-tax" type="number" step="0.0001" value={employeeForm.taxInfo?.localTaxRate || 0} onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      taxInfo: { ...(employeeForm.taxInfo || createEmptyEmployee().taxInfo), localTaxRate: Number(e.target.value) || 0 },
                    })} />
                  </div>
                  <div>
                    <Label htmlFor="employee-federal-override">PAYE Rate Override</Label>
                    <Input id="employee-federal-override" type="number" step="0.0001" value={employeeForm.taxInfo?.federalRateOverride ?? ''} onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      taxInfo: {
                        ...(employeeForm.taxInfo || createEmptyEmployee().taxInfo),
                        federalRateOverride: e.target.value === '' ? undefined : Number(e.target.value),
                      },
                    })} />
                  </div>
                  <div>
                    <Label htmlFor="employee-state-override">State Rate Override</Label>
                    <Input id="employee-state-override" type="number" step="0.0001" value={employeeForm.taxInfo?.stateRateOverride ?? ''} onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      taxInfo: {
                        ...(employeeForm.taxInfo || createEmptyEmployee().taxInfo),
                        stateRateOverride: e.target.value === '' ? undefined : Number(e.target.value),
                      },
                    })} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              <div className="space-y-3 rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                <h3 className="text-xs font-semibold text-white">Statutory and Other Deductions</h3>
                <div>
                  <Label htmlFor="employee-health-insurance">Health Insurance Deduction</Label>
                  <Input id="employee-health-insurance" type="number" value={employeeForm.benefits?.healthInsurance || 0} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    benefits: { ...(employeeForm.benefits || createEmptyEmployee().benefits), healthInsurance: Number(e.target.value) || 0 },
                  })} />
                </div>
                <div>
                  <Label htmlFor="employee-health-employer">Employer Health Cost</Label>
                  <Input id="employee-health-employer" type="number" value={employeeForm.benefits?.healthInsuranceEmployer || 0} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    benefits: { ...(employeeForm.benefits || createEmptyEmployee().benefits), healthInsuranceEmployer: Number(e.target.value) || 0 },
                  })} />
                </div>
                <label className="flex items-center gap-2 text-sm text-[#D1D5DB]">
                  <input
                    type="checkbox"
                    checked={employeeForm.benefits?.retirement401kEnabled || false}
                    onChange={(e) => setEmployeeForm({
                      ...employeeForm,
                      benefits: { ...(employeeForm.benefits || createEmptyEmployee().benefits), retirement401kEnabled: e.target.checked },
                    })}
                  />
                  Voluntary retirement savings enabled
                </label>
                <div>
                  <Label htmlFor="employee-401k-percent">Voluntary Retirement Contribution %</Label>
                  <Input id="employee-401k-percent" type="number" step="0.0001" value={employeeForm.benefits?.retirement401kPercent || 0} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    benefits: { ...(employeeForm.benefits || createEmptyEmployee().benefits), retirement401kPercent: Number(e.target.value) || 0 },
                  })} />
                </div>
                <div>
                  <Label htmlFor="employee-401k-match">Employer Retirement Match %</Label>
                  <Input id="employee-401k-match" type="number" step="0.0001" value={employeeForm.benefits?.retirement401kEmployerMatchPercent || 0} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    benefits: { ...(employeeForm.benefits || createEmptyEmployee().benefits), retirement401kEmployerMatchPercent: Number(e.target.value) || 0 },
                  })} />
                </div>
                <div>
                  <Label htmlFor="employee-other-deductions">Other Deductions</Label>
                  <Input id="employee-other-deductions" type="number" value={employeeForm.benefits?.otherDeductions || 0} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    benefits: { ...(employeeForm.benefits || createEmptyEmployee().benefits), otherDeductions: Number(e.target.value) || 0 },
                  })} />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                <h3 className="text-xs font-semibold text-white">Bank Payment Details</h3>
                <div>
                  <Label htmlFor="employee-bank-name">Bank Name</Label>
                  <Input id="employee-bank-name" value={employeeForm.directDeposit?.bankName || ''} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    directDeposit: { ...(employeeForm.directDeposit || createEmptyEmployee().directDeposit), bankName: e.target.value },
                  })} />
                </div>
                <div>
                  <Label htmlFor="employee-account-mask">Account Number (masked)</Label>
                  <Input id="employee-account-mask" value={employeeForm.directDeposit?.accountNumberMasked || ''} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    directDeposit: { ...(employeeForm.directDeposit || createEmptyEmployee().directDeposit), accountNumberMasked: e.target.value },
                  })} />
                </div>
                <div>
                  <Label htmlFor="employee-routing-mask">Bank Code (masked)</Label>
                  <Input id="employee-routing-mask" value={employeeForm.directDeposit?.routingNumberMasked || ''} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    directDeposit: { ...(employeeForm.directDeposit || createEmptyEmployee().directDeposit), routingNumberMasked: e.target.value },
                  })} />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                <h3 className="text-xs font-semibold text-white">Leave Balances</h3>
                <div>
                  <Label htmlFor="employee-pto-accrued">Annual Leave Accrued Hours</Label>
                  <Input id="employee-pto-accrued" type="number" value={employeeForm.leave?.ptoAccruedHours || 0} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    leave: { ...(employeeForm.leave || createEmptyEmployee().leave), ptoAccruedHours: Number(e.target.value) || 0 },
                  })} />
                </div>
                <div>
                  <Label htmlFor="employee-pto-used">Annual Leave Used Hours</Label>
                  <Input id="employee-pto-used" type="number" value={employeeForm.leave?.ptoUsedHours || 0} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    leave: { ...(employeeForm.leave || createEmptyEmployee().leave), ptoUsedHours: Number(e.target.value) || 0 },
                  })} />
                </div>
                <div>
                  <Label htmlFor="employee-sick-accrued">Sick Leave Accrued Hours</Label>
                  <Input id="employee-sick-accrued" type="number" value={employeeForm.leave?.sickAccruedHours || 0} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    leave: { ...(employeeForm.leave || createEmptyEmployee().leave), sickAccruedHours: Number(e.target.value) || 0 },
                  })} />
                </div>
                <div>
                  <Label htmlFor="employee-sick-used">Sick Leave Used Hours</Label>
                  <Input id="employee-sick-used" type="number" value={employeeForm.leave?.sickUsedHours || 0} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    leave: { ...(employeeForm.leave || createEmptyEmployee().leave), sickUsedHours: Number(e.target.value) || 0 },
                  })} />
                </div>
                <div>
                  <Label htmlFor="employee-carryover">Carryover Hours</Label>
                  <Input id="employee-carryover" type="number" value={employeeForm.leave?.carryoverHours || 0} onChange={(e) => setEmployeeForm({
                    ...employeeForm,
                    leave: { ...(employeeForm.leave || createEmptyEmployee().leave), carryoverHours: Number(e.target.value) || 0 },
                  })} />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => void onSaveEmployee()} disabled={saving} className="bg-[#FF6B00] text-white hover:bg-[#E55A00]">
                <Save className="mr-2 h-4 w-4" />
                {editingEmployeeId ? 'Update Employee' : 'Add Employee'}
              </Button>
              {editingEmployeeId ? <Button variant="outline" onClick={resetEmployeeForm}>Cancel Edit</Button> : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === 'setup' ? (
        <div className="space-y-4">
          <SectionCard title="Payroll Setup" description="Base currency, pay periods, PAYE/Pension settings, deductions, and multi-state wage rules.">
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-3 rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                <h3 className="text-xs font-semibold text-white">Pay Periods and Currency</h3>
                <div>
                  <Label htmlFor="base-currency">Base Currency</Label>
                  <Input id="base-currency" value={overview.config.baseCurrency} onChange={(e) => setOverview({ ...overview, config: { ...overview.config, baseCurrency: e.target.value.toUpperCase() } })} />
                </div>
                <div>
                  <Label htmlFor="supported-currencies">Supported Currencies</Label>
                  <Input
                    id="supported-currencies"
                    value={overview.config.supportedCurrencies.join(', ')}
                    onChange={(e) => setOverview({
                      ...overview,
                      config: {
                        ...overview.config,
                        supportedCurrencies: e.target.value.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean),
                      },
                    })}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(['weekly', 'bi_weekly', 'monthly'] as PayrollPayFrequency[]).map((frequency) => {
                    const selected = overview.config.payFrequencies.includes(frequency);
                    return (
                      <label key={frequency} className="flex items-center gap-2 rounded border border-[#333] p-2 text-xs text-[#D1D5DB]">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => setOverview({
                            ...overview,
                            config: {
                              ...overview.config,
                              payFrequencies: e.target.checked
                                ? Array.from(new Set([...overview.config.payFrequencies, frequency]))
                                : overview.config.payFrequencies.filter((item) => item !== frequency),
                            },
                          })}
                        />
                        {formatLabel(frequency)}
                      </label>
                    );
                  })}
                </div>
                <div>
                  <Label htmlFor="standard-deduction">Standard Deduction</Label>
                  <Input id="standard-deduction" type="number" value={overview.config.deductions.standardDeduction} onChange={(e) => setOverview({
                    ...overview,
                    config: {
                      ...overview.config,
                      deductions: { ...overview.config.deductions, standardDeduction: Number(e.target.value) || 0 },
                    },
                  })} />
                </div>
                <div>
                  <Label htmlFor="personal-exemption">Personal Exemption</Label>
                  <Input id="personal-exemption" type="number" value={overview.config.deductions.personalExemption} onChange={(e) => setOverview({
                    ...overview,
                    config: {
                      ...overview.config,
                      deductions: { ...overview.config.deductions, personalExemption: Number(e.target.value) || 0 },
                    },
                  })} />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                <h3 className="text-xs font-semibold text-white">Tax Configuration</h3>
                <div>
                  <Label htmlFor="federal-tax-rate">PAYE Base Rate</Label>
                  <Input id="federal-tax-rate" type="number" step="0.0001" value={overview.config.taxRates.payeRateDefault ?? overview.config.taxRates.federalIncomeTaxRate} onChange={(e) => setOverview({
                    ...overview,
                    config: {
                      ...overview.config,
                      taxRates: {
                        ...overview.config.taxRates,
                        federalIncomeTaxRate: Number(e.target.value) || 0,
                        payeRateDefault: Number(e.target.value) || 0,
                      },
                    },
                  })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="social-security-employee">Pension Employee</Label>
                    <Input id="social-security-employee" type="number" step="0.0001" value={overview.config.taxRates.pensionRateEmployee ?? overview.config.taxRates.socialSecurityRateEmployee} onChange={(e) => setOverview({
                      ...overview,
                      config: {
                        ...overview.config,
                        taxRates: {
                          ...overview.config.taxRates,
                          socialSecurityRateEmployee: Number(e.target.value) || 0,
                          pensionRateEmployee: Number(e.target.value) || 0,
                        },
                      },
                    })} />
                  </div>
                  <div>
                    <Label htmlFor="social-security-employer">Pension Employer</Label>
                    <Input id="social-security-employer" type="number" step="0.0001" value={overview.config.taxRates.pensionRateEmployer ?? overview.config.taxRates.socialSecurityRateEmployer} onChange={(e) => setOverview({
                      ...overview,
                      config: {
                        ...overview.config,
                        taxRates: {
                          ...overview.config.taxRates,
                          socialSecurityRateEmployer: Number(e.target.value) || 0,
                          pensionRateEmployer: Number(e.target.value) || 0,
                        },
                      },
                    })} />
                  </div>
                  <div>
                    <Label htmlFor="medicare-employee">NHF Employee</Label>
                    <Input id="medicare-employee" type="number" step="0.0001" value={overview.config.taxRates.nhfRateEmployee ?? overview.config.taxRates.medicareRateEmployee} onChange={(e) => setOverview({
                      ...overview,
                      config: {
                        ...overview.config,
                        taxRates: {
                          ...overview.config.taxRates,
                          medicareRateEmployee: Number(e.target.value) || 0,
                          nhfRateEmployee: Number(e.target.value) || 0,
                        },
                      },
                    })} />
                  </div>
                  <div>
                    <Label htmlFor="medicare-employer">NHF Employer</Label>
                    <Input id="medicare-employer" type="number" step="0.0001" value={overview.config.taxRates.nhfRateEmployer ?? overview.config.taxRates.medicareRateEmployer} onChange={(e) => setOverview({
                      ...overview,
                      config: {
                        ...overview.config,
                        taxRates: {
                          ...overview.config.taxRates,
                          medicareRateEmployer: Number(e.target.value) || 0,
                          nhfRateEmployer: Number(e.target.value) || 0,
                        },
                      },
                    })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="futa-rate">NSITF Employer Rate</Label>
                  <Input id="futa-rate" type="number" step="0.0001" value={overview.config.taxRates.nsitfRateEmployer ?? overview.config.taxRates.futaRateEmployer} onChange={(e) => setOverview({
                    ...overview,
                    config: {
                      ...overview.config,
                      taxRates: {
                        ...overview.config.taxRates,
                        futaRateEmployer: Number(e.target.value) || 0,
                        nsitfRateEmployer: Number(e.target.value) || 0,
                      },
                    },
                  })} />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                <h3 className="text-xs font-semibold text-white">Wage and Hour Rules</h3>
                <div>
                  <Label htmlFor="overtime-multiplier">Overtime Multiplier</Label>
                  <Input id="overtime-multiplier" type="number" step="0.1" value={overview.config.wageRules.overtimeMultiplier} onChange={(e) => setOverview({
                    ...overview,
                    config: {
                      ...overview.config,
                      wageRules: { ...overview.config.wageRules, overtimeMultiplier: Number(e.target.value) || 1.5 },
                    },
                  })} />
                </div>
                <div>
                  <Label htmlFor="overtime-after-hours">Overtime After Hours</Label>
                  <Input id="overtime-after-hours" type="number" value={overview.config.wageRules.overtimeAfterHours} onChange={(e) => setOverview({
                    ...overview,
                    config: {
                      ...overview.config,
                      wageRules: { ...overview.config.wageRules, overtimeAfterHours: Number(e.target.value) || 40 },
                    },
                  })} />
                </div>
                <div className="rounded border border-[#333] bg-[#101010] p-3 text-xs text-[#9CA3AF]">
                  <p>Configured pay frequencies: {overview.config.payFrequencies.map((item) => formatLabel(item)).join(', ')}</p>
                  <p className="mt-1">Multi-currency payroll is supported through exchange-rate conversion to {overview.config.baseCurrency}.</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Jurisdiction Tables" description="Nigeria PAYE support with state rates, levy rates, and minimum wage by state.">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-[#D1D5DB]">
                <thead className="text-[#9CA3AF]">
                  <tr>
                    <th className="pb-2">State</th>
                    <th className="pb-2">State PAYE Rate</th>
                    <th className="pb-2">State Levy</th>
                    <th className="pb-2">Min Wage</th>
                  </tr>
                </thead>
                <tbody>
                  {jurisdictionCodes.map((code) => (
                    <tr key={code} className="border-t border-[#222]">
                      <td className="py-2 font-medium text-white">{code}</td>
                      <td>
                        <Input className="h-8" type="number" step="0.0001" value={overview.config.taxRates.stateIncomeRateByState[code] || 0} onChange={(e) => updateJurisdiction(code, 'stateIncomeRateByState', Number(e.target.value) || 0)} />
                      </td>
                      <td>
                        <Input className="h-8" type="number" step="0.0001" value={(overview.config.taxRates.stateLevyRateByState?.[code] ?? overview.config.taxRates.sutaRateByState[code]) || 0} onChange={(e) => updateJurisdiction(code, 'sutaRateByState', Number(e.target.value) || 0)} />
                      </td>
                      <td>
                        <Input className="h-8" type="number" value={overview.config.wageRules.minWageByState[code] || 0} onChange={(e) => updateJurisdiction(code, 'minWageByState', Number(e.target.value) || 0)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Exchange Rates" description={`Rates convert employee currencies into ${overview.config.baseCurrency} for consolidated reporting.`}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {overview.config.supportedCurrencies.map((code) => (
                <div key={code}>
                  <Label htmlFor={`exchange-${code}`}>{code}</Label>
                  <Input
                    id={`exchange-${code}`}
                    type="number"
                    step="0.0001"
                    value={overview.config.exchangeRates[code] || 1}
                    onChange={(e) => setOverview({
                      ...overview,
                      config: {
                        ...overview.config,
                        exchangeRates: { ...overview.config.exchangeRates, [code]: Number(e.target.value) || 1 },
                      },
                    })}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button onClick={() => void onSaveConfig()} disabled={saving} className="bg-[#FF6B00] text-white hover:bg-[#E55A00]">
                <Save className="mr-2 h-4 w-4" />
                Save Setup
              </Button>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === 'timesheets' ? (
        <div className="space-y-4">
          <SectionCard title="Timesheet Entry" description="Weekly, bi-weekly, or monthly time capture for hourly and contract staff with manager approval workflow.">
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label htmlFor="timesheet-start-date">Period Start</Label>
                <Input id="timesheet-start-date" type="date" value={periodForm.startDate} onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="timesheet-end-date">Period End</Label>
                <Input id="timesheet-end-date" type="date" value={periodForm.endDate} onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="timesheet-pay-date">Pay Date</Label>
                <Input id="timesheet-pay-date" type="date" value={periodForm.payDate} onChange={(e) => setPeriodForm({ ...periodForm, payDate: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="timesheet-frequency">Frequency</Label>
                <select
                  id="timesheet-frequency"
                  title="Timesheet frequency"
                  className="h-10 w-full rounded-md border border-[#333] bg-[#0A0A0A] px-2 text-sm"
                  value={periodForm.payFrequency}
                  onChange={(e) => setPeriodForm({ ...periodForm, payFrequency: e.target.value as PayrollPayFrequency })}
                >
                  <option value="weekly">Weekly</option>
                  <option value="bi_weekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-[#D1D5DB]">
                <thead className="text-[#9CA3AF]">
                  <tr>
                    <th className="pb-2">Employee</th>
                    <th className="pb-2">Regular</th>
                    <th className="pb-2">Overtime</th>
                    <th className="pb-2">PTO</th>
                    <th className="pb-2">Unpaid</th>
                    <th className="pb-2">Mgr Comment</th>
                    <th className="pb-2">Gross Preview</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hourlyEmployees.map((employee) => {
                    const draft = timesheetDrafts[employee.id] || { regularHours: 0, overtimeHours: 0, paidTimeOffHours: 0, unpaidLeaveHours: 0, managerComment: '' };
                    const status = timesheetFor(employee.id)?.status || 'draft';
                    const grossPreview = (draft.regularHours + draft.paidTimeOffHours) * employee.compensation.hourlyRate
                      + (draft.overtimeHours * employee.compensation.hourlyRate * overview.config.wageRules.overtimeMultiplier);
                    return (
                      <tr key={employee.id} className="border-t border-[#222] align-top">
                        <td className="py-2">
                          <div className="font-medium text-white">{employee.name}</div>
                          <div className="text-[11px] text-[#9CA3AF]">{employee.position} • {employee.department}</div>
                        </td>
                        <td><Input className="h-8" type="number" value={draft.regularHours} onChange={(e) => updateTimesheetDraft(employee.id, 'regularHours', Number(e.target.value) || 0)} /></td>
                        <td><Input className="h-8" type="number" value={draft.overtimeHours} onChange={(e) => updateTimesheetDraft(employee.id, 'overtimeHours', Number(e.target.value) || 0)} /></td>
                        <td><Input className="h-8" type="number" value={draft.paidTimeOffHours} onChange={(e) => updateTimesheetDraft(employee.id, 'paidTimeOffHours', Number(e.target.value) || 0)} /></td>
                        <td><Input className="h-8" type="number" value={draft.unpaidLeaveHours} onChange={(e) => updateTimesheetDraft(employee.id, 'unpaidLeaveHours', Number(e.target.value) || 0)} /></td>
                        <td><Input className="h-8 min-w-[160px]" value={draft.managerComment} onChange={(e) => updateTimesheetDraft(employee.id, 'managerComment', e.target.value)} /></td>
                        <td>{currency(grossPreview, employee.currency)}</td>
                        <td><StatusBadge value={status} /></td>
                        <td>
                          <div className="flex min-w-[240px] flex-wrap gap-2">
                            <button className="rounded bg-white/10 px-2 py-1" onClick={() => void persistTimesheet(employee.id)}>Save</button>
                            <button className="rounded bg-[#FF6B00]/20 px-2 py-1 text-[#FDBA74]" onClick={() => void persistTimesheet(employee.id, 'submitted')}>Submit</button>
                            <button className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-300" onClick={() => void onReviewTimesheet(employee.id, 'approved')}>Approve</button>
                            <button className="rounded bg-red-500/20 px-2 py-1 text-red-300" onClick={() => void onReviewTimesheet(employee.id, 'rejected')}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {hourlyEmployees.length === 0 ? (
                    <tr>
                      <td className="py-6 text-[#9CA3AF]" colSpan={9}>No hourly or part-time employees are configured.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Salary Employees and Leave" description="Salary staff auto-populate from annual base salary divided by pay periods, with leave balances available for adjustments.">
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {salaryEmployees.map((employee) => {
                const periodsPerYear = payPeriodsPerYear(employee.compensation.payFrequency);
                const gross = employee.compensation.baseSalary / periodsPerYear;
                return (
                  <div key={employee.id} className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3 text-xs text-[#D1D5DB]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">{employee.name}</p>
                        <p className="text-[#9CA3AF]">{employee.position} • {formatLabel(employee.compensation.payFrequency)}</p>
                      </div>
                      <StatusBadge value={employee.status} />
                    </div>
                    <div className="mt-3 space-y-1">
                      <p>Gross per period: {currency(gross, employee.currency)}</p>
                      <p>Annual leave balance: {(employee.leave.ptoAccruedHours - employee.leave.ptoUsedHours + employee.leave.carryoverHours).toFixed(2)} hrs</p>
                      <p>Sick balance: {(employee.leave.sickAccruedHours - employee.leave.sickUsedHours).toFixed(2)} hrs</p>
                      <p>Unpaid leave is handled during payroll preparation for the current period.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === 'processing' ? (
        <div className="space-y-4">
          <SectionCard title="Payroll Period Selection" description="Choose a pay period, payment method, and prepare live payroll calculations.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <div>
                <Label htmlFor="processing-start-date">Start Date</Label>
                <Input id="processing-start-date" type="date" value={periodForm.startDate} onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="processing-end-date">End Date</Label>
                <Input id="processing-end-date" type="date" value={periodForm.endDate} onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="processing-pay-date">Pay Date</Label>
                <Input id="processing-pay-date" type="date" value={periodForm.payDate} onChange={(e) => setPeriodForm({ ...periodForm, payDate: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="processing-frequency">Frequency</Label>
                <select
                  id="processing-frequency"
                  title="Payroll processing frequency"
                  className="h-10 w-full rounded-md border border-[#333] bg-[#0A0A0A] px-2 text-sm"
                  value={periodForm.payFrequency}
                  onChange={(e) => setPeriodForm({ ...periodForm, payFrequency: e.target.value as PayrollPayFrequency })}
                >
                  <option value="weekly">Weekly</option>
                  <option value="bi_weekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <Label htmlFor="processing-method">Payment Method</Label>
                <select
                  id="processing-method"
                  title="Payroll payment method"
                  className="h-10 w-full rounded-md border border-[#333] bg-[#0A0A0A] px-2 text-sm"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PayrollPaymentMethod)}
                >
                  <option value="direct_deposit">Bank Transfer</option>
                  <option value="check">Cheque</option>
                  <option value="paycard">Paycard</option>
                </select>
              </div>
              <div>
                <Label htmlFor="processing-run-selector">Run History</Label>
                <select
                  id="processing-run-selector"
                  title="Payroll run history"
                  className="h-10 w-full rounded-md border border-[#333] bg-[#0A0A0A] px-2 text-sm"
                  value={selectedRun?.id || ''}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                >
                  {runs.map((run) => (
                    <option key={run.id} value={run.id}>{runWorkflowLabel(run)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => void onCalculatePayroll()} className="bg-[#FF6B00] text-white hover:bg-[#E55A00]">
                <Calculator className="mr-2 h-4 w-4" />
                Prepare Payroll
              </Button>
              {selectedRun ? (
                <Button variant="outline" onClick={() => exportReport(`payroll-run-${selectedRun.id}.csv`, selectedRun.lines.map((line) => ({
                  employee: line.employeeName,
                  department: line.department,
                  grossPay: line.grossPay,
                  netPay: line.netPay,
                  deductionTotal: lineDeductionTotal(line),
                  employerContribution: lineEmployerTotal(line),
                  currency: line.currency,
                  paymentMethod: line.paymentMethod,
                  paymentStatus: line.paymentStatus,
                  anomalies: line.anomalyFlags.join('; '),
                })))}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Run Review
                </Button>
              ) : null}
            </div>
          </SectionCard>

          {selectedRun ? (
            <SectionCard title="Pre-Payroll Review" description="Review gross pay, deductions, employer costs, and anomaly flags before finance approval.">
              <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryMetric label="Total Gross" value={currency(selectedRun.totals.gross, overview.config.baseCurrency)} />
                <SummaryMetric label="Total Deductions" value={currency(selectedRun.totals.deductions, overview.config.baseCurrency)} tone="text-amber-400" />
                <SummaryMetric label="Total Net" value={currency(selectedRun.totals.net, overview.config.baseCurrency)} tone="text-emerald-400" />
                <SummaryMetric label="Employer Cost" value={currency(selectedRun.totals.employerCost, overview.config.baseCurrency)} tone="text-[#60A5FA]" />
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF]">
                <span>Period: {selectedRun.period.startDate} to {selectedRun.period.endDate}</span>
                <span>•</span>
                <span>Pay date: {selectedRun.period.payDate}</span>
                <span>•</span>
                <StatusBadge value={selectedRun.status} />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs text-[#D1D5DB]">
                  <thead className="text-[#9CA3AF]">
                    <tr>
                      <th className="pb-2">Employee</th>
                      <th className="pb-2">Gross</th>
                      <th className="pb-2">PAYE</th>
                      <th className="pb-2">Pension + NHF</th>
                      <th className="pb-2">State/LGA</th>
                      <th className="pb-2">Benefits</th>
                      <th className="pb-2">Other</th>
                      <th className="pb-2">Net</th>
                      <th className="pb-2">Employer Cost</th>
                      <th className="pb-2">Anomalies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRun.lines.map((line) => (
                      <tr key={line.employeeId} className="border-t border-[#222] align-top">
                        <td className="py-2">
                          <div className="font-medium text-white">{line.employeeName}</div>
                          <div className="text-[11px] text-[#9CA3AF]">{line.department} • {line.currency}</div>
                        </td>
                        <td>{currency(line.grossPay, line.currency)}</td>
                        <td>{currency(line.deductions.federalWithholding, line.currency)}</td>
                        <td>{currency(line.deductions.socialSecurity + line.deductions.medicare, line.currency)}</td>
                        <td>{currency(line.deductions.stateIncomeTax + line.deductions.localIncomeTax, line.currency)}</td>
                        <td>{currency(line.deductions.healthInsurance + line.deductions.retirement401k, line.currency)}</td>
                        <td>{currency(line.deductions.other + line.deductions.unpaidLeaveAdjustment, line.currency)}</td>
                        <td>{currency(line.netPay, line.currency)}</td>
                        <td>{currency(lineEmployerTotal(line), line.currency)}</td>
                        <td>
                          {line.anomalyFlags.length > 0 ? (
                            <div className="space-y-1">
                              {line.anomalyFlags.map((flag) => (
                                <div key={flag} className="rounded bg-amber-500/10 px-2 py-1 text-amber-300">{flag}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-emerald-400">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      {tab === 'distribution' && selectedRun ? (
        <div className="space-y-4">
          <SectionCard title="Approval Workflow" description="Prepared by finance, reviewed by CFO or finance manager, approved by signatory, then paid.">
            <div className="grid gap-3 lg:grid-cols-4 text-xs">
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                <p className="font-semibold text-white">Prepared</p>
                <p className="mt-1 text-[#9CA3AF]">{selectedRun.preparedBy || '-'}</p>
                <p className="text-[#9CA3AF]">{selectedRun.preparedAt || '-'}</p>
              </div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                <p className="font-semibold text-white">Reviewed</p>
                <p className="mt-1 text-[#9CA3AF]">{selectedRun.reviewedBy || '-'}</p>
                <p className="text-[#9CA3AF]">{selectedRun.reviewedAt || '-'}</p>
              </div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                <p className="font-semibold text-white">Approved</p>
                <p className="mt-1 text-[#9CA3AF]">{selectedRun.approvedBy || '-'}</p>
                <p className="text-[#9CA3AF]">{selectedRun.approvedAt || '-'}</p>
              </div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                <p className="font-semibold text-white">Paid</p>
                <p className="mt-1 text-[#9CA3AF]">{selectedRun.paidAt || '-'}</p>
                <StatusBadge value={selectedRun.status} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void onTransition('review')}>Reviewed by Finance Manager</Button>
              <Button variant="outline" onClick={() => void onTransition('approve')}>Approved by Signatory</Button>
              <Button className="bg-[#FF6B00] text-white hover:bg-[#E55A00]" onClick={() => void onTransition('pay')}>Process Payment</Button>
              <Button variant="outline" onClick={() => void onTransition('lock')}>Lock Payroll</Button>
              <Button variant="outline" onClick={() => void onRetryFailedPayments()}>Retry Failed Payments</Button>
            </div>
          </SectionCard>

          <SectionCard title="Payment Processing" description="Track bank transfers, cheques, and paycards with confirmation and retry handling.">
            <div className="mb-4 grid gap-3 md:grid-cols-3 text-xs">
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                <p className="text-[#9CA3AF]">Selected method</p>
                <p className="mt-1 font-semibold text-white">{paymentMethodLabel(selectedRun.paymentMethod)}</p>
              </div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                <p className="text-[#9CA3AF]">Succeeded</p>
                <p className="mt-1 font-semibold text-emerald-400">{selectedRun.lines.filter((line) => line.paymentStatus === 'succeeded').length}</p>
              </div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                <p className="text-[#9CA3AF]">Failed</p>
                <p className="mt-1 font-semibold text-red-400">{selectedRun.lines.filter((line) => line.paymentStatus === 'failed').length}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-[#D1D5DB]">
                <thead className="text-[#9CA3AF]">
                  <tr>
                    <th className="pb-2">Employee</th>
                    <th className="pb-2">Method</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Reference / Failure Reason</th>
                    <th className="pb-2">Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRun.lines.map((line) => (
                    <tr key={line.employeeId} className="border-t border-[#222]">
                      <td className="py-2">{line.employeeName}</td>
                      <td>{paymentMethodLabel(line.paymentMethod)}</td>
                      <td><StatusBadge value={line.paymentStatus} /></td>
                      <td>
                        {line.paymentStatus === 'failed'
                          ? <span className="text-red-400">{line.failureReason || 'Payment failed'}</span>
                          : (line.paymentReference || '-')}
                      </td>
                      <td>{currency(line.netPay, line.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedRun.achBatchCsv ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Label htmlFor="ach-batch">Bank Transfer Batch Upload File</Label>
                  <Button variant="outline" onClick={() => downloadTextFile(`bank-transfer-batch-${selectedRun.id}.csv`, selectedRun.achBatchCsv || '', 'text/csv;charset=utf-8')}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Bank Batch CSV
                  </Button>
                </div>
                <textarea
                  id="ach-batch"
                  title="Bank transfer batch upload file"
                  readOnly
                  className="mt-1 h-32 w-full rounded-md border border-[#333] bg-[#0A0A0A] p-2 text-xs"
                  value={selectedRun.achBatchCsv}
                />
              </div>
            ) : null}
          </SectionCard>
        </div>
      ) : null}

      {tab === 'stubs' ? (
        <div className="space-y-4">
          <SectionCard title="Payslip Generation" description="Generate Nigeria-format payslips with itemized earnings, statutory deductions, YTD totals, portal access, and printable copies.">
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="min-w-[260px]">
                <Label htmlFor="stub-run-selector">Payroll Run</Label>
                <select
                  id="stub-run-selector"
                  title="Payroll run for payslip generation"
                  className="h-10 w-full rounded-md border border-[#333] bg-[#0A0A0A] px-2 text-sm"
                  value={selectedRun?.id || ''}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                >
                  {runs.map((run) => (
                    <option key={run.id} value={run.id}>{runWorkflowLabel(run)}</option>
                  ))}
                </select>
              </div>
              <Button onClick={() => void onLoadStubs()} className="bg-[#FF6B00] text-white hover:bg-[#E55A00]">Generate Payslips</Button>
              <Button variant="outline" onClick={() => { if (typeof window !== 'undefined') window.print(); }}>Print View</Button>
              <Button variant="outline" onClick={() => exportReport('payslips.csv', stubs.map((stub) => ({
                employeeName: stub.employeeName,
                employeeEmail: stub.employeeEmail,
                payDate: stub.period.payDate,
                paye: stub.deductionSummary.paye,
                pension: stub.deductionSummary.pension,
                nhf: stub.deductionSummary.nhf,
                allowances: stub.earnings.housingAllowance + stub.earnings.transportAllowance + stub.earnings.mealAllowance,
                grossPay: stub.grossPay,
                totalDeductions: stub.deductionSummary.total,
                netPay: stub.netPay,
                paymentMethod: stub.paymentMethod,
                paymentStatus: stub.paymentStatus,
                ytdGross: stub.ytd.gross,
                ytdNet: stub.ytd.net,
                ytdDeductions: stub.ytd.deductionsTotal,
              })))}>
                <Download className="mr-2 h-4 w-4" />
                Export Payslips
              </Button>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              {stubs.map((stub) => (
                <div key={`${stub.runId}_${stub.employeeId}`} className="rounded-lg border border-[#222] bg-[#0A0A0A] p-4 text-xs text-[#D1D5DB]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{stub.employeeName}</p>
                      <p className="text-[#9CA3AF]">{stub.period.startDate} to {stub.period.endDate} • Pay date {stub.period.payDate}</p>
                    </div>
                    <StatusBadge value={stub.paymentStatus} />
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded border border-[#333] p-2">Base Salary: {currency(stub.earnings.basePay, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">Allowance Total: {currency(stub.earnings.housingAllowance + stub.earnings.transportAllowance + stub.earnings.mealAllowance, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">Gross Pay: {currency(stub.grossPay, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">Net Pay: {currency(stub.netPay, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">PAYE: {currency(stub.deductionSummary.paye, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">Employee Pension: {currency(stub.deductionSummary.pension, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">NHF: {currency(stub.deductionSummary.nhf, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">State + LGA: {currency(stub.deductionSummary.stateLevy + stub.deductionSummary.localLevy, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">Health + Other: {currency(stub.deductionSummary.healthInsurance + stub.deductionSummary.other + stub.deductionSummary.unpaidLeaveAdjustment + stub.deductionSummary.voluntaryRetirement, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">Total Deductions: {currency(stub.deductionSummary.total, stub.currency)}</div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded border border-[#333] p-2">YTD Gross: {currency(stub.ytd.gross, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">YTD Net: {currency(stub.ytd.net, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">YTD Total Deductions: {currency(stub.ytd.deductionsTotal, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">YTD Voluntary Retirement: {currency(stub.ytd.retirement401k, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">Employer Statutory Cost: {currency(stub.employerContributionSummary.total, stub.currency)}</div>
                    <div className="rounded border border-[#333] p-2">Payment Method: {paymentMethodLabel(stub.paymentMethod)}</div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => printStub(stub)}>Download Payslip</Button>
                    <Button variant="outline" onClick={() => emailStub(stub)} disabled={!stub.employeeEmail}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email Employee
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {stubs.length === 0 ? <p className="text-xs text-[#9CA3AF]">Generate payslips for a paid or approved payroll run to populate employee portal access.</p> : null}
          </SectionCard>
        </div>
      ) : null}

      {tab === 'tax' ? (
        <div className="space-y-4">
          <SectionCard title="Tax Compliance and Filing" description="PAYE, pension, statutory remittance, and annual employee tax-card visibility with tax-year close controls.">
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="w-full max-w-[220px]">
                <Label htmlFor="tax-year-selector">Tax Year</Label>
                <Input id="tax-year-selector" type="number" value={selectedTaxYear} onChange={(e) => setSelectedTaxYear(Number(e.target.value) || new Date().getFullYear())} />
              </div>
              <div className="w-full max-w-[220px]">
                <Label htmlFor="compliance-month-selector">Compliance Month</Label>
                <Input id="compliance-month-selector" type="month" value={complianceMonth} onChange={(e) => setComplianceMonth(e.target.value || new Date().toISOString().slice(0, 7))} />
              </div>
              <Button variant="outline" onClick={() => loadAll()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Tax Summary
              </Button>
              <Button variant="outline" onClick={() => void onCloseTaxYear()}>Close Tax Year</Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-xs">
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">Total Wages: {currency(taxSummary.totals.totalWages, overview.config.baseCurrency)}</div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">PAYE Withheld: {currency(taxSummary.totals.payeWithheld ?? taxSummary.totals.federalWithheld, overview.config.baseCurrency)}</div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">Pension + NHF Employee: {currency(taxSummary.totals.employeeStatutory ?? taxSummary.totals.ficaEmployee, overview.config.baseCurrency)}</div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">Pension + NHF Employer: {currency(taxSummary.totals.employerStatutory ?? taxSummary.totals.ficaEmployer, overview.config.baseCurrency)}</div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">State PAYE Withheld: {currency(taxSummary.totals.statePayeWithheld ?? taxSummary.totals.stateWithheld, overview.config.baseCurrency)}</div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">LGA Levy Withheld: {currency(taxSummary.totals.localLevyWithheld ?? taxSummary.totals.localWithheld, overview.config.baseCurrency)}</div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">NSITF: {currency(taxSummary.totals.nsitf ?? taxSummary.totals.futa, overview.config.baseCurrency)}</div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">State Levy: {currency(taxSummary.totals.stateLevy ?? taxSummary.totals.suta, overview.config.baseCurrency)}</div>
            </div>
          </SectionCard>

          <SectionCard title="Monthly Payroll Compliance Calendar" description="PaidHR-style monthly workflow and statutory due dates for payroll compliance.">
            <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3 text-xs">
              {complianceMilestones.map((milestone) => (
                <div key={milestone.id} className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white">{milestone.item}</p>
                    <StatusBadge value={milestone.status} />
                  </div>
                  <p className="mt-1 text-[#9CA3AF]">Due: {milestone.dueDate}</p>
                  <p className="text-[#9CA3AF]">Owner: {milestone.owner}</p>
                </div>
              ))}
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => exportNigeriaRemittanceTemplate('paye')}>Export FIRS PAYE Schedule</Button>
              <Button variant="outline" onClick={() => exportNigeriaRemittanceTemplate('pension')}>Export PENCOM Pension Schedule</Button>
              <Button variant="outline" onClick={() => exportNigeriaRemittanceTemplate('nhf')}>Export NHF Schedule</Button>
            </div>

            {complianceCalendarAlerts.length > 0 ? (
              <div className="space-y-2 text-xs text-amber-300">
                {complianceCalendarAlerts.map((alert) => (
                  <div key={alert} className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">{alert}</div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-400">No urgent compliance deadlines for the selected month.</p>
            )}
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard title="Quarterly PAYE Remittance" description="Quarterly PAYE liabilities for review and remittance planning.">
              <div className="space-y-2 text-xs">
                {(taxSummary.quarterlyPayeRemittance ?? taxSummary.quarterly941).map((quarter) => (
                  <div key={quarter.quarter} className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3 flex items-center justify-between gap-2">
                    <span>Q{quarter.quarter} • {quarter.form}</span>
                    <span className="font-medium text-white">{currency(Number(quarter.payeLiability ?? quarter.federalLiability ?? 0), overview.config.baseCurrency)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Annual Payroll Close" description="Employee annual tax-card visibility and contractor payment summaries for year-end close.">
              <div className="grid gap-2 sm:grid-cols-3 text-xs">
                <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">Employee annual tax cards: {(taxSummary.annualEmployeeTaxCards ?? taxSummary.annual.w2).length}</div>
                <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">Consolidated PAYE batches: {taxSummary.annual.w3TransmittalCount}</div>
                <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">Contractor payment records: {(taxSummary.annualContractorPayments ?? taxSummary.annual.form1099).length}</div>
              </div>

              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-white">Employee Annual Tax Records</p>
                <div className="space-y-2 text-xs">
                  {(taxSummary.annualEmployeeTaxCards ?? taxSummary.annual.w2).map((item) => (
                    <div key={item.employeeId} className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3 flex items-center justify-between gap-2">
                      <span>{item.employeeName}</span>
                      <span>{currency(Number(item.annualTaxablePay ?? item.wages ?? 0), overview.config.baseCurrency)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-white">Contractor Payment Records</p>
                <div className="space-y-2 text-xs">
                  {(taxSummary.annualContractorPayments ?? taxSummary.annual.form1099).length === 0 ? <p className="text-[#9CA3AF]">No contractor records in this tax year.</p> : null}
                  {(taxSummary.annualContractorPayments ?? taxSummary.annual.form1099).map((item) => (
                    <div key={item.employeeId} className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3 flex items-center justify-between gap-2">
                      <span>{item.employeeName}</span>
                      <span>{currency(Number(item.contractAmount ?? item.nonEmployeeCompensation ?? 0), overview.config.baseCurrency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          </div>

          {taxSummary.alerts.length > 0 ? (
            <SectionCard title="Compliance Alerts" description="Outstanding filing and remittance items.">
              <div className="space-y-2 text-xs text-amber-300">
                {taxSummary.alerts.map((alert) => (
                  <div key={alert} className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">{alert}</div>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      {tab === 'reports' ? (
        <div className="space-y-4">
          <SectionCard title="Payroll Reports" description="Register, summary, deductions, labor cost, tax liability, contractor reporting, and GL entries.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-xs">
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">Register rows: {reports.payrollRegister.length}</div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">Summary rows: {reports.payrollSummary.length}</div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">Deduction rows: {reports.deductionReport.length}</div>
              <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">GL entries: {reports.accountingEntries.length}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => exportReport('payroll-register.csv', reports.payrollRegister)}><Download className="mr-2 h-4 w-4" />Export Register</Button>
              <Button variant="outline" onClick={() => exportReport('payroll-summary.csv', reports.payrollSummary)}><Download className="mr-2 h-4 w-4" />Export Summary</Button>
              <Button variant="outline" onClick={() => exportReport('deduction-report.csv', reports.deductionReport)}><Download className="mr-2 h-4 w-4" />Export Deductions</Button>
              <Button variant="outline" onClick={() => exportReport('gl-entries.csv', reports.accountingEntries)}><Download className="mr-2 h-4 w-4" />Export GL Entries</Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => exportNigeriaRemittanceTemplate('paye')}>PAYE Remittance CSV</Button>
              <Button variant="outline" onClick={() => exportNigeriaRemittanceTemplate('pension')}>Pension Remittance CSV</Button>
              <Button variant="outline" onClick={() => exportNigeriaRemittanceTemplate('nhf')}>NHF Remittance CSV</Button>
              <Button variant="outline" size="sm" onClick={() => exportBankPayrollFile('gtbank')}><Download className="mr-1 h-3 w-3" />GTBank Upload</Button>
              <Button variant="outline" size="sm" onClick={() => exportBankPayrollFile('access')}><Download className="mr-1 h-3 w-3" />Access Bank Upload</Button>
              <Button variant="outline" size="sm" onClick={() => exportBankPayrollFile('uba')}><Download className="mr-1 h-3 w-3" />UBA Upload</Button>
              <Button variant="outline" size="sm" onClick={() => exportBankPayrollFile('zenith')}><Download className="mr-1 h-3 w-3" />Zenith Bank Upload</Button>
              <Button variant="outline" size="sm" onClick={() => exportBankPayrollFile('firstbank')}><Download className="mr-1 h-3 w-3" />First Bank Upload</Button>
              <Button variant="outline" size="sm" onClick={() => exportBankPayrollFile('fidelity')}><Download className="mr-1 h-3 w-3" />Fidelity Bank Upload</Button>
            </div>
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard title="Payroll Summary" description="Processed runs with gross, deduction, net, and employer cost totals.">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs text-[#D1D5DB]">
                  <thead className="text-[#9CA3AF]">
                    <tr>
                      <th className="pb-2">Pay Date</th>
                      <th className="pb-2">Gross</th>
                      <th className="pb-2">Deductions</th>
                      <th className="pb-2">Net</th>
                      <th className="pb-2">Employer Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.payrollSummary.map((row, index) => {
                      const item = row as Record<string, unknown>;
                      return (
                        <tr key={index} className="border-t border-[#222]">
                          <td className="py-2">{String(item.payDate || '-')}</td>
                          <td>{currency(Number(item.gross || 0), overview.config.baseCurrency)}</td>
                          <td>{currency(Number(item.deductions || 0), overview.config.baseCurrency)}</td>
                          <td>{currency(Number(item.net || 0), overview.config.baseCurrency)}</td>
                          <td>{currency(Number(item.employerCost || 0), overview.config.baseCurrency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Labor Cost Analysis" description="Payroll cost by department for workforce planning and revenue analysis.">
              <div className="space-y-2 text-xs">
                {reports.laborCostAnalysis.map((row, index) => {
                  const item = row as Record<string, unknown>;
                  return (
                    <div key={index} className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-white">{String(item.department || 'N/A')}</span>
                        <span>{currency(Number(item.payrollCostBaseCurrency || 0), overview.config.baseCurrency)}</span>
                      </div>
                      <p className="mt-1 text-[#9CA3AF]">Employees: {String(item.employees || 0)}</p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard title="Deduction Report" description="PAYE, pension, NHF, levies, benefits, and other deductions across processed payroll.">
              <div className="space-y-2 text-xs max-h-[420px] overflow-y-auto pr-1">
                {reports.deductionReport.map((row, index) => {
                  const item = row as Record<string, unknown>;
                  return (
                    <div key={index} className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                      <p className="font-medium text-white">{String(item.employeeName || '-')}</p>
                      <p className="mt-1">PAYE: {currency(Number(item.federal || 0), String(item.currency || overview.config.baseCurrency))}</p>
                      <p>Pension + NHF: {currency(Number(item.fica || 0), String(item.currency || overview.config.baseCurrency))}</p>
                      <p>State PAYE: {currency(Number(item.state || 0), String(item.currency || overview.config.baseCurrency))}</p>
                      <p>LGA Levy: {currency(Number(item.local || 0), String(item.currency || overview.config.baseCurrency))}</p>
                      <p>Benefits: {currency(Number(item.benefits || 0), String(item.currency || overview.config.baseCurrency))}</p>
                      <p>Other: {currency(Number(item.other || 0), String(item.currency || overview.config.baseCurrency))}</p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Payroll Tax Liability" description="Current year wages and payroll remittance liabilities from processed payroll.">
              <div className="space-y-2 text-xs">
                <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">Total wages: {currency(reports.payrollTaxLiability.totals.totalWages, overview.config.baseCurrency)}</div>
                <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">PAYE withheld: {currency(reports.payrollTaxLiability.totals.payeWithheld ?? reports.payrollTaxLiability.totals.federalWithheld, overview.config.baseCurrency)}</div>
                <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">Employee Pension + NHF: {currency(reports.payrollTaxLiability.totals.employeeStatutory ?? reports.payrollTaxLiability.totals.ficaEmployee, overview.config.baseCurrency)}</div>
                <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">Employer Pension + NHF: {currency(reports.payrollTaxLiability.totals.employerStatutory ?? reports.payrollTaxLiability.totals.ficaEmployer, overview.config.baseCurrency)}</div>
                <div className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">NSITF + State Levy: {currency((reports.payrollTaxLiability.totals.nsitf ?? reports.payrollTaxLiability.totals.futa) + (reports.payrollTaxLiability.totals.stateLevy ?? reports.payrollTaxLiability.totals.suta), overview.config.baseCurrency)}</div>
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SectionCard title="Contractor Annual Report" description="Non-employee compensation for contractors and freelancers.">
              <div className="space-y-2 text-xs">
                {(reports.contractorPayments ?? reports.contractor1099).length === 0 ? <p className="text-[#9CA3AF]">No contractor liabilities yet.</p> : null}
                {(reports.contractorPayments ?? reports.contractor1099).map((row, index) => {
                  const item = row as Record<string, unknown>;
                  return (
                    <div key={index} className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3 flex items-center justify-between gap-2">
                      <span>{String(item.employeeName || '-')}</span>
                      <span>{currency(Number(item.contractAmount ?? item.nonEmployeeCompensation ?? 0), overview.config.baseCurrency)}</span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Payroll Accounting Entries" description="Auto-generated GL entries for payroll expense, taxes, benefits, and retirement liabilities.">
              <div className="space-y-2 text-xs max-h-[420px] overflow-y-auto pr-1">
                {reports.accountingEntries.map((row, index) => {
                  const item = row as Record<string, unknown>;
                  const debit = (item.debit || {}) as Record<string, unknown>;
                  const credit = (item.credit || {}) as Record<string, unknown>;
                  return (
                    <div key={index} className="rounded-lg border border-[#222] bg-[#0A0A0A] p-3">
                      <p className="font-medium text-white">Run {String(item.runId || '-')}</p>
                      <p className="mt-1 text-[#9CA3AF]">Period: {String(item.period || '-')}</p>
                      <p className="mt-2 text-white">Debit</p>
                      <p>Payroll Expense: {currency(Number(debit.payrollExpense || 0), overview.config.baseCurrency)}</p>
                      <p>Payroll Tax Expense: {currency(Number(debit.payrollTaxExpense || 0), overview.config.baseCurrency)}</p>
                      <p className="mt-2 text-white">Credit</p>
                      <p>Cash / Bank: {currency(Number(credit.cashBank || 0), overview.config.baseCurrency)}</p>
                      <p>Tax Payable: {currency(Number(credit.taxPayable || 0), overview.config.baseCurrency)}</p>
                      <p>Benefits Payable: {currency(Number(credit.benefitsPayable || 0), overview.config.baseCurrency)}</p>
                      <p>Retirement Payable: {currency(Number(credit.retirementPayable || 0), overview.config.baseCurrency)}</p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}