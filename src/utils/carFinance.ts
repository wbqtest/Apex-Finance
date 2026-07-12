// 车贷精算师 - 计算引擎（纯前端、无后端依赖）
// 严格对齐《车贷精算师·核心算法需求稿》：
//   A-01 基础还款计划（等额本息/等额本金/先息后本/气球贷）
//   A-02 IRR 真实年化（牛顿法 + 二分兜底，费用纳入现金流）
//   A-03 多方案对比引擎
//   A-04 提前还款计算（违约金 NONE/PERCENT/FIXED）
//   A-05 费用现金流映射（ONCE -> t0，YEARLY -> 12/24/...，MONTHLY -> 每期）

// ===================== 类型定义 =====================

/** 还款方式（规范 A-01） */
export type RepaymentType = 'EQUAL_PI' | 'EQUAL_P' | 'INTEREST_FIRST' | 'BALLOON';

export const REPAYMENT_LABELS: Record<RepaymentType, string> = {
  EQUAL_PI: '等额本息',
  EQUAL_P: '等额本金',
  INTEREST_FIRST: '先息后本',
  BALLOON: '气球贷',
};

/** 费用支付周期（规范 A-05） */
export type FeeCycle = 'ONCE' | 'YEARLY' | 'MONTHLY';

/** 费用结构（规范 1.2） */
export interface Fee {
  type: string; // SERVICE_FEE / INSURANCE / GPS / REGISTRATION / MORTGAGE / EXTEND_WARRANTY / CUSTOM
  amount: number;
  cycle: FeeCycle;
  startPeriod?: number; // 起始期数，默认 0（贷款发放日）
  label?: string; // 展示名（UI 用，可选）
}

export type PenaltyType = 'NONE' | 'PERCENT' | 'FIXED';

/** 核心输入（规范 1.2，loanAmount 为核心入参） */
export interface CarLoanInput {
  loanAmount: number; // 贷款本金总额
  loanTerm: number; // 贷款期限（月）：12/24/36/48/60
  repaymentType: RepaymentType;
  annualRate: number; // 年化利率（%）
  fees?: Fee[]; // 费用列表
  downPayment?: number; // 首付金额（可选，仅用于展示）
  carPrice?: number; // 车辆总价（可选，仅用于展示）
  balloonRatio?: number; // 气球贷末期还款比例（%），默认 30
  prepaymentPeriod?: number; // 提前还款时点（第几期）
  penaltyType?: PenaltyType; // 违约金类型
  penaltyValue?: number; // 违约金值（PERCENT: %；FIXED: 元）
}

/** 逐期还款计划（规范 1.3） */
export interface RepaymentItem {
  period: number; // 期数（从 1 开始）
  payment: number; // 本期应还总额（本金 + 利息，不含费用）
  principal: number; // 本期应还本金
  interest: number; // 本期应还利息
  feeAtPeriod: number; // 本期应还费用
  totalPayAtPeriod: number; // 本期实际支出（payment + feeAtPeriod）
  remainingPrincipal: number; // 本期还款后剩余本金
  cumulativeInterest: number; // 截至本期累计利息
  cumulativeFee: number; // 截至本期累计费用
  cumulativeTotalPay: number; // 截至本期累计总支出
}

/** 提前还款分析（规范 A-04） */
export interface PrepaymentAnalysis {
  payoffPeriod: number; // 提前结清期数
  remainingPrincipal: number; // 结清时剩余本金
  currentInterest: number; // 当期利息
  penalty: number; // 违约金
  totalPayNow: number; // 本次结清需支付 = 剩余本金 + 当期利息 + 违约金
  originalRemainingTotal: number; // 原方案第 k..n 期 payment 总和
  saveInterest: number; // 相比原计划节省的利息
  savePercentage: number; // 节省比例（%）
  suggestion: string; // 建议文案
}

/** 计算结果（规范 1.3 / 四） */
export interface CarLoanResult {
  repaymentType: RepaymentType;
  loanAmount: number;
  loanTerm: number;
  annualRate: number;
  monthlyRate: number;
  carPrice: number;
  downPayment: number;
  monthlyPayment: number; // 月供（等额本息/先息后本固定；等额本金为首月；气球贷为前期月供）
  monthlyPaymentEnd?: number; // 等额本金末期月供
  balloonPayment: number; // 末期尾款（气球贷/先息后本）
  irr: number; // 真实年化利率（%）— 有效年化 (1+r)^12-1
  irrMonthly: number; // 月 IRR
  irrConverged: boolean; // IRR 是否收敛（false 时前端显示「—」）
  totalInterest: number;
  totalFee: number;
  totalPayment: number; // 总还款额 = 本金 + 利息 + 费用
  totalCost: number; // 总成本（利息 + 费用，比全款多花）
  repaymentPlan: RepaymentItem[];
  summary: {
    firstPayment: number; // 首期总支出
    lastPayment: number; // 末期总支出
    totalPrincipal: number; // 本金合计 = loanAmount
    extraCostOverCash: number; // 比全款多花 = totalCost
  };
  prepaymentAnalysis?: PrepaymentAnalysis; // 若输入含 prepaymentPeriod 则附上
}

/** 参数校验范围（规范 3.1） */
export interface CarCalcParams {
  loanTermOptions: number[];
  defaultTerm: number;
  rateMin: number;
  rateMax: number;
  downPaymentMin: number;
  downPaymentMax: number;
  maxFeeAmount: number;
  maxCustomFees: number;
}

export const DEFAULT_CALC_PARAMS: CarCalcParams = {
  loanTermOptions: [12, 24, 36, 48, 60],
  defaultTerm: 36,
  rateMin: 0.01,
  rateMax: 36,
  downPaymentMin: 0,
  downPaymentMax: 80,
  maxFeeAmount: 100000,
  maxCustomFees: 10,
};

// ===================== 计算辅助 =====================

const round2 = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

/** 等额本息月供（规范 2.1） */
const calcEqualPIPayment = (P: number, n: number, r: number): number => {
  if (r === 0) return P / n;
  const pow = Math.pow(1 + r, n);
  return (P * r * pow) / (pow - 1);
};

// ===================== A-05 费用现金流映射 =====================

/** 第 period 期（1..n）应计费用（ONCE 在 t0 处理，不在此返回） */
export const getFeeAtPeriod = (fees: Fee[] | undefined, period: number): number => {
  if (!fees || fees.length === 0) return 0;
  let total = 0;
  const start = (f: Fee) => f.startPeriod ?? 0;
  for (const fee of fees) {
    if (!fee.amount || fee.amount <= 0) continue;
    switch (fee.cycle) {
      case 'ONCE':
        break; // 在 buildCashflows 单独处理
      case 'YEARLY':
        if (period % 12 === 0 && period >= start(fee)) {
          const yearsSinceStart = (period - start(fee)) / 12;
          if (Number.isInteger(yearsSinceStart) && yearsSinceStart >= 0) total += fee.amount;
        }
        break;
      case 'MONTHLY':
        if (period >= start(fee)) total += fee.amount;
        break;
    }
  }
  return total;
};

/** 一次性费用合计（计入 t0） */
export const getFeeAtPeriod0 = (fees: Fee[] | undefined): number => {
  if (!fees) return 0;
  return fees.reduce((s, f) => (f.cycle === 'ONCE' && f.amount > 0 ? s + f.amount : s), 0);
};

/** 全部费用实际支付总额（ONCE + YEARLY×年数 + MONTHLY×期数） */
const calcTotalFee = (fees: Fee[] | undefined, n: number): number => {
  if (!fees) return 0;
  let total = getFeeAtPeriod0(fees);
  for (let t = 1; t <= n; t++) total += getFeeAtPeriod(fees, t);
  return round2(total);
};

// ===================== A-02 IRR 求解 =====================

/** 构建 IRR 现金流（规范 A-05 5.3）：CF0 = 贷款额 - 一次性费用；CF_t = -(月供 + 当期费用) */
const buildCashflows = (loanAmount: number, plan: RepaymentItem[], fees: Fee[] | undefined): number[] => {
  const cfs: number[] = [loanAmount - getFeeAtPeriod0(fees)];
  for (let t = 1; t <= plan.length; t++) {
    const fee = getFeeAtPeriod(fees, t);
    cfs.push(-(plan[t - 1].payment + fee));
  }
  return cfs;
};

const calcNPV = (cfs: number[], x: number): number => {
  let npv = 0;
  for (let t = 0; t < cfs.length; t++) npv += cfs[t] / Math.pow(1 + x, t);
  return npv;
};

/** 牛顿法（规范 A-02 2.3），超出合理范围时返回 ok:false 触发二分兜底 */
const newtonIRR = (cfs: number[], guess: number): { rate: number; ok: boolean } => {
  let x = guess;
  for (let i = 0; i < 100; i++) {
    let f = 0;
    let df = 0;
    for (let t = 0; t < cfs.length; t++) {
      const base = Math.pow(1 + x, t);
      f += cfs[t] / base;
      df += (-t * cfs[t]) / Math.pow(1 + x, t + 1);
    }
    if (Math.abs(f) < 1e-8) return { rate: x, ok: true };
    if (Math.abs(df) < 1e-12) break;
    const xNew = x - f / df;
    if (xNew < -0.99 || xNew > 10) return { rate: x, ok: false };
    if (Math.abs(xNew - x) < 1e-9) return { rate: xNew, ok: true };
    x = xNew;
  }
  // 检查当前点是否已足够收敛
  return { rate: x, ok: Math.abs(calcNPV(cfs, x)) < 1e-6 };
};

/** 二分法兜底（规范 A-02 2.4） */
const bisectionIRR = (cfs: number[], low = -0.99, high = 1.0): number | null => {
  const npvLow = calcNPV(cfs, low);
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    const npvMid = calcNPV(cfs, mid);
    if (Math.abs(npvMid) < 1e-8) return mid;
    if (npvMid * npvLow < 0) high = mid;
    else low = mid;
  }
  const mid = (low + high) / 2;
  return Math.abs(calcNPV(cfs, mid)) < 1e-4 ? mid : null;
};

/** 求解 IRR（规范 A-02），多初值尝试，牛顿失败转二分 */
const solveIRR = (cfs: number[]): { monthly: number; annual: number; converged: boolean } => {
  if (cfs.length < 2) return { monthly: 0, annual: 0, converged: false };
  const guesses = [0.1, 0.2, 0.05, 0.01, 0.15];
  let best: number | null = null;
  let bestErr = Infinity;
  for (const g of guesses) {
    const { rate, ok } = newtonIRR(cfs, g);
    if (ok) {
      const err = Math.abs(calcNPV(cfs, rate));
      if (err < bestErr) {
        bestErr = err;
        best = rate;
      }
    }
  }
  let monthly: number;
  let converged = true;
  if (best === null) {
    const b = bisectionIRR(cfs);
    if (b === null) return { monthly: 0, annual: 0, converged: false };
    monthly = b;
  } else {
    monthly = best;
  }
  const annual = round2((Math.pow(1 + monthly, 12) - 1) * 100);
  return { monthly, annual, converged };
};

// ===================== A-01 主计算 =====================

export const calculateCarLoan = (input: CarLoanInput): CarLoanResult => {
  const {
    loanAmount,
    loanTerm: n,
    repaymentType,
    annualRate,
    fees,
    downPayment: explicitDown,
    carPrice: explicitCarPrice,
    balloonRatio = 30,
    prepaymentPeriod,
    penaltyType = 'NONE',
    penaltyValue = 0,
  } = input;

  const P = loanAmount;
  const r = annualRate / 100 / 12;
  const carPrice = explicitCarPrice ?? P;
  const downPayment = explicitDown ?? Math.max(0, carPrice - P);

  const plan: RepaymentItem[] = [];
  let cumulativeInterest = 0;
  let cumulativeFee = 0;
  let cumulativeTotalPay = 0;
  let totalInterest = 0;

  let monthlyPayment = 0;
  let monthlyPaymentEnd: number | undefined;
  let balloonPayment = 0;

  /** 将一期结果写入 plan（payment 不含费用，费用单独列示） */
  const pushItem = (t: number, principalRaw: number, interestRaw: number, remainingRaw: number, balloonAdd = 0) => {
    const principal = round2(principalRaw + balloonAdd);
    const interest = round2(interestRaw);
    const payment = round2(principalRaw + interestRaw + balloonAdd);
    const fee = round2(getFeeAtPeriod(fees, t));
    const totalPay = round2(payment + fee);
    cumulativeInterest = round2(cumulativeInterest + interest);
    cumulativeFee = round2(cumulativeFee + fee);
    cumulativeTotalPay = round2(cumulativeTotalPay + totalPay);
    totalInterest = round2(totalInterest + interest);
    plan.push({
      period: t,
      payment,
      principal,
      interest,
      feeAtPeriod: fee,
      totalPayAtPeriod: totalPay,
      remainingPrincipal: round2(remainingRaw),
      cumulativeInterest,
      cumulativeFee,
      cumulativeTotalPay,
    });
  };

  if (repaymentType === 'EQUAL_PI') {
    const M = calcEqualPIPayment(P, n, r);
    monthlyPayment = round2(M);
    let remaining = P;
    for (let t = 1; t <= n; t++) {
      const interestRaw = remaining * r;
      let principalRaw: number;
      if (t === n) {
        principalRaw = remaining; // 末期修正，确保剩余本金归零
      } else {
        principalRaw = M - interestRaw;
      }
      remaining = remaining - principalRaw;
      pushItem(t, principalRaw, interestRaw, remaining);
    }
  } else if (repaymentType === 'EQUAL_P') {
    const fixedRaw = P / n;
    let remaining = P;
    for (let t = 1; t <= n; t++) {
      const interestRaw = remaining * r;
      const principalRaw = t === n ? remaining : fixedRaw;
      const paymentThis = principalRaw + interestRaw;
      if (t === 1) monthlyPayment = round2(paymentThis);
      if (t === n) monthlyPaymentEnd = round2(paymentThis);
      remaining = remaining - principalRaw;
      pushItem(t, principalRaw, interestRaw, remaining);
    }
  } else if (repaymentType === 'INTEREST_FIRST') {
    const interestEach = P * r;
    let remaining = P;
    for (let t = 1; t <= n; t++) {
      const isLast = t === n;
      const principalRaw = isLast ? P : 0;
      const interestRaw = interestEach;
      if (isLast) {
        remaining = 0;
        balloonPayment = round2(P);
      }
      if (t === 1) monthlyPayment = round2(interestRaw);
      pushItem(t, principalRaw, interestRaw, remaining);
    }
  } else {
    // 气球贷（规范 2.4）：月供按「非尾款部分」等额本息，末期额外偿还尾款 P×balloonRatio
    const balloonPrincipal = P * (balloonRatio / 100);
    const normalPrincipal = P - balloonPrincipal;
    if (normalPrincipal <= 0) {
      // 退化为先息后本（尾款 = 全部本金）
      const interestEach = P * r;
      for (let t = 1; t <= n; t++) {
        const isLast = t === n;
        const principalRaw = isLast ? P : 0;
        const interestRaw = interestEach;
        if (isLast) balloonPayment = round2(P);
        if (t === 1) monthlyPayment = round2(interestRaw);
        pushItem(t, principalRaw, interestRaw, isLast ? 0 : P);
      }
    } else {
      const M = calcEqualPIPayment(normalPrincipal, n, r);
      monthlyPayment = round2(M);
      let remainingNormal = normalPrincipal;
      for (let t = 1; t <= n; t++) {
        const interestRaw = remainingNormal * r;
        if (t === n) {
          // 末期：偿还剩余正常本金 + 尾款
          balloonPayment = round2(balloonPrincipal);
          pushItem(t, remainingNormal, interestRaw, 0, balloonPrincipal);
          remainingNormal = 0;
        } else {
          const principalRaw = M - interestRaw;
          remainingNormal = remainingNormal - principalRaw;
          pushItem(t, principalRaw, interestRaw, remainingNormal + balloonPrincipal);
        }
      }
    }
  }

  const totalFee = calcTotalFee(fees, n);
  const totalInterestR = round2(totalInterest);
  const totalPayment = round2(P + totalInterestR + totalFee); // 本金 + 利息 + 费用
  const totalCost = round2(totalInterestR + totalFee); // 比全款多花

  // IRR（费用已纳入现金流）
  const cfs = buildCashflows(P, plan, fees);
  const { monthly, annual, converged } = solveIRR(cfs);

  const prepaymentAnalysis =
    prepaymentPeriod != null
      ? calculateEarlyRepayment(
          {
            repaymentType,
            loanAmount: P,
            loanTerm: n,
            annualRate,
            monthlyRate: r,
            carPrice,
            downPayment,
            monthlyPayment,
            monthlyPaymentEnd,
            balloonPayment,
            irr: annual,
            irrMonthly: monthly,
            irrConverged: converged,
            totalInterest: totalInterestR,
            totalFee,
            totalPayment,
            totalCost,
            repaymentPlan: plan,
            summary: { firstPayment: plan[0].totalPayAtPeriod, lastPayment: plan[n - 1].totalPayAtPeriod, totalPrincipal: P, extraCostOverCash: totalCost },
          },
          { payoffPeriod: prepaymentPeriod, penaltyType, penaltyValue }
        )
      : undefined;

  return {
    repaymentType,
    loanAmount: round2(P),
    loanTerm: n,
    annualRate,
    monthlyRate: r,
    carPrice: round2(carPrice),
    downPayment: round2(downPayment),
    monthlyPayment,
    monthlyPaymentEnd,
    balloonPayment,
    irr: annual,
    irrMonthly: monthly,
    irrConverged: converged,
    totalInterest: totalInterestR,
    totalFee,
    totalPayment,
    totalCost,
    repaymentPlan: plan,
    summary: {
      firstPayment: plan[0].totalPayAtPeriod,
      lastPayment: plan[n - 1].totalPayAtPeriod,
      totalPrincipal: round2(P),
      extraCostOverCash: totalCost,
    },
    prepaymentAnalysis,
  };
};

// ===================== A-04 提前还款 =====================

const calcPenalty = (principal: number, type: PenaltyType, value: number): number => {
  switch (type) {
    case 'PERCENT':
      return round2((principal * value) / 100);
    case 'FIXED':
      return round2(value);
    default:
      return 0;
  }
};

export interface EarlyRepaymentInput {
  payoffPeriod: number; // 第几期后提前结清（1..n）
  penaltyType?: PenaltyType;
  penaltyValue?: number;
}

/** 提前结清（规范 A-04 4.1） */
export const calculateEarlyRepayment = (
  result: CarLoanResult,
  input: EarlyRepaymentInput
): PrepaymentAnalysis => {
  const { repaymentPlan: plan } = result;
  const { payoffPeriod, penaltyType = 'NONE', penaltyValue = 0 } = input;
  const n = plan.length;
  const k = Math.min(Math.max(1, Math.floor(payoffPeriod)), n);

  // 第 k 期还款前的剩余本金 R_{k-1}
  const remainingPrincipal = k === 1 ? result.loanAmount : plan[k - 2].remainingPrincipal;
  const monthlyRate = result.monthlyRate;
  const currentInterest = round2(remainingPrincipal * monthlyRate);
  const penalty = calcPenalty(remainingPrincipal, penaltyType, penaltyValue);

  const totalPayNow = round2(remainingPrincipal + currentInterest + penalty);

  let originalRemainingTotal = 0;
  let originalRemainingInterest = 0;
  for (let t = k; t <= n; t++) {
    originalRemainingTotal += plan[t - 1].payment;
    originalRemainingInterest += plan[t - 1].interest;
  }
  originalRemainingTotal = round2(originalRemainingTotal);
  originalRemainingInterest = round2(originalRemainingInterest);

  // 节省利息 = 原剩余总还款额 - 提前还款总额（规范 A-04 4.1）
  const saveInterest = round2(originalRemainingTotal - totalPayNow);
  const savePercentage = originalRemainingInterest > 0 ? round2((saveInterest / originalRemainingInterest) * 100) : 0;

  return {
    payoffPeriod: k,
    remainingPrincipal: round2(remainingPrincipal),
    currentInterest,
    penalty,
    totalPayNow,
    originalRemainingTotal,
    saveInterest,
    savePercentage,
    suggestion: getPrepaymentSuggestion(saveInterest, savePercentage),
  };
};

/** 盈亏平衡点分析（规范 A-04 4.3） */
export const findBestPrepaymentPeriods = (
  result: CarLoanResult,
  penaltyType: PenaltyType = 'NONE',
  penaltyValue = 0
) => {
  const plan = result.repaymentPlan;
  const details = plan.map((_, i) =>
    calculateEarlyRepayment(result, { payoffPeriod: i + 1, penaltyType, penaltyValue })
  );
  let maxSave = -Infinity;
  for (const d of details) maxSave = Math.max(maxSave, d.saveInterest);
  const bestItem = details.find((d) => d.saveInterest === maxSave) || details[0];
  const bestPeriod = bestItem.payoffPeriod;
  return {
    bestPeriod,
    bestSave: maxSave,
    recommendStart: Math.max(1, bestPeriod - 2),
    recommendEnd: Math.min(plan.length, bestPeriod + 2),
    details,
  };
};

/** 提前还款建议文案（规范 A-04 4.4） */
export const getPrepaymentSuggestion = (saveInterest: number, _percentage: number): string => {
  if (saveInterest <= 0) return '⚠️ 提前还款无节省，当前不建议提前结清。';
  if (saveInterest >= 10000) return '✅ 强烈推荐！提前还款可节省超 1 万元利息。';
  if (saveInterest >= 5000) return '✅ 推荐！提前还款可节省近 5000 元利息。';
  if (saveInterest >= 1000) return '💡 建议，提前还款可节省少量利息。';
  return '💡 节省金额较少，可根据资金情况决定是否提前还款。';
};

// ===================== 参数校验（规范 3.1） =====================

export const validateCarInput = (input: CarLoanInput, params?: CarCalcParams): string[] => {
  const p = params ?? DEFAULT_CALC_PARAMS;
  const errors: string[] = [];
  if (!input.loanAmount || input.loanAmount <= 0) errors.push('请输入有效贷款金额');
  if (input.loanAmount > 5000000) errors.push('贷款金额不能超过 500 万');
  if (!input.loanTerm || input.loanTerm <= 0) errors.push('贷款期限必须大于 0');
  if (p.loanTermOptions.length && !p.loanTermOptions.includes(input.loanTerm))
    errors.push(`期限仅支持：${p.loanTermOptions.join('/')} 期`);
  if (input.annualRate < p.rateMin || input.annualRate > p.rateMax)
    errors.push(`年化利率应在 ${p.rateMin}%~${p.rateMax}% 之间`);
  if (input.repaymentType && !['EQUAL_PI', 'EQUAL_P', 'INTEREST_FIRST', 'BALLOON'].includes(input.repaymentType))
    errors.push('还款方式不合法');
  if (input.balloonRatio != null && (input.balloonRatio <= 0 || input.balloonRatio >= 100))
    errors.push('气球贷尾款比例应在 1%~99% 之间');
  const fees = input.fees || [];
  if (fees.length > p.maxCustomFees) errors.push(`费用项最多 ${p.maxCustomFees} 项`);
  for (const f of fees) {
    if (f.amount < 0) errors.push(`费用「${f.type}」不能为负`);
    if (f.amount > p.maxFeeAmount) errors.push(`费用「${f.type}」超过上限 ${p.maxFeeAmount}`);
  }
  return errors;
};

// ===================== A-03 多方案对比引擎 =====================

export interface CompareItem {
  id: string;
  name: string;
  irr: number;
  irrConverged: boolean;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  totalFee: number;
  totalCost: number; // 总利息 + 总费用
  extraCostOverCash: number; // 比全款多花（= totalCost）
  isRecommended: boolean;
  rank: number;
  prepaymentAnalysis?: PrepaymentAnalysis;
}

export interface CompareResult {
  schemes: CompareItem[];
  recommendation: {
    schemeId: string;
    reason: string;
    saveAmount: number; // 相比最差方案节省金额
  };
  summary: {
    bestIRR: number;
    worstIRR: number;
    avgIRR: number;
    bestMonthlyPayment: number;
    bestTotalCost: number;
  };
}

/** 多方案对比（规范 A-03） */
export const compareSchemes = (
  inputs: { id: string; name: string; input: CarLoanInput }[]
): CompareResult => {
  const items: CompareItem[] = inputs.map((s) => {
    const res = calculateCarLoan(s.input);
    return {
      id: s.id,
      name: s.name,
      irr: res.irr,
      irrConverged: res.irrConverged,
      monthlyPayment: res.monthlyPayment,
      totalPayment: res.totalPayment,
      totalInterest: res.totalInterest,
      totalFee: res.totalFee,
      totalCost: res.totalCost,
      extraCostOverCash: res.totalCost,
      isRecommended: false,
      rank: 0,
      prepaymentAnalysis: res.prepaymentAnalysis,
    };
  });

  // 排序：IRR 升序（未收敛排末尾）；平局依次比 总费用/总利息/月供
  const sortKey = (it: CompareItem) => (it.irrConverged ? it.irr : Infinity);
  const sorted = [...items].sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    if (ka !== kb) return ka - kb;
    if (a.totalFee !== b.totalFee) return a.totalFee - b.totalFee;
    if (a.totalInterest !== b.totalInterest) return a.totalInterest - b.totalInterest;
    return a.monthlyPayment - b.monthlyPayment;
  });

  sorted.forEach((it, i) => {
    it.rank = i + 1;
    it.isRecommended = i === 0;
  });

  const converged = sorted.filter((it) => it.irrConverged);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const bestIRR = converged.length ? converged[0].irr : 0;
  const worstIRR = converged.length ? converged[converged.length - 1].irr : 0;
  const avgIRR = converged.length
    ? round2(converged.reduce((s, it) => s + it.irr, 0) / converged.length)
    : 0;
  const saveAmount = round2(worst.totalCost - best.totalCost);

  return {
    schemes: sorted,
    recommendation: {
      schemeId: best.id,
      reason: `真实年化(IRR)最低，约 ${best.irr.toFixed(2)}%，比最差方案少花 ¥${saveAmount}`,
      saveAmount,
    },
    summary: {
      bestIRR,
      worstIRR,
      avgIRR,
      bestMonthlyPayment: best.monthlyPayment,
      bestTotalCost: best.totalCost,
    },
  };
};
