import * as kv from './kv_store.tsx';

export type EmployeeStatus = 'active' | 'inactive' | 'on_leave';
export type EmploymentType = 'full_time' | 'part_time' | 'contractor';
export type PayFrequency = 'weekly' | 'bi_weekly' | 'monthly';
export type FilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type PayrollRunStatus = 'draft' | 'prepared' | 'reviewed' | 'approved' | 'paid' | 'locked';
export type PaymentMethod = 'direct_deposit' | 'check' | 'paycard';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed';

export interface PayrollEmployee {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  position: string;
  status: EmployeeStatus;
  hireDate: string;
  salary: number;
  lastPayDate?: string;
  currency: string;
  personalInfo: {
    email: string;
    phone: string;
    address: string;
    taxId: string;
    emergencyContact: string;
  };
  employmentDetails: {
    manager: string;
    employmentType: EmploymentType;
  };
  compensation: {
    baseSalary: number;
    hourlyRate: number;
    payFrequency: PayFrequency;
  };
  taxInfo: {
    filingStatus: FilingStatus;
    w4Withholding: number;
    state: string;
    localTaxRate: number;
    federalRateOverride?: number;
    stateRateOverride?: number;
  };
  benefits: {
    healthInsurance: number;
    healthInsuranceEmployer: number;
    housingAllowance: number;
    transportAllowance: number;
    mealAllowance: number;
    pensionEmployeePercent: number;
    nhfEmployeePercent: number;
    retirement401kEnabled: boolean;
    retirement401kPercent: number;
    retirement401kEmployerMatchPercent: number;
    otherDeductions: number;
  };
  directDeposit: {
    bankName: string;
    accountNumberMasked: string;
    routingNumberMasked: string;
  };
  leave: {
    ptoAccruedHours: number;
    ptoUsedHours: number;
    sickAccruedHours: number;
    sickUsedHours: number;
    carryoverHours: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PayrollConfig {
  baseCurrency: string;
  supportedCurrencies: string[];
  exchangeRates: Record<string, number>;
  payFrequencies: PayFrequency[];
  taxRates: {
    federalIncomeTaxRate: number;
    socialSecurityRateEmployee: number;
    socialSecurityRateEmployer: number;
    medicareRateEmployee: number;
    medicareRateEmployer: number;
    futaRateEmployer: number;
    sutaRateByState: Record<string, number>;
    stateIncomeRateByState: Record<string, number>;
    payeRateDefault?: number;
    pensionRateEmployee?: number;
    pensionRateEmployer?: number;
    nhfRateEmployee?: number;
    nhfRateEmployer?: number;
    nsitfRateEmployer?: number;
    stateLevyRateByState?: Record<string, number>;
  };
  deductions: {
    standardDeduction: number;
    personalExemption: number;
  };
  wageRules: {
    overtimeMultiplier: number;
    overtimeAfterHours: number;
    minWageByState: Record<string, number>;
  };
  taxYearClosed: number[];
  updatedAt: string;
}

export interface PayrollPeriod {
  id: string;
  startDate: string;
  endDate: string;
  payDate: string;
  payFrequency: PayFrequency;
}

export interface TimesheetRecord {
  id: string;
  periodId: string;
  employeeId: string;
  regularHours: number;
  overtimeHours: number;
  paidTimeOffHours: number;
  unpaidLeaveHours: number;
  status: TimesheetStatus;
  managerComment?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollLine {
  employeeId: string;
  employeeName: string;
  department: string;
  currency: string;
  grossPay: number;
  deductions: {
    federalWithholding: number;
    socialSecurity: number;
    medicare: number;
    stateIncomeTax: number;
    localIncomeTax: number;
    healthInsurance: number;
    retirement401k: number;
    other: number;
    unpaidLeaveAdjustment: number;
  };
  employerContribution: {
    socialSecurity: number;
    medicare: number;
    futa: number;
    suta: number;
    healthInsurance: number;
    retirement401kMatch: number;
  };
  netPay: number;
  anomalyFlags: string[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  failureReason?: string;
}

export interface PayrollRun {
  id: string;
  period: PayrollPeriod;
  status: PayrollRunStatus;
  preparedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  preparedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  lines: PayrollLine[];
  totals: {
    gross: number;
    deductions: number;
    net: number;
    employerCost: number;
  };
  paymentMethod: PaymentMethod;
  achBatchCsv?: string;
  createdAt: string;
  updatedAt: string;
}

interface PayrollState {
  employees: PayrollEmployee[];
  config: PayrollConfig;
  timesheets: TimesheetRecord[];
  runs: PayrollRun[];
}

const KEY = 'payroll:state:v1';

function nowIso() {
  return new Date().toISOString();
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function generateId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function getPayPeriodsPerYear(frequency: PayFrequency) {
  if (frequency === 'weekly') return 52;
  if (frequency === 'bi_weekly') return 26;
  return 12;
}

function asRate(value: number | undefined | null, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric <= 0) return 0;
  return numeric > 1 ? numeric / 100 : numeric;
}

function nigeriaConsolidatedRelief(grossAnnual: number) {
  return Math.max(200_000, grossAnnual * 0.01) + (grossAnnual * 0.2);
}

function nigeriaAnnualPaye(taxableAnnual: number) {
  const bands = [
    { width: 300_000, rate: 0.07 },
    { width: 300_000, rate: 0.11 },
    { width: 500_000, rate: 0.15 },
    { width: 500_000, rate: 0.19 },
    { width: 1_600_000, rate: 0.21 },
  ];

  let remaining = Math.max(0, taxableAnnual);
  let tax = 0;
  for (const band of bands) {
    if (remaining <= 0) break;
    const taxableAtBand = Math.min(remaining, band.width);
    tax += taxableAtBand * band.rate;
    remaining -= taxableAtBand;
  }

  if (remaining > 0) {
    tax += remaining * 0.24;
  }

  return tax;
}

function isLegacyUsConfig(config?: Partial<PayrollConfig> | null) {
  return Boolean(
    config
    && String(config.baseCurrency || '').toUpperCase() === 'USD'
    && Number(config.deductions?.standardDeduction || 0) === 14_600
    && Number(config.taxRates?.socialSecurityRateEmployee || 0) === 0.062
  );
}

function defaultConfig(): PayrollConfig {
  return {
    baseCurrency: 'NGN',
    supportedCurrencies: ['NGN', 'USD', 'GBP', 'EUR'],
    exchangeRates: {
      NGN: 1,
      USD: 0.00069,
      GBP: 0.00054,
      EUR: 0.00063,
    },
    payFrequencies: ['weekly', 'bi_weekly', 'monthly'],
    taxRates: {
      federalIncomeTaxRate: 0,
      socialSecurityRateEmployee: 0.08,
      socialSecurityRateEmployer: 0.1,
      medicareRateEmployee: 0.025,
      medicareRateEmployer: 0,
      futaRateEmployer: 0.01,
      sutaRateByState: {
        AB: 0,
        FC: 0,
        LA: 0,
        OG: 0,
        RI: 0,
      },
      stateIncomeRateByState: {
        AB: 0,
        FC: 0,
        LA: 0,
        OG: 0,
        RI: 0,
      },
      payeRateDefault: 0,
      pensionRateEmployee: 0.08,
      pensionRateEmployer: 0.1,
      nhfRateEmployee: 0.025,
      nhfRateEmployer: 0,
      nsitfRateEmployer: 0.01,
      stateLevyRateByState: {
        AB: 0,
        FC: 0,
        LA: 0,
        OG: 0,
        RI: 0,
      },
    },
    deductions: {
      standardDeduction: 200_000,
      personalExemption: 0,
    },
    wageRules: {
      overtimeMultiplier: 1.5,
      overtimeAfterHours: 40,
      minWageByState: {
        AB: 400,
        FC: 400,
        LA: 400,
        OG: 400,
        RI: 400,
      },
    },
    taxYearClosed: [],
    updatedAt: nowIso(),
  };
}

function defaultState(): PayrollState {
  return {
    employees: [],
    config: defaultConfig(),
    timesheets: [],
    runs: [],
  };
}

function normalizeConfig(input?: Partial<PayrollConfig> | null): PayrollConfig {
  const defaults = defaultConfig();

  if (!input || isLegacyUsConfig(input)) {
    return {
      ...defaults,
      taxYearClosed: Array.isArray(input?.taxYearClosed) ? input!.taxYearClosed : [],
      updatedAt: input?.updatedAt || defaults.updatedAt,
    };
  }

  return {
    ...defaults,
    ...input,
    baseCurrency: String(input.baseCurrency || defaults.baseCurrency).toUpperCase(),
    supportedCurrencies: Array.isArray(input.supportedCurrencies) && input.supportedCurrencies.length > 0
      ? input.supportedCurrencies.map((currency) => String(currency || '').toUpperCase()).filter(Boolean)
      : defaults.supportedCurrencies,
    exchangeRates: {
      ...defaults.exchangeRates,
      ...(input.exchangeRates || {}),
    },
    payFrequencies: Array.isArray(input.payFrequencies) && input.payFrequencies.length > 0
      ? input.payFrequencies
      : defaults.payFrequencies,
    taxRates: {
      ...defaults.taxRates,
      ...(input.taxRates || {}),
      sutaRateByState: {
        ...defaults.taxRates.sutaRateByState,
        ...(input.taxRates?.sutaRateByState || {}),
      },
      stateIncomeRateByState: {
        ...defaults.taxRates.stateIncomeRateByState,
        ...(input.taxRates?.stateIncomeRateByState || {}),
      },
    },
    deductions: {
      ...defaults.deductions,
      ...(input.deductions || {}),
    },
    wageRules: {
      ...defaults.wageRules,
      ...(input.wageRules || {}),
      minWageByState: {
        ...defaults.wageRules.minWageByState,
        ...(input.wageRules?.minWageByState || {}),
      },
    },
    taxYearClosed: Array.isArray(input.taxYearClosed) ? input.taxYearClosed : [],
    updatedAt: input.updatedAt || defaults.updatedAt,
  };
}

function normalizeEmployee(input: Partial<PayrollEmployee>, defaultCurrency: string): PayrollEmployee {
  return {
    id: String(input.id || generateId('emp')),
    employeeId: String(input.employeeId || ''),
    name: String(input.name || ''),
    department: String(input.department || ''),
    position: String(input.position || ''),
    status: input.status || 'active',
    hireDate: input.hireDate || nowIso().slice(0, 10),
    salary: Number(input.salary || input.compensation?.baseSalary || 0),
    lastPayDate: input.lastPayDate,
    currency: String(input.currency || defaultCurrency).toUpperCase(),
    personalInfo: {
      email: String(input.personalInfo?.email || ''),
      phone: String(input.personalInfo?.phone || ''),
      address: String(input.personalInfo?.address || ''),
      taxId: String(input.personalInfo?.taxId || ''),
      emergencyContact: String(input.personalInfo?.emergencyContact || ''),
    },
    employmentDetails: {
      manager: String(input.employmentDetails?.manager || ''),
      employmentType: input.employmentDetails?.employmentType || 'full_time',
    },
    compensation: {
      baseSalary: Number(input.compensation?.baseSalary || input.salary || 0),
      hourlyRate: Number(input.compensation?.hourlyRate || 0),
      payFrequency: input.compensation?.payFrequency || 'monthly',
    },
    taxInfo: {
      filingStatus: input.taxInfo?.filingStatus || 'single',
      w4Withholding: Number(input.taxInfo?.w4Withholding || 0),
      state: String(input.taxInfo?.state || 'LA').toUpperCase(),
      localTaxRate: Number(input.taxInfo?.localTaxRate || 0),
      federalRateOverride: input.taxInfo?.federalRateOverride,
      stateRateOverride: input.taxInfo?.stateRateOverride,
    },
    benefits: {
      healthInsurance: Number(input.benefits?.healthInsurance || 0),
      healthInsuranceEmployer: Number(input.benefits?.healthInsuranceEmployer || 0),
      housingAllowance: Number(input.benefits?.housingAllowance || 0),
      transportAllowance: Number(input.benefits?.transportAllowance || 0),
      mealAllowance: Number(input.benefits?.mealAllowance || 0),
      pensionEmployeePercent: Number(input.benefits?.pensionEmployeePercent || 0),
      nhfEmployeePercent: Number(input.benefits?.nhfEmployeePercent || 0),
      retirement401kEnabled: Boolean(input.benefits?.retirement401kEnabled),
      retirement401kPercent: Number(input.benefits?.retirement401kPercent || 0),
      retirement401kEmployerMatchPercent: Number(input.benefits?.retirement401kEmployerMatchPercent || 0),
      otherDeductions: Number(input.benefits?.otherDeductions || 0),
    },
    directDeposit: {
      bankName: String(input.directDeposit?.bankName || ''),
      accountNumberMasked: String(input.directDeposit?.accountNumberMasked || ''),
      routingNumberMasked: String(input.directDeposit?.routingNumberMasked || ''),
    },
    leave: {
      ptoAccruedHours: Number(input.leave?.ptoAccruedHours || 0),
      ptoUsedHours: Number(input.leave?.ptoUsedHours || 0),
      sickAccruedHours: Number(input.leave?.sickAccruedHours || 0),
      sickUsedHours: Number(input.leave?.sickUsedHours || 0),
      carryoverHours: Number(input.leave?.carryoverHours || 0),
    },
    createdAt: input.createdAt || nowIso(),
    updatedAt: input.updatedAt || nowIso(),
  };
}

function normalizeState(value: Partial<PayrollState> | null | undefined): PayrollState {
  const config = normalizeConfig(value?.config);
  return {
    employees: Array.isArray(value?.employees)
      ? value!.employees.map((employee) => normalizeEmployee(employee, config.baseCurrency))
      : [],
    config,
    timesheets: Array.isArray(value?.timesheets) ? value!.timesheets as TimesheetRecord[] : [],
    runs: Array.isArray(value?.runs) ? value!.runs as PayrollRun[] : [],
  };
}

async function loadState(): Promise<PayrollState> {
  const value = await kv.get(KEY);
  if (!value) {
    const state = defaultState();
    await kv.set(KEY, state);
    return state;
  }
  return normalizeState(value as PayrollState);
}

async function saveState(state: PayrollState) {
  await kv.set(KEY, state);
}

function taxRateForEmployee(config: PayrollConfig, employee: PayrollEmployee) {
  const state = employee.taxInfo.state;
  const payeOverrideRate = typeof employee.taxInfo.federalRateOverride === 'number'
    ? asRate(employee.taxInfo.federalRateOverride, 0)
    : undefined;
  const stateRate = asRate(employee.taxInfo.stateRateOverride ?? config.taxRates.stateIncomeRateByState[state] ?? 0, 0);
  const local = asRate(employee.taxInfo.localTaxRate || 0, 0);
  return { payeOverrideRate, stateRate, local };
}

function toBaseCurrency(config: PayrollConfig, amount: number, currency: string) {
  const rate = config.exchangeRates[currency] || 1;
  return amount / rate;
}

function fromBaseCurrency(config: PayrollConfig, amountBase: number, currency: string) {
  const rate = config.exchangeRates[currency] || 1;
  return amountBase * rate;
}

function getTimesheetForPeriod(timesheets: TimesheetRecord[], periodId: string, employeeId: string) {
  return timesheets.find((item) => item.periodId === periodId && item.employeeId === employeeId) ?? null;
}

function ensurePeriod(startDate: string, endDate: string, payDate: string, payFrequency: PayFrequency): PayrollPeriod {
  return {
    id: `${startDate}_${endDate}_${payFrequency}`,
    startDate,
    endDate,
    payDate,
    payFrequency,
  };
}

function deductionTotal(deductions: PayrollLine['deductions']) {
  return deductions.federalWithholding
    + deductions.socialSecurity
    + deductions.medicare
    + deductions.stateIncomeTax
    + deductions.localIncomeTax
    + deductions.healthInsurance
    + deductions.retirement401k
    + deductions.other
    + deductions.unpaidLeaveAdjustment;
}

function employerContributionTotal(employerContribution: PayrollLine['employerContribution']) {
  return employerContribution.socialSecurity
    + employerContribution.medicare
    + employerContribution.futa
    + employerContribution.suta
    + employerContribution.healthInsurance
    + employerContribution.retirement401kMatch;
}

function buildPayrollLine(state: PayrollState, employee: PayrollEmployee, period: PayrollPeriod): PayrollLine {
  const { config, timesheets } = state;
  const timesheet = getTimesheetForPeriod(timesheets, period.id, employee.id);
  const anomalyFlags: string[] = [];

  const currency = employee.currency || config.baseCurrency;
  const payPeriodsPerYear = getPayPeriodsPerYear(employee.compensation.payFrequency);
  const annualBaseSalaryBase = toBaseCurrency(config, employee.compensation.baseSalary || 0, currency);
  const baseSalaryPerPeriodBase = annualBaseSalaryBase / payPeriodsPerYear;
  const housingAllowanceBase = toBaseCurrency(config, employee.benefits.housingAllowance || 0, currency);
  const transportAllowanceBase = toBaseCurrency(config, employee.benefits.transportAllowance || 0, currency);
  const mealAllowanceBase = toBaseCurrency(config, employee.benefits.mealAllowance || 0, currency);
  const fixedAllowancesBase = housingAllowanceBase + transportAllowanceBase + mealAllowanceBase;

  let grossPayBase = 0;
  let unpaidLeaveAdjustmentBase = 0;

  if (employee.employmentDetails.employmentType === 'full_time') {
    grossPayBase = baseSalaryPerPeriodBase + fixedAllowancesBase;

    if (timesheet?.unpaidLeaveHours && timesheet.unpaidLeaveHours > 0) {
      const hourlyBase = annualBaseSalaryBase / 2080;
      unpaidLeaveAdjustmentBase = timesheet.unpaidLeaveHours * hourlyBase;
    }
  } else {
    if (!timesheet) {
      anomalyFlags.push('Missing timesheet');
    }
    const reg = timesheet?.regularHours ?? 0;
    const ot = timesheet?.overtimeHours ?? 0;
    const pto = timesheet?.paidTimeOffHours ?? 0;
    const hourlyBase = toBaseCurrency(config, employee.compensation.hourlyRate || 0, currency);
    grossPayBase = ((reg + pto) * hourlyBase) + (ot * hourlyBase * config.wageRules.overtimeMultiplier) + fixedAllowancesBase;

    const minWage = config.wageRules.minWageByState[employee.taxInfo.state] ?? 0;
    if (hourlyBase < minWage) anomalyFlags.push('Hourly rate below state minimum wage');
    if (ot > 20) anomalyFlags.push('Unusually high overtime');
    if (timesheet && timesheet.status !== 'approved') anomalyFlags.push('Timesheet not approved');
  }

  if (grossPayBase < 0) grossPayBase = 0;

  const taxRates = taxRateForEmployee(config, employee);
  const pensionableBase = baseSalaryPerPeriodBase + housingAllowanceBase + transportAllowanceBase;
  const employeePensionRate = asRate(employee.benefits.pensionEmployeePercent, asRate(config.taxRates.socialSecurityRateEmployee, 0));
  const employeeNhfRate = asRate(employee.benefits.nhfEmployeePercent, asRate(config.taxRates.medicareRateEmployee, 0));
  const annualGrossBase = grossPayBase * payPeriodsPerYear;
  const ssEmp = pensionableBase * employeePensionRate;
  const medEmp = baseSalaryPerPeriodBase * employeeNhfRate;
  const annualTaxableBase = Math.max(
    0,
    annualGrossBase
      - nigeriaConsolidatedRelief(annualGrossBase)
      - (ssEmp * payPeriodsPerYear)
      - (medEmp * payPeriodsPerYear),
  );
  const federal = typeof taxRates.payeOverrideRate === 'number'
    ? grossPayBase * taxRates.payeOverrideRate
    : nigeriaAnnualPaye(annualTaxableBase) / payPeriodsPerYear;
  const stateTax = grossPayBase * taxRates.stateRate;
  const localTax = grossPayBase * taxRates.local;
  const health = toBaseCurrency(config, employee.benefits.healthInsurance || 0, currency);
  const retirement = employee.benefits.retirement401kEnabled
    ? grossPayBase * asRate(employee.benefits.retirement401kPercent, 0)
    : 0;
  const other = toBaseCurrency(config, employee.benefits.otherDeductions || 0, currency);

  const totalDeductionsBase = federal + ssEmp + medEmp + stateTax + localTax + health + retirement + other + unpaidLeaveAdjustmentBase;
  const netPayBase = Math.max(0, grossPayBase - totalDeductionsBase);

  const ssEmployer = pensionableBase * asRate(config.taxRates.socialSecurityRateEmployer, 0);
  const medEmployer = baseSalaryPerPeriodBase * asRate(config.taxRates.medicareRateEmployer, 0);
  const futa = grossPayBase * asRate(config.taxRates.futaRateEmployer, 0);
  const sutaRate = asRate(config.taxRates.sutaRateByState[employee.taxInfo.state] ?? 0, 0);
  const suta = grossPayBase * sutaRate;
  const healthEmployer = toBaseCurrency(config, employee.benefits.healthInsuranceEmployer || 0, currency);
  const retirementMatch = employee.benefits.retirement401kEnabled
    ? Math.min(asRate(employee.benefits.retirement401kPercent, 0), asRate(employee.benefits.retirement401kEmployerMatchPercent, 0)) * grossPayBase
    : 0;

  if (employee.status !== 'active') {
    anomalyFlags.push(`Employee status is ${employee.status}`);
  }

  const hasAccount = Boolean(employee.directDeposit.accountNumberMasked);
  const hasRouting = Boolean(employee.directDeposit.routingNumberMasked);
  const bankSet = hasAccount && hasRouting;
  const bankFailureReason = !hasAccount && !hasRouting
    ? 'Missing bank account and routing number'
    : !hasAccount
    ? 'Missing bank account number'
    : !hasRouting
    ? 'Missing routing number'
    : undefined;

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department,
    currency,
    grossPay: round2(fromBaseCurrency(config, grossPayBase, currency)),
    deductions: {
      federalWithholding: round2(fromBaseCurrency(config, federal, currency)),
      socialSecurity: round2(fromBaseCurrency(config, ssEmp, currency)),
      medicare: round2(fromBaseCurrency(config, medEmp, currency)),
      stateIncomeTax: round2(fromBaseCurrency(config, stateTax, currency)),
      localIncomeTax: round2(fromBaseCurrency(config, localTax, currency)),
      healthInsurance: round2(fromBaseCurrency(config, health, currency)),
      retirement401k: round2(fromBaseCurrency(config, retirement, currency)),
      other: round2(fromBaseCurrency(config, other, currency)),
      unpaidLeaveAdjustment: round2(fromBaseCurrency(config, unpaidLeaveAdjustmentBase, currency)),
    },
    employerContribution: {
      socialSecurity: round2(fromBaseCurrency(config, ssEmployer, currency)),
      medicare: round2(fromBaseCurrency(config, medEmployer, currency)),
      futa: round2(fromBaseCurrency(config, futa, currency)),
      suta: round2(fromBaseCurrency(config, suta, currency)),
      healthInsurance: round2(fromBaseCurrency(config, healthEmployer, currency)),
      retirement401kMatch: round2(fromBaseCurrency(config, retirementMatch, currency)),
    },
    netPay: round2(fromBaseCurrency(config, netPayBase, currency)),
    anomalyFlags,
    paymentMethod: bankSet ? 'direct_deposit' : 'check',
    paymentStatus: 'pending',
    failureReason: bankSet ? undefined : bankFailureReason,
  };
}

function runTotals(config: PayrollConfig, lines: PayrollLine[]) {
  let grossBase = 0;
  let deductionsBase = 0;
  let netBase = 0;
  let employerBase = 0;

  for (const line of lines) {
    grossBase += toBaseCurrency(config, line.grossPay, line.currency);
    const lineDeductions = deductionTotal(line.deductions);
    deductionsBase += toBaseCurrency(config, lineDeductions, line.currency);
    netBase += toBaseCurrency(config, line.netPay, line.currency);
    const lineEmployer = employerContributionTotal(line.employerContribution);
    employerBase += toBaseCurrency(config, lineEmployer, line.currency);
  }

  return {
    gross: round2(grossBase),
    deductions: round2(deductionsBase),
    net: round2(netBase),
    employerCost: round2(employerBase),
  };
}

function achCsv(run: PayrollRun) {
  const head = ['Employee', 'Currency', 'Net Pay', 'Method'].join(',');
  const rows = run.lines.map((line) => [line.employeeName, line.currency, line.netPay.toFixed(2), line.paymentMethod].join(','));
  return [head, ...rows].join('\n');
}

export async function getOverview() {
  const state = await loadState();
  const latestRun = state.runs[0] ?? null;
  const pendingTimesheets = state.timesheets.filter((item) => item.status === 'submitted').length;
  const complianceAlerts: string[] = [];

  const now = new Date();
  const quarterEnds = [2, 5, 8, 11];
  if (quarterEnds.includes(now.getMonth()) && now.getDate() > 20) {
    complianceAlerts.push('Quarter-end payroll reconciliation is open. Review PAYE, pension, NHF, and levy remittances before filing.');
  }
  if (!state.config.taxYearClosed?.includes(now.getFullYear() - 1) && now.getMonth() === 0) {
    complianceAlerts.push('Previous payroll year is not closed. Finalize annual tax cards and statutory remittances before locking records.');
  }

  return {
    employees: state.employees,
    config: state.config,
    timesheets: state.timesheets,
    runs: state.runs,
    dashboard: {
      employeeCount: state.employees.length,
      activeEmployees: state.employees.filter((item) => item.status === 'active').length,
      pendingTimesheets,
      lastRunTotals: latestRun?.totals ?? null,
      complianceAlerts,
    },
  };
}

export async function saveConfig(input: Partial<PayrollConfig>) {
  const state = await loadState();
  state.config = {
    ...state.config,
    ...input,
    taxRates: {
      ...state.config.taxRates,
      ...(input.taxRates || {}),
      sutaRateByState: {
        ...state.config.taxRates.sutaRateByState,
        ...(input.taxRates?.stateLevyRateByState || {}),
        ...(input.taxRates?.sutaRateByState || {}),
      },
      stateIncomeRateByState: {
        ...state.config.taxRates.stateIncomeRateByState,
        ...(input.taxRates?.stateIncomeRateByState || {}),
      },
      stateLevyRateByState: {
        ...(state.config.taxRates.stateLevyRateByState || state.config.taxRates.sutaRateByState),
        ...(input.taxRates?.sutaRateByState || {}),
        ...(input.taxRates?.stateLevyRateByState || {}),
      },
    },
    deductions: {
      ...state.config.deductions,
      ...(input.deductions || {}),
    },
    wageRules: {
      ...state.config.wageRules,
      ...(input.wageRules || {}),
      minWageByState: {
        ...state.config.wageRules.minWageByState,
        ...(input.wageRules?.minWageByState || {}),
      },
    },
    updatedAt: nowIso(),
  };
  await saveState(state);
  return state.config;
}

export async function upsertEmployee(input: Partial<PayrollEmployee> & { id?: string }) {
  const state = await loadState();
  const now = nowIso();

  if (!input.name || !input.employeeId || !input.department || !input.position || !input.hireDate) {
    throw new Error('name, employeeId, department, position, and hireDate are required');
  }

  if (input.id) {
    const index = state.employees.findIndex((item) => item.id === input.id);
    if (index === -1) throw new Error('Employee not found');
    const current = state.employees[index];
    state.employees[index] = {
      ...current,
      ...input,
      personalInfo: { ...current.personalInfo, ...(input.personalInfo || {}) },
      employmentDetails: { ...current.employmentDetails, ...(input.employmentDetails || {}) },
      compensation: { ...current.compensation, ...(input.compensation || {}) },
      taxInfo: { ...current.taxInfo, ...(input.taxInfo || {}) },
      benefits: { ...current.benefits, ...(input.benefits || {}) },
      directDeposit: { ...current.directDeposit, ...(input.directDeposit || {}) },
      leave: { ...current.leave, ...(input.leave || {}) },
      updatedAt: now,
    };
  } else {
    const created: PayrollEmployee = {
      id: generateId('emp'),
      employeeId: input.employeeId,
      name: input.name,
      department: input.department,
      position: input.position,
      status: input.status || 'active',
      hireDate: input.hireDate,
      salary: input.salary || input.compensation?.baseSalary || 0,
      lastPayDate: input.lastPayDate,
      currency: input.currency || state.config.baseCurrency,
      personalInfo: {
        email: input.personalInfo?.email || '',
        phone: input.personalInfo?.phone || '',
        address: input.personalInfo?.address || '',
        taxId: input.personalInfo?.taxId || '',
        emergencyContact: input.personalInfo?.emergencyContact || '',
      },
      employmentDetails: {
        manager: input.employmentDetails?.manager || '',
        employmentType: input.employmentDetails?.employmentType || 'full_time',
      },
      compensation: {
        baseSalary: input.compensation?.baseSalary || input.salary || 0,
        hourlyRate: input.compensation?.hourlyRate || 0,
        payFrequency: input.compensation?.payFrequency || 'monthly',
      },
      taxInfo: {
        filingStatus: input.taxInfo?.filingStatus || 'single',
        w4Withholding: input.taxInfo?.w4Withholding || 0,
        state: input.taxInfo?.state || 'LA',
        localTaxRate: input.taxInfo?.localTaxRate || 0,
        federalRateOverride: input.taxInfo?.federalRateOverride,
        stateRateOverride: input.taxInfo?.stateRateOverride,
      },
      benefits: {
        healthInsurance: input.benefits?.healthInsurance || 0,
        healthInsuranceEmployer: input.benefits?.healthInsuranceEmployer || 0,
        housingAllowance: input.benefits?.housingAllowance || 0,
        transportAllowance: input.benefits?.transportAllowance || 0,
        mealAllowance: input.benefits?.mealAllowance || 0,
        pensionEmployeePercent: input.benefits?.pensionEmployeePercent || 0,
        nhfEmployeePercent: input.benefits?.nhfEmployeePercent || 0,
        retirement401kEnabled: input.benefits?.retirement401kEnabled || false,
        retirement401kPercent: input.benefits?.retirement401kPercent || 0,
        retirement401kEmployerMatchPercent: input.benefits?.retirement401kEmployerMatchPercent || 0,
        otherDeductions: input.benefits?.otherDeductions || 0,
      },
      directDeposit: {
        bankName: input.directDeposit?.bankName || '',
        accountNumberMasked: input.directDeposit?.accountNumberMasked || '',
        routingNumberMasked: input.directDeposit?.routingNumberMasked || '',
      },
      leave: {
        ptoAccruedHours: input.leave?.ptoAccruedHours || 0,
        ptoUsedHours: input.leave?.ptoUsedHours || 0,
        sickAccruedHours: input.leave?.sickAccruedHours || 0,
        sickUsedHours: input.leave?.sickUsedHours || 0,
        carryoverHours: input.leave?.carryoverHours || 0,
      },
      createdAt: now,
      updatedAt: now,
    };
    state.employees.unshift(created);
  }

  await saveState(state);
  return state.employees;
}

export async function saveTimesheet(input: Partial<TimesheetRecord> & {
  periodId: string;
  employeeId: string;
}) {
  const state = await loadState();
  const now = nowIso();
  const index = state.timesheets.findIndex((item) => item.periodId === input.periodId && item.employeeId === input.employeeId);

  if (index >= 0) {
    const current = state.timesheets[index];
    state.timesheets[index] = {
      ...current,
      ...input,
      updatedAt: now,
    } as TimesheetRecord;
  } else {
    state.timesheets.unshift({
      id: generateId('timesheet'),
      periodId: input.periodId,
      employeeId: input.employeeId,
      regularHours: input.regularHours || 0,
      overtimeHours: input.overtimeHours || 0,
      paidTimeOffHours: input.paidTimeOffHours || 0,
      unpaidLeaveHours: input.unpaidLeaveHours || 0,
      status: input.status || 'draft',
      managerComment: input.managerComment,
      submittedAt: input.status === 'submitted' ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  await saveState(state);
  return state.timesheets;
}

export async function reviewTimesheet(periodId: string, employeeId: string, status: 'approved' | 'rejected', approvedBy: string, managerComment?: string) {
  const state = await loadState();
  const item = state.timesheets.find((entry) => entry.periodId === periodId && entry.employeeId === employeeId);
  if (!item) throw new Error('Timesheet not found');
  item.status = status;
  item.managerComment = managerComment;
  item.updatedAt = nowIso();
  if (status === 'approved') {
    item.approvedAt = nowIso();
    item.approvedBy = approvedBy;
  }
  await saveState(state);
  return item;
}

export async function calculateRun(input: {
  startDate: string;
  endDate: string;
  payDate: string;
  payFrequency: PayFrequency;
  paymentMethod?: PaymentMethod;
  preparedBy: string;
}) {
  const state = await loadState();
  const period = ensurePeriod(input.startDate, input.endDate, input.payDate, input.payFrequency);

  const lines = state.employees
    .filter((employee) => employee.status !== 'inactive')
    .map((employee) => buildPayrollLine(state, employee, period));

  const totals = runTotals(state.config, lines);
  const now = nowIso();
  const run: PayrollRun = {
    id: generateId('run'),
    period,
    status: 'prepared',
    preparedBy: input.preparedBy,
    preparedAt: now,
    lines,
    totals,
    paymentMethod: input.paymentMethod || 'direct_deposit',
    createdAt: now,
    updatedAt: now,
  };

  state.runs.unshift(run);
  await saveState(state);
  return run;
}

export async function transitionRun(runId: string, action: 'review' | 'approve' | 'pay' | 'lock', actorId: string, paymentMethod?: PaymentMethod) {
  const state = await loadState();
  const run = state.runs.find((item) => item.id === runId);
  if (!run) throw new Error('Payroll run not found');

  const now = nowIso();
  if (action === 'review') {
    run.status = 'reviewed';
    run.reviewedBy = actorId;
    run.reviewedAt = now;
  }

  if (action === 'approve') {
    run.status = 'approved';
    run.approvedBy = actorId;
    run.approvedAt = now;
  }

  if (action === 'pay') {
    if (run.status !== 'approved') throw new Error('Only approved payroll can be paid');
    run.status = 'paid';
    run.paidAt = now;
    run.paymentMethod = paymentMethod || run.paymentMethod;

    run.lines = run.lines.map((line) => {
      const hasDeposit = line.paymentMethod === 'direct_deposit';
      if (run.paymentMethod === 'check') {
        return {
          ...line,
          paymentMethod: 'check',
          paymentStatus: 'succeeded',
          paymentReference: `CHK-${run.id.slice(-6)}-${line.employeeId.slice(-4)}`,
        };
      }
      if (run.paymentMethod === 'paycard') {
        return {
          ...line,
          paymentMethod: 'paycard',
          paymentStatus: 'succeeded',
          paymentReference: `CARD-${run.id.slice(-6)}-${line.employeeId.slice(-4)}`,
        };
      }

      return {
        ...line,
        paymentMethod: 'direct_deposit',
        paymentStatus: hasDeposit ? 'succeeded' : 'failed',
        paymentReference: hasDeposit
          ? `NIP-${run.id.slice(-6)}-${line.employeeId.slice(-4)}`
          : undefined,
        failureReason: hasDeposit ? undefined : (line.failureReason || 'No bank transfer details on file'),
      };
    });

    run.achBatchCsv = achCsv(run);

    for (const line of run.lines) {
      if (line.paymentStatus === 'succeeded') {
        const employee = state.employees.find((entry) => entry.id === line.employeeId);
        if (employee) {
          employee.lastPayDate = run.period.payDate;
          employee.updatedAt = now;
        }
      }
    }
  }

  if (action === 'lock') {
    run.status = 'locked';
  }

  run.updatedAt = now;
  await saveState(state);
  return run;
}

export async function retryFailedPayments(runId: string) {
  const state = await loadState();
  const run = state.runs.find((item) => item.id === runId);
  if (!run) throw new Error('Payroll run not found');
  if (run.status !== 'paid') throw new Error('Payroll run has not been paid yet');

  run.lines = run.lines.map((line) => {
    if (line.paymentStatus === 'failed') {
      return {
        ...line,
        paymentStatus: 'succeeded',
        paymentReference: `NIPR-${run.id.slice(-6)}-${line.employeeId.slice(-4)}`,
      };
    }
    return line;
  });

  run.achBatchCsv = achCsv(run);
  run.updatedAt = nowIso();
  await saveState(state);
  return run;
}

function ytdForEmployee(runs: PayrollRun[], employeeId: string, year: number, config: PayrollConfig) {
  let grossBase = 0;
  let netBase = 0;
  let fedBase = 0;
  let ssBase = 0;
  let medBase = 0;
  let stateBase = 0;
  let localBase = 0;
  let healthBase = 0;
  let retirementBase = 0;
  let otherBase = 0;
  let unpaidLeaveBase = 0;

  for (const run of runs) {
    if (!run.period.payDate.startsWith(`${year}-`)) continue;
    for (const line of run.lines) {
      if (line.employeeId !== employeeId) continue;
      grossBase += toBaseCurrency(config, line.grossPay, line.currency);
      netBase += toBaseCurrency(config, line.netPay, line.currency);
      fedBase += toBaseCurrency(config, line.deductions.federalWithholding, line.currency);
      ssBase += toBaseCurrency(config, line.deductions.socialSecurity, line.currency);
      medBase += toBaseCurrency(config, line.deductions.medicare, line.currency);
      stateBase += toBaseCurrency(config, line.deductions.stateIncomeTax, line.currency);
      localBase += toBaseCurrency(config, line.deductions.localIncomeTax, line.currency);
      healthBase += toBaseCurrency(config, line.deductions.healthInsurance, line.currency);
      retirementBase += toBaseCurrency(config, line.deductions.retirement401k, line.currency);
      otherBase += toBaseCurrency(config, line.deductions.other, line.currency);
      unpaidLeaveBase += toBaseCurrency(config, line.deductions.unpaidLeaveAdjustment, line.currency);
    }
  }

  return {
    gross: round2(grossBase),
    net: round2(netBase),
    federal: round2(fedBase),
    socialSecurity: round2(ssBase),
    medicare: round2(medBase),
    state: round2(stateBase),
    local: round2(localBase),
    healthInsurance: round2(healthBase),
    retirement401k: round2(retirementBase),
    other: round2(otherBase),
    unpaidLeaveAdjustment: round2(unpaidLeaveBase),
    deductionsTotal: round2(fedBase + ssBase + medBase + stateBase + localBase + healthBase + retirementBase + otherBase + unpaidLeaveBase),
  };
}

export async function getPayStubs(runId: string) {
  const state = await loadState();
  const run = state.runs.find((item) => item.id === runId);
  if (!run) throw new Error('Payroll run not found');

  const year = Number(run.period.payDate.slice(0, 4));

  return run.lines.map((line) => {
    const employee = state.employees.find((item) => item.id === line.employeeId);
    const payFrequency = employee?.compensation.payFrequency || run.period.payFrequency;
    const periodsPerYear = getPayPeriodsPerYear(payFrequency);
    const basePay = employee ? round2((employee.compensation.baseSalary || 0) / periodsPerYear) : round2(Math.max(0, line.grossPay));
    const housingAllowance = round2(employee?.benefits.housingAllowance || 0);
    const transportAllowance = round2(employee?.benefits.transportAllowance || 0);
    const mealAllowance = round2(employee?.benefits.mealAllowance || 0);
    const fixedAllowances = housingAllowance + transportAllowance + mealAllowance;
    const totalDeductions = round2(deductionTotal(line.deductions));
    const totalEmployerContribution = round2(employerContributionTotal(line.employerContribution));
    const ytdBase = ytdForEmployee(state.runs, line.employeeId, year, state.config);

    return {
      runId: run.id,
      employeeId: line.employeeId,
      employeeName: line.employeeName,
      employeeEmail: employee?.personalInfo.email || '',
      period: run.period,
      currency: line.currency,
      grossPay: line.grossPay,
      earnings: {
        basePay,
        housingAllowance,
        transportAllowance,
        mealAllowance,
        variablePay: round2(Math.max(0, line.grossPay - basePay - fixedAllowances)),
      },
      deductions: line.deductions,
      deductionSummary: {
        paye: line.deductions.federalWithholding,
        pension: line.deductions.socialSecurity,
        nhf: line.deductions.medicare,
        stateLevy: line.deductions.stateIncomeTax,
        localLevy: line.deductions.localIncomeTax,
        healthInsurance: line.deductions.healthInsurance,
        voluntaryRetirement: line.deductions.retirement401k,
        other: line.deductions.other,
        unpaidLeaveAdjustment: line.deductions.unpaidLeaveAdjustment,
        total: totalDeductions,
      },
      employerContribution: line.employerContribution,
      employerContributionSummary: {
        pension: line.employerContribution.socialSecurity,
        nhf: line.employerContribution.medicare,
        nsitf: line.employerContribution.futa,
        stateLevy: line.employerContribution.suta,
        healthInsurance: line.employerContribution.healthInsurance,
        voluntaryRetirementMatch: line.employerContribution.retirement401kMatch,
        total: totalEmployerContribution,
      },
      netPay: line.netPay,
      paymentMethod: line.paymentMethod,
      paymentStatus: line.paymentStatus,
      ytd: {
        gross: round2(fromBaseCurrency(state.config, ytdBase.gross, line.currency)),
        net: round2(fromBaseCurrency(state.config, ytdBase.net, line.currency)),
        federal: round2(fromBaseCurrency(state.config, ytdBase.federal, line.currency)),
        socialSecurity: round2(fromBaseCurrency(state.config, ytdBase.socialSecurity, line.currency)),
        medicare: round2(fromBaseCurrency(state.config, ytdBase.medicare, line.currency)),
        state: round2(fromBaseCurrency(state.config, ytdBase.state, line.currency)),
        local: round2(fromBaseCurrency(state.config, ytdBase.local, line.currency)),
        healthInsurance: round2(fromBaseCurrency(state.config, ytdBase.healthInsurance, line.currency)),
        retirement401k: round2(fromBaseCurrency(state.config, ytdBase.retirement401k, line.currency)),
        other: round2(fromBaseCurrency(state.config, ytdBase.other, line.currency)),
        unpaidLeaveAdjustment: round2(fromBaseCurrency(state.config, ytdBase.unpaidLeaveAdjustment, line.currency)),
        deductionsTotal: round2(fromBaseCurrency(state.config, ytdBase.deductionsTotal, line.currency)),
      },
    };
  });
}

export async function taxSummary(year: number) {
  const state = await loadState();
  let totalWages = 0;
  let federal = 0;
  let ficaEmp = 0;
  let stateTax = 0;
  let localTax = 0;
  let ficaEmployer = 0;
  let futa = 0;
  let suta = 0;
  const quarterLiabilities = [0, 0, 0, 0];

  for (const run of state.runs) {
    if (!run.period.payDate.startsWith(`${year}-`)) continue;
    const monthNumber = Number(run.period.payDate.slice(5, 7)) || 1;
    const quarterIndex = Math.max(0, Math.min(3, Math.floor((monthNumber - 1) / 3)));
    for (const line of run.lines) {
      totalWages += toBaseCurrency(state.config, line.grossPay, line.currency);
      const paye = toBaseCurrency(state.config, line.deductions.federalWithholding, line.currency);
      federal += paye;
      ficaEmp += toBaseCurrency(state.config, line.deductions.socialSecurity + line.deductions.medicare, line.currency);
      stateTax += toBaseCurrency(state.config, line.deductions.stateIncomeTax, line.currency);
      localTax += toBaseCurrency(state.config, line.deductions.localIncomeTax, line.currency);
      ficaEmployer += toBaseCurrency(state.config, line.employerContribution.socialSecurity + line.employerContribution.medicare, line.currency);
      futa += toBaseCurrency(state.config, line.employerContribution.futa, line.currency);
      suta += toBaseCurrency(state.config, line.employerContribution.suta, line.currency);
      quarterLiabilities[quarterIndex] += paye;
    }
  }

  const quarterly941 = [1, 2, 3, 4].map((q) => ({
    quarter: q,
    form: 'PAYE',
    federalLiability: round2(quarterLiabilities[q - 1] || 0),
  }));

  const annualW2 = state.employees
    .filter((employee) => employee.employmentDetails.employmentType !== 'contractor')
    .map((employee) => ({
      employeeId: employee.id,
      employeeName: employee.name,
      wages: ytdForEmployee(state.runs, employee.id, year, state.config).gross,
      payeWithheld: ytdForEmployee(state.runs, employee.id, year, state.config).federal,
    }));

  const annual1099 = state.employees
    .filter((employee) => employee.employmentDetails.employmentType === 'contractor')
    .map((employee) => ({
      employeeId: employee.id,
      employeeName: employee.name,
      nonEmployeeCompensation: ytdForEmployee(state.runs, employee.id, year, state.config).gross,
    }));

  return {
    year,
    totals: {
      totalWages: round2(totalWages),
      federalWithheld: round2(federal),
      ficaEmployee: round2(ficaEmp),
      stateWithheld: round2(stateTax),
      localWithheld: round2(localTax),
      ficaEmployer: round2(ficaEmployer),
      futa: round2(futa),
      suta: round2(suta),
      payeWithheld: round2(federal),
      pensionEmployee: round2(ficaEmp - (state.config.taxRates.medicareRateEmployee ? 0 : 0)),
      nhfEmployee: round2(medBaseFromEmployeeRuns(state.runs, year, state.config)),
      statePayeWithheld: round2(stateTax),
      localLevyWithheld: round2(localTax),
      pensionEmployer: round2(ficaEmployer - (state.config.taxRates.medicareRateEmployer ? 0 : 0)),
      nhfEmployer: round2(medBaseFromEmployerRuns(state.runs, year, state.config)),
      nsitf: round2(futa),
      stateLevy: round2(suta),
      employeeStatutory: round2(ficaEmp),
      employerStatutory: round2(ficaEmployer + futa + suta),
    },
    quarterly941,
    quarterlyPayeRemittance: quarterly941,
    annual: {
      w2: annualW2,
      w3TransmittalCount: annualW2.length,
      form1099: annual1099,
    },
    annualEmployeeTaxCards: annualW2,
    annualContractorPayments: annual1099,
    alerts: [
      `Q${new Date().getMonth() < 3 ? 1 : new Date().getMonth() < 6 ? 2 : new Date().getMonth() < 9 ? 3 : 4} PAYE and statutory remittances should be reviewed before submission.`,
      state.config.taxYearClosed?.includes(year) ? 'Payroll year closed after annual tax-card review.' : 'Payroll year open. Finalize annual employee tax cards and lock after remittance review.',
    ],
  };
}

function medBaseFromEmployeeRuns(runs: PayrollRun[], year: number, config: PayrollConfig) {
  let total = 0;
  for (const run of runs) {
    if (!run.period.payDate.startsWith(`${year}-`)) continue;
    for (const line of run.lines) {
      total += toBaseCurrency(config, line.deductions.medicare, line.currency);
    }
  }
  return total;
}

function medBaseFromEmployerRuns(runs: PayrollRun[], year: number, config: PayrollConfig) {
  let total = 0;
  for (const run of runs) {
    if (!run.period.payDate.startsWith(`${year}-`)) continue;
    for (const line of run.lines) {
      total += toBaseCurrency(config, line.employerContribution.medicare, line.currency);
    }
  }
  return total;
}

export async function closeTaxYear(year: number) {
  const state = await loadState();
  if (!state.config.taxYearClosed?.includes(year)) {
    state.config.taxYearClosed.push(year);
  }
  state.config.updatedAt = nowIso();

  for (const run of state.runs) {
    if (run.period.payDate.startsWith(`${year}-`)) {
      run.status = 'locked';
      run.updatedAt = nowIso();
    }
  }

  await saveState(state);
  return { year, locked: true };
}

export async function payrollReports() {
  const state = await loadState();
  const paidRuns = state.runs.filter((run) => run.status === 'paid' || run.status === 'locked');
  const register = paidRuns.flatMap((run) => run.lines.map((line) => ({
    runId: run.id,
    payDate: run.period.payDate,
    employeeId: line.employeeId,
    employeeName: line.employeeName,
    department: line.department,
    grossPay: line.grossPay,
    netPay: line.netPay,
    deductions: line.deductions,
    employerContribution: line.employerContribution,
    currency: line.currency,
  })));

  const summary = paidRuns.map((run) => ({
    runId: run.id,
    payDate: run.period.payDate,
    gross: run.totals.gross,
    deductions: run.totals.deductions,
    net: run.totals.net,
    employerCost: run.totals.employerCost,
  }));

  const deductionReport = register.map((item) => ({
    runId: item.runId,
    employeeName: item.employeeName,
    federal: item.deductions.federalWithholding,
    fica: item.deductions.socialSecurity + item.deductions.medicare,
    state: item.deductions.stateIncomeTax,
    local: item.deductions.localIncomeTax,
    benefits: item.deductions.healthInsurance + item.deductions.retirement401k,
    other: item.deductions.other,
    paye: item.deductions.federalWithholding,
    pension: item.deductions.socialSecurity,
    nhf: item.deductions.medicare,
    stateLevy: item.deductions.stateIncomeTax,
    localLevy: item.deductions.localIncomeTax,
    voluntaryRetirement: item.deductions.retirement401k,
    statutoryEmployeeTotal: item.deductions.socialSecurity + item.deductions.medicare,
    currency: item.currency,
  }));

  const laborCostByDepartment = Array.from(new Set(register.map((item) => item.department))).map((department) => {
    const rows = register.filter((item) => item.department === department);
    const costBase = rows.reduce((sum, row) => sum + toBaseCurrency(state.config, row.grossPay, row.currency), 0);
    return {
      department,
      payrollCostBaseCurrency: round2(costBase),
      employees: new Set(rows.map((row) => row.employeeId)).size,
    };
  });

  const taxLiability = await taxSummary(new Date().getFullYear());
  const contractor1099 = taxLiability.annual.form1099;

  const accountingEntries = paidRuns.map((run) => ({
    runId: run.id,
    period: `${run.period.startDate} to ${run.period.endDate}`,
    debit: {
      payrollExpense: run.totals.gross,
      payrollTaxExpense: round2(run.totals.employerCost),
    },
    credit: {
      cashBank: run.totals.net,
      taxPayable: round2(run.totals.deductions),
      benefitsPayable: round2(run.totals.employerCost * 0.25),
      retirementPayable: round2(run.totals.employerCost * 0.12),
      pensionPayable: round2(run.totals.employerCost * 0.12),
    },
  }));

  return {
    payrollRegister: register,
    payrollSummary: summary,
    deductionReport,
    laborCostAnalysis: laborCostByDepartment,
    payrollTaxLiability: taxLiability,
    contractor1099,
    contractorPayments: contractor1099,
    accountingEntries,
  };
}
