/* ========== 提前还款计算引擎 ========== */

/** 还款方式 */
export type RepaymentType = 'EQUAL_PI' | 'EQUAL_P';

/** 违约金类型 */
export type PenaltyType = 'NONE' | 'PERCENT' | 'FIXED';

/** 提前还款方式 */
export type PrepayType = 'FULL' | 'PARTIAL';

/** 表单输入 */
export interface PrepayInput {
  loanAmount: number;        // 贷款金额（元）
  loanYears: number;         // 贷款年限（年）
  annualRate: number;        // 年利率（%）
  repaymentType: RepaymentType; // 还款方式
  firstPaymentDate: string;  // 首次还款日期 YYYY-MM-DD
  prepaymentDate: string;    // 提前还款日期 YYYY-MM-DD
  penaltyType: PenaltyType;  // 违约金类型
  penaltyValue: number;      // 违约金值（% / 元）
  prepayType: PrepayType;    // 提前还款方式
  partialAmount: number;     // 部分偿还金额（元）
}

/** 计算结果 */
export interface PrepayResult {
  loanAmount: number;
  loanTerm: number;           // 贷款期限（月）
  monthlyRate: number;        // 月利率
  monthlyPayment: number;     // 月供
  totalInterest: number;      // 原计划总利息
  totalPayment: number;       // 原计划总还款
  paidMonths: number;         // 已还月数
  paidPrincipal: number;      // 已还本金
  paidInterest: number;       // 已还利息
  remainingPrincipal: number; // 剩余本金
  remainingInterest: number;  // 剩余利息（原计划）
  penalty: number;            // 违约金
  totalPrepay: number;        // 本次需还总额
  savedInterest: number;      // 节省利息
  saveRatio: number;          // 节省比例（%）
  schedules: MonthlySchedule[]; // 逐月还款明细
  prepayMonth: number;        // 提前还款所在月序（第N期）
}

/** 逐月还款明细 */
export interface MonthlySchedule {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remainingPrincipal: number;
}

/* ---------- 工具函数 ---------- */

/** 计算两个日期相差的整数月数（不足整月计为0） */
export function monthsBetween(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  // 如果 b 的日 < a 的日，不到一个整月
  if (b.getDate() < a.getDate()) {
    months = Math.max(0, months - 1);
  }
  return Math.max(0, months);
}

/* ---------- 等额本息 ---------- */

/** 等额本息月供 */
export function equalPIMonthly(principal: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return principal / months;
  const tmp = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * tmp) / (tmp - 1);
}

/** 等额本息：第k期后剩余本金 */
export function equalPIRemaining(principal: number, monthlyRate: number, months: number, k: number): number {
  if (k <= 0) return principal;
  if (k >= months) return 0;
  if (monthlyRate === 0) return principal * (1 - k / months);
  const tmp = Math.pow(1 + monthlyRate, months);
  const tk = Math.pow(1 + monthlyRate, k);
  return principal * (tmp - tk) / (tmp - 1);
}

/** 等额本息：已还利息 */
export function equalPIPaidInterest(monthlyPayment: number, principal: number, remainingPrincipal: number, k: number): number {
  return monthlyPayment * k - (principal - remainingPrincipal);
}

/** 等额本息还款计划 */
export function equalPISchedule(principal: number, monthlyRate: number, months: number): MonthlySchedule[] {
  const monthly = equalPIMonthly(principal, monthlyRate, months);
  const schedules: MonthlySchedule[] = [];
  let remain = principal;
  for (let i = 1; i <= months; i++) {
    const interest = remain * monthlyRate;
    const prin = monthly - interest;
    remain = Math.max(0, remain - prin);
    schedules.push({
      month: i,
      payment: Math.round(monthly * 100) / 100,
      principal: Math.round(prin * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      remainingPrincipal: Math.round(remain * 100) / 100,
    });
  }
  return schedules;
}

/* ---------- 等额本金 ---------- */

/** 等额本金：月还本金 */
export function equalPMonthlyPrincipal(principal: number, months: number): number {
  return principal / months;
}

/** 等额本金：第k期月供 */
export function equalPMonthlyPayment(principal: number, monthlyRate: number, months: number, k: number): number {
  const monthlyPrincipal = principal / months;
  const interest = (principal - (k - 1) * monthlyPrincipal) * monthlyRate;
  return monthlyPrincipal + interest;
}

/** 等额本金：第k期后剩余本金 */
export function equalPRemaining(principal: number, months: number, k: number): number {
  if (k <= 0) return principal;
  if (k >= months) return 0;
  return principal * (1 - k / months);
}

/** 等额本金：已还利息 */
export function equalPPaidInterest(principal: number, monthlyRate: number, months: number, k: number): number {
  // Sum(1..k): (P - (i-1)*P/n) * r = P*r * k*(2n-k+1)/(2n)
  if (k <= 0) return 0;
  return principal * monthlyRate * k * (2 * months - k + 1) / (2 * months);
}

/** 等额本金还款计划 */
export function equalPSchedule(principal: number, monthlyRate: number, months: number): MonthlySchedule[] {
  const monthlyPrincipal = principal / months;
  const schedules: MonthlySchedule[] = [];
  let remain = principal;
  for (let i = 1; i <= months; i++) {
    const interest = remain * monthlyRate;
    const payment = monthlyPrincipal + interest;
    remain = Math.max(0, remain - monthlyPrincipal);
    schedules.push({
      month: i,
      payment: Math.round(payment * 100) / 100,
      principal: Math.round(monthlyPrincipal * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      remainingPrincipal: Math.round(remain * 100) / 100,
    });
  }
  return schedules;
}

/* ---------- 违约金 ---------- */

export function calcPenalty(remainingPrincipal: number, penaltyType: PenaltyType, penaltyValue: number): number {
  switch (penaltyType) {
    case 'PERCENT':
      return remainingPrincipal * (penaltyValue / 100);
    case 'FIXED':
      return penaltyValue;
    default:
      return 0;
  }
}

/* ---------- 输入验证 ---------- */

export function validatePrepayInput(input: PrepayInput): string[] {
  const errs: string[] = [];
  if (!input.loanAmount || input.loanAmount <= 0) errs.push('请输入有效的贷款金额');
  if (!input.loanYears || input.loanYears <= 0 || input.loanYears > 50) errs.push('贷款年限需在 1-50 年之间');
  if (!input.annualRate || input.annualRate <= 0 || input.annualRate > 36) errs.push('年利率需在 0-36% 之间');
  if (!input.firstPaymentDate) errs.push('请选择首次还款日期');
  if (!input.prepaymentDate) errs.push('请选择提前还款日期');
  if (input.firstPaymentDate && input.prepaymentDate && new Date(input.prepaymentDate) <= new Date(input.firstPaymentDate)) {
    errs.push('提前还款日期需在首次还款日期之后');
  }
  if (input.prepayType === 'PARTIAL' && (!input.partialAmount || input.partialAmount <= 0)) {
    errs.push('请输入部分偿还金额');
  }
  return errs;
}

/* ---------- 主计算函数 ---------- */

export function calculatePrepay(input: PrepayInput): PrepayResult | null {
  const errs = validatePrepayInput(input);
  if (errs.length) return null;

  const { loanAmount, loanYears, annualRate, repaymentType, firstPaymentDate, prepaymentDate, penaltyType, penaltyValue, prepayType, partialAmount } = input;

  const loanTerm = loanYears * 12;
  const monthlyRate = annualRate / 12 / 100;

  // 已还月数
  const paidMonths = monthsBetween(firstPaymentDate, prepaymentDate);
  if (paidMonths >= loanTerm) return null; // 已还完

  let monthlyPayment: number;
  let remainingPrincipal: number;
  let paidPrincipal: number;
  let paidInterest: number;
  let totalInterest: number;
  let totalPayment: number;
  let remainingInterest: number;
  let schedules: MonthlySchedule[];

  if (repaymentType === 'EQUAL_PI') {
    // 等额本息
    monthlyPayment = equalPIMonthly(loanAmount, monthlyRate, loanTerm);
    remainingPrincipal = equalPIRemaining(loanAmount, monthlyRate, loanTerm, paidMonths);
    paidPrincipal = loanAmount - remainingPrincipal;
    paidInterest = equalPIPaidInterest(monthlyPayment, loanAmount, remainingPrincipal, paidMonths);
    totalPayment = monthlyPayment * loanTerm;
    totalInterest = totalPayment - loanAmount;

    // 剩余利息 = 剩余各期利息之和
    remainingInterest = 0;
    let rp = remainingPrincipal;
    for (let i = paidMonths + 1; i <= loanTerm; i++) {
      const interest = rp * monthlyRate;
      const prin = monthlyPayment - interest;
      remainingInterest += interest;
      rp = Math.max(0, rp - prin);
    }

    schedules = equalPISchedule(loanAmount, monthlyRate, loanTerm);
  } else {
    // 等额本金
    const monthlyPrincipal = equalPMonthlyPrincipal(loanAmount, loanTerm);
    remainingPrincipal = equalPRemaining(loanAmount, loanTerm, paidMonths);
    paidPrincipal = loanAmount - remainingPrincipal;
    paidInterest = equalPPaidInterest(loanAmount, monthlyRate, loanTerm, paidMonths);
    monthlyPayment = equalPMonthlyPayment(loanAmount, monthlyRate, loanTerm, 1); // 首月月供

    // 总利息 = P*r*(n*(n+1))/(2n) = P*r*(n+1)/2
    totalInterest = loanAmount * monthlyRate * (loanTerm + 1) / 2;
    totalPayment = loanAmount + totalInterest;

    // 剩余利息
    remainingInterest = 0;
    let rp2 = remainingPrincipal;
    for (let i = paidMonths + 1; i <= loanTerm; i++) {
      const interest = rp2 * monthlyRate;
      remainingInterest += interest;
      rp2 = Math.max(0, rp2 - monthlyPrincipal);
    }

    schedules = equalPSchedule(loanAmount, monthlyRate, loanTerm);
  }

  // 违约金
  const penaltyBase = prepayType === 'FULL' ? remainingPrincipal : partialAmount;
  const penalty = calcPenalty(penaltyBase, penaltyType, penaltyValue);

  // 本次需还总额
  const prepayPrincipal = prepayType === 'FULL' ? remainingPrincipal : Math.min(partialAmount, remainingPrincipal);
  const totalPrepay = prepayPrincipal + penalty;

  // 节省利息
  let savedInterest: number;
  if (prepayType === 'FULL') {
    savedInterest = remainingInterest;
  } else {
    // 部分提前还款，简化：节省利息按比例估算
    const ratio = partialAmount / remainingPrincipal;
    savedInterest = remainingInterest * ratio;
  }

  const saveRatio = totalInterest > 0 ? (savedInterest / totalInterest) * 100 : 0;

  return {
    loanAmount,
    loanTerm,
    monthlyRate,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    paidMonths,
    paidPrincipal: Math.round(paidPrincipal * 100) / 100,
    paidInterest: Math.round(paidInterest * 100) / 100,
    remainingPrincipal: Math.round(remainingPrincipal * 100) / 100,
    remainingInterest: Math.round(remainingInterest * 100) / 100,
    penalty: Math.round(penalty * 100) / 100,
    totalPrepay: Math.round(totalPrepay * 100) / 100,
    savedInterest: Math.round(savedInterest * 100) / 100,
    saveRatio: Math.round(saveRatio * 100) / 100,
    schedules,
    prepayMonth: paidMonths + 1,
  };
}
