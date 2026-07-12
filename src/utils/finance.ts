import { ComplianceStatus, checkCompliance, getLegalLimit, getLatestLPR, matchLPRByDate } from '../data/lpr';

export interface CalculationParams {
  mode: 'fixed' | 'custom' | 'fee';
  principal: number;
  fixedPayment?: number;
  customPayments?: number[];
  periods?: number;
  loanDate?: string;
  paidPeriods?: number;
}

export type ExcessLevel = 'none' | 'slight' | 'moderate' | 'severe';

export interface CalculationResult {
  irr: number;
  irrCompound: number;
  monthlyIRR: number;
  nominalAPR: number;
  complianceStatus: ComplianceStatus;
  complianceLimit: number;
  lprUsed: number;
  lprDate: string;
  totalPayment: number;
  totalInterest: number;
  excessInterest: number;
  excessPaid: number;
  excessDetails?: { tier: string; amount: number }[];
  excessLevel: ExcessLevel;
  actionSuggestion: string;
  avgPayment?: number;
  maxPayment?: number;
  minPayment?: number;
  paymentConcentration?: number;
  periods: number;
  cashFlows: number[];
  dataInsufficient?: boolean;
  verificationError?: number;
}

export const buildFixedCashFlow = (principal: number, monthlyPayment: number, periods: number): number[] => {
  const cashFlow = [-principal];
  for (let i = 0; i < periods; i++) {
    cashFlow.push(monthlyPayment);
  }
  return cashFlow;
};

export const getExcessLevelAndSuggestion = (irr: number, limit: number): { level: ExcessLevel; suggestion: string } => {
  if (irr <= limit) {
    return { level: 'none', suggestion: '' };
  }

  const ratio = irr / limit;

  if (ratio <= 1.2) {
    return { level: 'slight', suggestion: '建议与平台沟通，确认费用构成是否合规' };
  } else if (ratio <= 1.5) {
    return { level: 'moderate', suggestion: '该利率已超法定上限，可主张调整，建议咨询专业律师' };
  } else {
    return { level: 'severe', suggestion: '该利率严重超标，可向金融监管部门投诉举报' };
  }
};

export const buildCustomCashFlow = (principal: number, payments: number[]): number[] => {
  return [-principal, ...payments];
};

export const calculateNPV = (cashFlows: number[], rate: number): number => {
  let npv = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t] / Math.pow(1 + rate, t);
  }
  return npv;
};

export const calculateIRR = (cashFlows: number[], guess: number = 0.1): number => {
  if (cashFlows.length < 2) return 0;

  const eps = 1e-7;
  const maxIter = 1000;

  for (let i = 0; i < maxIter; i++) {
    let npv = 0;
    let derivative = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const denom = Math.pow(1 + guess, t);
      npv += cashFlows[t] / denom;
      derivative -= t * cashFlows[t] / Math.pow(1 + guess, t + 1);
    }

    if (Math.abs(derivative) < 1e-12) break;

    const newGuess = guess - npv / derivative;

    if (Math.abs(newGuess - guess) < eps) {
      return newGuess;
    }

    if (newGuess < -0.99 || newGuess > 10) break;

    guess = newGuess;
  }

  return guess;
};

export const calculateIRRWithMultipleGuesses = (cashFlows: number[]): number => {
  const guesses = [0.01, 0.05, 0.1, 0.2, 0.5];
  let bestResult = 0;
  let bestError = Infinity;

  for (const guess of guesses) {
    try {
      const result = calculateIRR(cashFlows, guess);
      const error = Math.abs(calculateNPV(cashFlows, result));
      if (error < bestError && result >= -0.5 && result <= 10) {
        bestError = error;
        bestResult = result;
      }
    } catch (e) {
      continue;
    }
  }

  return bestResult;
};

export const annualizedIRR = (monthlyIRR: number): number => {
  return monthlyIRR * 12;
};

export const annualizedIRRCompound = (monthlyIRR: number): number => {
  return Math.pow(1 + monthlyIRR, 12) - 1;
};

export const calculateExcessInterest = (
  totalInterest: number,
  irr: number,
  lpr: number,
  paidPeriods: number,
  totalPeriods: number
): { excessInterest: number; excessPaid: number; excessDetails: { tier: string; amount: number }[] } => {
  const lprLimit = lpr * 4;
  const legalLimit = 24;

  let excessInterest = 0;
  const excessDetails: { tier: string; amount: number }[] = [];

  if (irr <= lprLimit) {
    return { excessInterest: 0, excessPaid: 0, excessDetails: [] };
  }

  if (irr > lprLimit && irr <= legalLimit) {
    const excessRate = irr - lprLimit;
    const excessRatio = excessRate / irr;
    excessInterest = totalInterest * excessRatio;
    excessDetails.push({ tier: `超出LPR×4 (${lprLimit.toFixed(1)}%)`, amount: excessInterest });
  } else if (irr > legalLimit) {
    const lprExcessRatio = (legalLimit - lprLimit) / irr;
    const lprExcess = totalInterest * lprExcessRatio;

    const highExcessRatio = (irr - legalLimit) / irr;
    const highExcess = totalInterest * highExcessRatio;

    excessInterest = lprExcess + highExcess;
    excessDetails.push({ tier: `超出LPR×4 (${lprLimit.toFixed(1)}%-${legalLimit}%)`, amount: lprExcess });
    excessDetails.push({ tier: `超出24% (${legalLimit}%+)`, amount: highExcess });
  }

  const excessPaid = paidPeriods > 0 ? excessInterest * (paidPeriods / totalPeriods) : 0;

  return { excessInterest, excessPaid, excessDetails };
};

export const calculateNominalAPR = (principal: number, totalInterest: number, periods: number): number => {
  if (principal <= 0 || periods <= 0) return 0;
  const years = periods / 12;
  return (totalInterest / principal / years);
};

export const generateArithmeticSequence = (first: number, last: number, count: number): number[] => {
  if (count <= 0) return [];
  if (count === 1) return [first];
  const step = (last - first) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round((first + step * i) * 100) / 100);
};

export const generateGeometricSequence = (first: number, last: number, count: number): number[] => {
  if (count <= 0) return [];
  if (count <= 1 || first <= 0 || last <= 0) return Array(count).fill(first);
  const ratio = Math.pow(last / first, 1 / (count - 1));
  return Array.from({ length: count }, (_, i) => Math.round(first * Math.pow(ratio, i) * 100) / 100);
};

export const parsePastedPayments = (text: string): number[] => {
  if (!text || text.trim() === '') return [];

  let cleaned = text.trim();

  cleaned = cleaned.replace(/<[^>]*>/g, ' ');

  cleaned = cleaned.replace(/[¥￥]/g, '');

  cleaned = cleaned.replace(/(?<=\d)\s+(?=\d)/g, ',');

  const numberPattern = /-?\d+(?:\.\d+)?/g;
  const matches = cleaned.match(numberPattern);

  if (!matches) return [];

  const numbers = matches.map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);

  return numbers.length > 0 ? numbers : [];
};

export const parsePastedPaymentsWithInfo = (text: string): { numbers: number[], sourceFormat: string } => {
  if (!text || text.trim() === '') return { numbers: [], sourceFormat: 'empty' };

  let sourceFormat = 'unknown';
  const cleaned = text.trim();

  if (cleaned.includes('<table') || cleaned.includes('<tr') || cleaned.includes('<td')) {
    sourceFormat = 'html_table';
  } else if (cleaned.includes('\t')) {
    sourceFormat = 'tab_separated';
  } else if (cleaned.includes('，') || cleaned.includes('；')) {
    sourceFormat = 'chinese_delimiter';
  } else if (cleaned.includes(',')) {
    sourceFormat = 'comma_separated';
  } else if (cleaned.includes('\n')) {
    sourceFormat = 'newline_separated';
  } else {
    sourceFormat = 'single_line';
  }

  return { numbers: parsePastedPayments(text), sourceFormat };
};

export const calculatePaymentStats = (payments: number[]): {
  avgPayment: number;
  maxPayment: number;
  minPayment: number;
  paymentConcentration: number;
} => {
  if (payments.length === 0) {
    return { avgPayment: 0, maxPayment: 0, minPayment: 0, paymentConcentration: 0 };
  }

  const total = payments.reduce((a, b) => a + b, 0);
  const avg = total / payments.length;
  const max = Math.max(...payments);
  const min = Math.min(...payments);

  const halfCount = Math.ceil(payments.length / 2);
  const firstHalf = payments.slice(0, halfCount).reduce((a, b) => a + b, 0);
  const concentration = total > 0 ? firstHalf / total : 0;

  return {
    avgPayment: Math.round(avg * 100) / 100,
    maxPayment: max,
    minPayment: min,
    paymentConcentration: Math.round(concentration * 10000) / 100,
  };
};

export const calculate = (params: CalculationParams): CalculationResult | null => {
  const { mode, principal, fixedPayment, customPayments, periods, loanDate, paidPeriods = 0 } = params;

  if (!principal || principal <= 0) return null;

  let cashFlows: number[];
  let totalPeriods: number;

  if (mode === 'fixed') {
    if (!fixedPayment || fixedPayment <= 0) return null;
    if (!periods || periods < 1) return null;
    cashFlows = buildFixedCashFlow(principal, fixedPayment, periods);
    totalPeriods = periods;
  } else {
    if (!customPayments || customPayments.length === 0) return null;
    const validPayments = customPayments.filter(p => p > 0);
    if (validPayments.length === 0) return null;
    cashFlows = buildCustomCashFlow(principal, validPayments);
    totalPeriods = validPayments.length;
  }

  const monthlyIRR = calculateIRRWithMultipleGuesses(cashFlows);
  const irr = annualizedIRR(monthlyIRR);
  const irrCompound = annualizedIRRCompound(monthlyIRR);

  const lprMatch = loanDate ? matchLPRByDate(loanDate) : { lpr: getLatestLPR().value, date: getLatestLPR().date };
  const lprUsed = lprMatch.lpr;

  const complianceStatus = checkCompliance(irr * 100, lprUsed);
  const complianceLimit = lprUsed * 4;

  const totalPayment = cashFlows.slice(1).reduce((a, b) => a + b, 0);
  const totalInterest = totalPayment - principal;

  let verificationError = 0;
  if (mode === 'fixed' && fixedPayment && periods) {
    const recoveredPayment = principal * monthlyIRR / (1 - Math.pow(1 + monthlyIRR, -periods));
    verificationError = Math.abs(recoveredPayment - fixedPayment) / fixedPayment;
  }

  const nominalAPR = calculateNominalAPR(principal, totalInterest, totalPeriods);
  const { excessInterest, excessPaid, excessDetails } = calculateExcessInterest(
    totalInterest,
    irr * 100,
    lprUsed,
    paidPeriods,
    totalPeriods
  );

  let stats;
  if (mode === 'custom' && customPayments) {
    stats = calculatePaymentStats(customPayments);
  }

  const { level: excessLevel, suggestion: actionSuggestion } = getExcessLevelAndSuggestion(irr * 100, complianceLimit);

  return {
    irr: Math.round(irr * 10000) / 100,
    irrCompound: Math.round(irrCompound * 10000) / 100,
    monthlyIRR: Math.round(monthlyIRR * 10000) / 100,
    nominalAPR: Math.round(nominalAPR * 10000) / 100,
    complianceStatus,
    complianceLimit: Math.round(complianceLimit * 100) / 100,
    lprUsed,
    lprDate: lprMatch.date,
    totalPayment: Math.round(totalPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    excessInterest: Math.round(excessInterest * 100) / 100,
    excessPaid: Math.round(excessPaid * 100) / 100,
    excessLevel,
    actionSuggestion,
    excessDetails: excessDetails.map(d => ({ tier: d.tier, amount: Math.round(d.amount * 100) / 100 })),
    avgPayment: stats?.avgPayment,
    maxPayment: stats?.maxPayment,
    minPayment: stats?.minPayment,
    paymentConcentration: stats?.paymentConcentration,
    periods: totalPeriods,
    cashFlows,
    dataInsufficient: totalPeriods < 3,
    verificationError: Math.round(verificationError * 10000) / 100,
  };
};

export const calculateAllFromPayments = (
  principal: number,
  monthlyPayment: number,
  periods: number,
  lprValue: number,
  paidPeriods: number
): CalculationResult | null => {
  if (!principal || principal <= 0) return null;
  if (!monthlyPayment || monthlyPayment <= 0) return null;
  if (!periods || periods < 1) return null;

  const cashFlows = buildFixedCashFlow(principal, monthlyPayment, periods);
  const monthlyIRR = calculateIRRWithMultipleGuesses(cashFlows);
  const irr = annualizedIRR(monthlyIRR);
  const irrCompound = annualizedIRRCompound(monthlyIRR);

  const complianceStatus = checkCompliance(irr * 100, lprValue);
  const legalLimit = lprValue * 4;

  const totalPayment = cashFlows.slice(1).reduce((a, b) => a + b, 0);
  const totalInterest = totalPayment - principal;
  const nominalAPR = calculateNominalAPR(principal, totalInterest, periods);
  const { excessInterest, excessPaid, excessDetails } = calculateExcessInterest(
    totalInterest,
    irr * 100,
    lprValue,
    paidPeriods,
    periods
  );

  const recoveredPayment = principal * monthlyIRR / (1 - Math.pow(1 + monthlyIRR, -periods));
  const verificationError = Math.abs(recoveredPayment - monthlyPayment) / monthlyPayment;

  const { level: excessLevel, suggestion: actionSuggestion } = getExcessLevelAndSuggestion(irr * 100, legalLimit);

  return {
    irr: Math.round(irr * 10000) / 100,
    irrCompound: Math.round(irrCompound * 10000) / 100,
    monthlyIRR: Math.round(monthlyIRR * 10000) / 100,
    nominalAPR: Math.round(nominalAPR * 10000) / 100,
    complianceStatus,
    complianceLimit: Math.round(legalLimit * 100) / 100,
    lprUsed: lprValue,
    lprDate: getLatestLPR().date,
    totalPayment: Math.round(totalPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    excessInterest: Math.round(excessInterest * 100) / 100,
    excessPaid: Math.round(excessPaid * 100) / 100,
    excessDetails: excessDetails.map(d => ({ tier: d.tier, amount: Math.round(d.amount * 100) / 100 })),
    excessLevel,
    actionSuggestion,
    periods,
    cashFlows,
    dataInsufficient: periods < 3,
    verificationError: Math.round(verificationError * 10000) / 100,
  };
};

export const formatCurrency = (value: number): string => {
  if (isNaN(value) || value < 0) return '0';
  return Math.round(value).toLocaleString('zh-CN');
};

export const formatRate = (value: number): string => {
  if (isNaN(value)) return '0.00';
  return value.toFixed(2) + '%';
};

export const estimatePaymentRange = (principal: number, periods: number): { min: number; max: number; suggested: number } => {
  if (!principal || !periods || principal <= 0 || periods <= 0) {
    return { min: 0, max: 0, suggested: 0 };
  }

  const lpr = getLatestLPR().value / 100;
  const minRate = lpr * 0.5;
  const maxRate = lpr * 4;
  const suggestedRate = lpr * 1.5;

  const minPayment = principal * minRate / (1 - Math.pow(1 + minRate, -periods));
  const maxPayment = principal * maxRate / (1 - Math.pow(1 + maxRate, -periods));
  const suggestedPayment = principal * suggestedRate / (1 - Math.pow(1 + suggestedRate, -periods));

  return {
    min: Math.round(minPayment * 100) / 100,
    max: Math.round(maxPayment * 100) / 100,
    suggested: Math.round(suggestedPayment * 100) / 100,
  };
};

export const generateCSV = (params: CalculationParams, result: CalculationResult, fees: any[]): string => {
  let csv = '项目,数值\n';
  csv += `计算时间,${new Date().toLocaleString()}\n`;
  csv += `本金,¥${params.principal.toFixed(2)}\n`;
  csv += `贷款时间,${params.loanDate || ''}\n`;
  csv += `已还期数,${params.paidPeriods || 0}\n`;

  if (params.mode === 'fixed') {
    csv += `月供,¥${(params.fixedPayment || 0).toFixed(2)}\n`;
    csv += `期限,${params.periods || 0}期\n`;
  } else if (params.mode === 'custom') {
    csv += `期限,${(params.customPayments || []).length}期\n`;
  }

  csv += '\n计算结果\n';
  csv += `实际年化利率(IRR),${result.irr.toFixed(2)}%\n`;
  csv += `名义APR,${result.nominalAPR.toFixed(2)}%\n`;
  csv += `合规状态,${result.complianceStatus === 'compliant' ? '合规' : result.complianceStatus === 'warning' ? '偏高' : '超额'}\n`;
  csv += `法定上限(LPR×4),${result.complianceLimit.toFixed(2)}%\n`;
  csv += `总还款额,¥${result.totalPayment.toFixed(2)}\n`;
  csv += `总利息,¥${result.totalInterest.toFixed(2)}\n`;
  csv += `超额利息,¥${result.excessInterest.toFixed(2)}\n`;

  if (result.excessDetails && result.excessDetails.length > 0) {
    csv += '\n超额利息明细\n';
    result.excessDetails.forEach(d => {
      csv += `${d.tier},¥${d.amount.toFixed(2)}\n`;
    });
  }

  if (fees && fees.length > 0) {
    csv += '\n费用明细\n';
    fees.forEach(fee => {
      csv += `${fee.name},¥${fee.amount.toFixed(2)},${fee.chargeType === 'monthly' ? '每月' : '一次性'}\n`;
    });
  }

  return csv;
};

export const generateReportText = (params: CalculationParams, result: CalculationResult, fees: any[]): string => {
  let text = `📊 网贷利率检测报告\n\n`;
  text += `📅 计算时间：${new Date().toLocaleString()}\n\n`;
  text += `💰 贷款信息\n`;
  text += `  • 本金：¥${params.principal.toFixed(2)}\n`;
  text += `  • 贷款时间：${params.loanDate || '未填写'}\n`;
  text += `  • 已还期数：${params.paidPeriods || 0}\n`;

  if (params.mode === 'fixed') {
    text += `  • 月供：¥${(params.fixedPayment || 0).toFixed(2)}\n`;
    text += `  • 期限：${params.periods || 0}期\n`;
  }

  text += `\n📈 计算结果\n`;
  text += `  • 实际年化利率(IRR)：${result.irr.toFixed(2)}%\n`;
  text += `  • 名义APR：${result.nominalAPR.toFixed(2)}%\n`;
  text += `  • 合规状态：${result.complianceStatus === 'compliant' ? '🟢 合规' : result.complianceStatus === 'warning' ? '🟡 偏高' : '🔴 超额'}\n`;
  text += `  • 法定上限(LPR×4)：${result.complianceLimit.toFixed(2)}%\n`;
  text += `  • 总还款额：¥${result.totalPayment.toFixed(2)}\n`;
  text += `  • 总利息：¥${result.totalInterest.toFixed(2)}\n`;

  if (result.excessInterest > 0) {
    text += `  • 超额利息：¥${result.excessInterest.toFixed(2)}\n`;
  }

  text += `\n⚖️ 法律依据\n`;
  text += `《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第二十五条\n`;
  text += `出借人请求借款人按照合同约定利率支付利息的，人民法院应予支持，但是双方约定的利率超过合同成立时一年期LPR四倍的除外\n`;

  if (result.complianceStatus !== 'compliant') {
    text += `\n💡 行动建议\n`;
    text += `1. 收集还款记录、合同等证据\n`;
    text += `2. 与贷款平台协商调整利率\n`;
    text += `3. 如协商无果，可向监管部门投诉或通过法律途径解决\n`;
  }

  return text;
};
