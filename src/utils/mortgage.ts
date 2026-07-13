/** 还款方式 */
export type RepayMethod = 'equalPrincipalInterest' | 'equalPrincipal';

/** 贷款类型 */
export type LoanType = 'commercial' | 'fund' | 'combination';

/** 计算模式 */
export type CalcMode = 'byTotal' | 'byRatio';

/** 利率类型快捷值 */
export type RateType = 'base' | 'first85' | 'first95' | 'second';

export const BASE_RATE = 5.88; // 基准利率（商业贷）

export const RATE_TYPE_OPTIONS: { key: RateType; label: string; multiplier: number }[] = [
  { key: 'base', label: '基准', multiplier: 1.0 },
  { key: 'first85', label: '首套85折', multiplier: 0.85 },
  { key: 'first95', label: '首套95折', multiplier: 0.95 },
  { key: 'second', label: '二套上浮', multiplier: 1.1 },
];

/** 表单输入 */
export interface MortgageInput {
  repayMethod: RepayMethod;
  loanType: LoanType;
  calcMode: CalcMode;
  housePrice: number;      // 万元
  loanTotal: number;       // 万元（byTotal 模式时用）
  ratio: number;           // 按揭比例（byRatio 模式时用）
  years: number;           // 按揭年数
  firstPayDate: string;    // YYYY-MM
  commercialRate: number;  // % 商业贷年利率
  fundRate: number;        // % 公积金贷年利率
  fundAmount: number;      // 万元 组合贷时公积金金额
}

/** 每月还款明细 */
export interface ScheduleItem {
  period: number;
  principal: number;
  interest: number;
  total: number;
  remainingPrincipal: number;
}

/** 计算结果 */
export interface MortgageResult {
  monthlyPayment: number;       // 月供（等额本金时为首月）
  totalPayment: number;         // 还款总额
  totalInterest: number;        // 总利息
  totalPrincipal: number;       // 本金总额
  firstMonthInterest: number;   // 首月利息
  lastMonthInterest: number;    // 末月利息
  schedule: ScheduleItem[];     // 还款计划
  commercialMonthly?: number;   // 组合贷—商贷月供
  fundMonthly?: number;         // 组合贷—公积金月供
}

/* ===== 校验 ===== */
export function validateMortgageInput(input: MortgageInput): string[] {
  const errs: string[] = [];
  const housePriceYuan = input.housePrice * 10000;

  if (!input.housePrice || input.housePrice <= 0) errs.push('请输入房屋总金额');
  if (![5, 10, 15, 20, 25, 30].includes(input.years)) errs.push('请选择有效的按揭年数');

  if (input.calcMode === 'byTotal') {
    if (!input.loanTotal || input.loanTotal <= 0) errs.push('请输入贷款总额');
    if (input.loanTotal * 10000 > housePriceYuan) errs.push('贷款总额不能超过房屋总金额');
  } else {
    if (input.ratio < 10 || input.ratio > 90) errs.push('按揭比例需在10~90之间');
  }

  if (input.loanType === 'commercial' || input.loanType === 'combination') {
    if (!input.commercialRate || input.commercialRate <= 0 || input.commercialRate > 20)
      errs.push('请输入有效的商业贷利率（0~20%）');
  }
  if (input.loanType === 'fund' || input.loanType === 'combination') {
    if (!input.fundRate || input.fundRate <= 0 || input.fundRate > 10)
      errs.push('请输入有效的公积金贷利率（0~10%）');
    if (input.loanType === 'combination') {
      if (!input.fundAmount || input.fundAmount <= 0)
        errs.push('请输入公积金贷款金额');
      else if (input.fundAmount >= input.loanTotal)
        errs.push('公积金贷款金额不能超过贷款总额');
    }
  }

  return errs;
}

/* ===== 计算单套还款方案 ===== */
function calcSingle(
  principalYuan: number,
  annualRate: number,
  totalMonths: number,
  repayMethod: RepayMethod,
): { monthlyPayment: number; totalPayment: number; totalInterest: number; schedule: ScheduleItem[] } {
  const monthlyRate = annualRate / 100 / 12;
  const schedule: ScheduleItem[] = [];
  let totalPayment = 0;
  let totalInterest = 0;
  let monthlyPayment = 0;

  if (monthlyRate === 0) {
    // 零利率只需还本金
    monthlyPayment = principalYuan / totalMonths;
    let remaining = principalYuan;
    for (let i = 1; i <= totalMonths; i++) {
      const principal = monthlyPayment;
      remaining -= principal;
      schedule.push({
        period: i,
        principal: round2(principal),
        interest: 0,
        total: round2(principal),
        remainingPrincipal: round2(Math.max(0, remaining)),
      });
    }
    totalPayment = principalYuan;
    totalInterest = 0;
    return { monthlyPayment, totalPayment, totalInterest, schedule };
  }

  if (repayMethod === 'equalPrincipalInterest') {
    // 等额本息: M = P * r * (1+r)^n / ((1+r)^n - 1)
    const pow = Math.pow(1 + monthlyRate, totalMonths);
    monthlyPayment = principalYuan * monthlyRate * pow / (pow - 1);
    let remaining = principalYuan;

    for (let i = 1; i <= totalMonths; i++) {
      const interest = remaining * monthlyRate;
      const principal = monthlyPayment - interest;
      remaining -= principal;
      schedule.push({
        period: i,
        principal: round2(principal),
        interest: round2(interest),
        total: round2(monthlyPayment),
        remainingPrincipal: round2(Math.max(0, remaining)),
      });
    }
  } else {
    // 等额本金: 月还本金 = P / n, 利息 = 剩余 * r
    const monthlyPrincipal = principalYuan / totalMonths;
    let remaining = principalYuan;

    for (let i = 1; i <= totalMonths; i++) {
      const interest = remaining * monthlyRate;
      const payment = monthlyPrincipal + interest;
      remaining -= monthlyPrincipal;
      schedule.push({
        period: i,
        principal: round2(monthlyPrincipal),
        interest: round2(interest),
        total: round2(payment),
        remainingPrincipal: round2(Math.max(0, remaining)),
      });
      if (i === 1) monthlyPayment = payment;
    }
  }

  totalPayment = round2(schedule.reduce((s, r) => s + r.total, 0));
  totalInterest = round2(totalPayment - principalYuan);
  monthlyPayment = round2(monthlyPayment);

  return { monthlyPayment, totalPayment, totalInterest, schedule };
}

/* ===== 主计算函数 ===== */
export function calculateMortgage(input: MortgageInput): MortgageResult | null {
  // 1. 确定贷款总额（元）
  const loanYuan =
    input.calcMode === 'byRatio'
      ? input.housePrice * 10000 * (input.ratio / 100)
      : input.loanTotal * 10000;

  const totalMonths = input.years * 12;

  if (loanYuan <= 0 || totalMonths <= 0) return null;

  // 2. 拆分贷款类型
  let commercialLoan = 0;
  let fundLoan = 0;

  if (input.loanType === 'commercial') {
    commercialLoan = loanYuan;
  } else if (input.loanType === 'fund') {
    fundLoan = loanYuan;
  } else {
    // combination
    fundLoan = input.fundAmount * 10000;
    commercialLoan = loanYuan - fundLoan;
  }

  // 3. 计算
  let commercialRes: ReturnType<typeof calcSingle> | null = null;
  let fundRes: ReturnType<typeof calcSingle> | null = null;

  if (commercialLoan > 0) {
    commercialRes = calcSingle(commercialLoan, input.commercialRate, totalMonths, input.repayMethod);
  }
  if (fundLoan > 0) {
    fundRes = calcSingle(fundLoan, input.fundRate, totalMonths, input.repayMethod);
  }

  // 4. 合并
  const schedule: ScheduleItem[] = [];
  let totalPayment = 0;
  let totalInterest = 0;
  const totalPrincipal = round2(loanYuan);

  if (commercialRes && !fundRes) {
    schedule.push(...commercialRes.schedule);
    totalPayment = commercialRes.totalPayment;
    totalInterest = commercialRes.totalInterest;
  } else if (!commercialRes && fundRes) {
    schedule.push(...fundRes.schedule);
    totalPayment = fundRes.totalPayment;
    totalInterest = fundRes.totalInterest;
  } else if (commercialRes && fundRes) {
    for (let i = 0; i < totalMonths; i++) {
      const c = commercialRes.schedule[i];
      const f = fundRes.schedule[i];
      schedule.push({
        period: i + 1,
        principal: round2(c.principal + f.principal),
        interest: round2(c.interest + f.interest),
        total: round2(c.total + f.total),
        remainingPrincipal: round2(c.remainingPrincipal + f.remainingPrincipal),
      });
    }
    totalPayment = round2(commercialRes.totalPayment + fundRes.totalPayment);
    totalInterest = round2(commercialRes.totalInterest + fundRes.totalInterest);
  }

  const monthlyPayment = commercialRes && fundRes
    ? round2(commercialRes.monthlyPayment + fundRes.monthlyPayment)
    : (commercialRes?.monthlyPayment ?? fundRes?.monthlyPayment ?? 0);

  const firstMonthInterest = schedule.length > 0 ? schedule[0].interest : 0;
  const lastMonthInterest = schedule.length > 0 ? schedule[schedule.length - 1].interest : 0;

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    totalPrincipal,
    firstMonthInterest,
    lastMonthInterest,
    schedule,
    commercialMonthly: commercialRes?.monthlyPayment,
    fundMonthly: fundRes?.monthlyPayment,
  };
}

/* ===== 工具函数 ===== */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function formatManYuan(v: number): string {
  return Math.round(v).toLocaleString('zh-CN');
}

/** 根据按揭比例计算贷款总额（万元） */
export function calcLoanByRatio(housePrice: number, ratio: number): number {
  return round2((housePrice * ratio) / 100);
}
