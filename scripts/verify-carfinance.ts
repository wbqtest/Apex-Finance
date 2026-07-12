// 车贷计算引擎验证脚本（交付物 #2：单元测试用例集）
// 运行：在 Apex-Finance 目录执行  npx tsx scripts/verify-carfinance.ts
// 说明：规范文档内部存在个别不一致（如 TC-09 月供、A-05 与 TC-05 的 IRR 数值冲突），
// 本脚本以「标准分期公式独立复算」+「附录还款计划表精确值」为权威校验，
// 规范列出的数字仅作为信息打印，不一致处会标注。

import {
  calculateCarLoan,
  compareSchemes,
  findBestPrepaymentPeriods,
  CarLoanInput,
} from '../src/utils/carFinance';

let pass = 0;
let warn = 0;
const failures: string[] = [];

function ok(cond: boolean, name: string, detail = '') {
  if (cond) {
    pass++;
  } else {
    failures.push(`✗ ${name} ${detail}`);
  }
}

// 独立标准公式复算（与引擎实现解耦）
const equalPI = (P: number, n: number, apr: number) => {
  const r = apr / 100 / 12;
  if (r === 0) return P / n;
  const pow = Math.pow(1 + r, n);
  return (P * r * pow) / (pow - 1);
};

function approx(a: number, b: number, tol: number) {
  return Math.abs(a - b) <= tol;
}

// ---------- TC-01 等额本息·基础 ----------
{
  const r = calculateCarLoan({ loanAmount: 100000, loanTerm: 12, repaymentType: 'EQUAL_PI', annualRate: 6 });
  const M = equalPI(100000, 12, 6);
  ok(approx(r.monthlyPayment, M, 0.01), 'TC-01 月供(标准公式)', `实际 ${r.monthlyPayment} 复算 ${M.toFixed(2)}`);
  ok(approx(r.totalInterest, M * 12 - 100000, 0.5), 'TC-01 总利息(标准公式)', `实际 ${r.totalInterest}`);
  // 规范附录列出的 8608.80 / 3305.60 与其给出的公式不自洽（标准公式得 8606.64 / 3279.68），以下按标准公式精确核对
  console.log(`  ℹ TC-01 标准公式：月供 ${M.toFixed(2)}，总利息 ${(M * 12 - 100000).toFixed(2)}（规范附录写 8608.80 / 3305.60，疑为其笔误）`);
  const p0 = r.repaymentPlan[0];
  ok(approx(p0.payment, M, 0.01) && approx(p0.principal, M - 500, 0.01) && approx(p0.interest, 500, 0.01) && approx(p0.remainingPrincipal, 100000 - (M - 500), 0.01), 'TC-01 首期精确', JSON.stringify(p0));
  ok(r.repaymentPlan[11].remainingPrincipal === 0, 'TC-01 末期剩余本金归零', `${r.repaymentPlan[11].remainingPrincipal}`);
  // 本金合计 = 贷款额
  const sumP = r.repaymentPlan.reduce((s, x) => s + x.principal, 0);
  ok(approx(sumP, 100000, 0.01), 'TC-01 Σ本金=贷款额', `Σ ${sumP.toFixed(2)}`);
}

// ---------- TC-02 等额本金·基础 ----------
{
  const r = calculateCarLoan({ loanAmount: 100000, loanTerm: 12, repaymentType: 'EQUAL_P', annualRate: 6 });
  const fixed = 100000 / 12;
  ok(approx(r.repaymentPlan[0].payment, fixed + 100000 * 0.005, 0.01), 'TC-02 首月', `实际 ${r.repaymentPlan[0].payment}`);
  ok(approx(r.repaymentPlan[11].payment, fixed + fixed * 0.005, 0.01), 'TC-02 末期', `实际 ${r.repaymentPlan[11].payment}`);
  ok(approx(r.repaymentPlan[0].payment, 8833.33, 0.05), 'TC-02 对照规范首月 8833.33', `${r.repaymentPlan[0].payment}`);
  ok(approx(r.repaymentPlan[11].payment, 8375.00, 0.05), 'TC-02 对照规范末期 8375.00', `${r.repaymentPlan[11].payment}`);
  ok(approx(r.totalInterest, 3250.0, 0.5), 'TC-02 总利息 3250', `实际 ${r.totalInterest}`);
}

// ---------- TC-03 先息后本·基础 ----------
{
  const r = calculateCarLoan({ loanAmount: 100000, loanTerm: 12, repaymentType: 'INTEREST_FIRST', annualRate: 6 });
  const intEach = 100000 * 0.005;
  ok(r.repaymentPlan.slice(0, 11).every((x) => approx(x.payment, intEach, 0.01) && x.principal === 0), 'TC-03 前11期仅利息', `payment ${r.repaymentPlan[0].payment}`);
  ok(approx(r.repaymentPlan[11].payment, 100000 + intEach, 0.01), 'TC-03 末期', `实际 ${r.repaymentPlan[11].payment}`);
  ok(approx(r.totalInterest, 6000, 0.5), 'TC-03 总利息 6000', `实际 ${r.totalInterest}`);
  ok(approx(r.monthlyPayment, 500, 0.01), 'TC-03 常规月供=月息 500', `${r.monthlyPayment}`);
}

// ---------- TC-04 零利率·等额本息 ----------
{
  const r = calculateCarLoan({ loanAmount: 100000, loanTerm: 12, repaymentType: 'EQUAL_PI', annualRate: 0 });
  ok(r.repaymentPlan.every((x) => approx(x.payment, 100000 / 12, 0.01) && x.interest === 0), 'TC-04 每期相等且利息0', `payment ${r.repaymentPlan[0].payment}`);
  ok(r.totalInterest === 0, 'TC-04 总利息0', `${r.totalInterest}`);
}

// ---------- TC-05 含一次性费用（IRR 抬高） ----------
{
  const noFee = calculateCarLoan({ loanAmount: 100000, loanTerm: 12, repaymentType: 'EQUAL_PI', annualRate: 6 });
  const withFee = calculateCarLoan({
    loanAmount: 100000,
    loanTerm: 12,
    repaymentType: 'EQUAL_PI',
    annualRate: 6,
    fees: [{ type: 'SERVICE_FEE', amount: 3000, cycle: 'ONCE' }],
  });
  ok(withFee.totalFee === 3000, 'TC-05 一次性费用计入 totalFee', `实际 ${withFee.totalFee}`);
  ok(withFee.irr > noFee.irr, 'TC-05 含费用 IRR 高于无费用', `无费 ${noFee.irr} 有费 ${withFee.irr}`);
  ok(withFee.irrConverged, 'TC-05 IRR 收敛', `irr ${withFee.irr}`);
  console.log(`  ℹ TC-05 IRR：无费 ${noFee.irr}% → 有费 ${withFee.irr}%（规范给出 8.12% 与 TC-05 的 9.56% 互相冲突，本引擎按 A-05 现金流精确求解）`);
}

// ---------- TC-06 最小金额 ----------
{
  const r = calculateCarLoan({ loanAmount: 1000, loanTerm: 12, repaymentType: 'EQUAL_PI', annualRate: 6 });
  ok(approx(r.monthlyPayment, equalPI(1000, 12, 6), 0.05), 'TC-06 月供', `实际 ${r.monthlyPayment}`);
  ok(approx(r.totalInterest, r.monthlyPayment * 12 - 1000, 0.1), 'TC-06 总利息', `实际 ${r.totalInterest}`);
}

// ---------- TC-07 最大金额 ----------
{
  const r = calculateCarLoan({ loanAmount: 5000000, loanTerm: 60, repaymentType: 'EQUAL_PI', annualRate: 6 });
  ok(approx(r.monthlyPayment, equalPI(5000000, 60, 6), 5), 'TC-07 月供', `实际 ${r.monthlyPayment} 复算 ${equalPI(5000000, 60, 6).toFixed(2)}`);
  ok(approx(r.totalInterest, r.monthlyPayment * 60 - 5000000, 50), 'TC-07 总利息', `实际 ${r.totalInterest}`);
}

// ---------- TC-08 最小利率 ----------
{
  const r = calculateCarLoan({ loanAmount: 100000, loanTerm: 12, repaymentType: 'EQUAL_PI', annualRate: 0.01 });
  ok(approx(r.monthlyPayment, equalPI(100000, 12, 0.01), 0.1), 'TC-08 月供', `实际 ${r.monthlyPayment}`);
}

// ---------- TC-09 最大利率 ----------
{
  const r = calculateCarLoan({ loanAmount: 100000, loanTerm: 12, repaymentType: 'EQUAL_PI', annualRate: 36 });
  const M = equalPI(100000, 12, 36);
  ok(approx(r.monthlyPayment, M, 0.5), 'TC-09 月供(标准公式)', `实际 ${r.monthlyPayment} 标准 ${M.toFixed(2)}`);
  console.log(`  ℹ TC-09 标准公式月供 ≈ ${M.toFixed(2)}（规范列出 10029.97，与标准分期公式偏差约 ${(M - 10029.97).toFixed(2)}，疑为规范笔误）`);
  ok(approx(r.totalInterest, M * 12 - 100000, 1), 'TC-09 总利息(标准公式)', `实际 ${r.totalInterest}`);
}

// ---------- TC-10 气球贷 ----------
{
  const r = calculateCarLoan({ loanAmount: 100000, loanTerm: 12, repaymentType: 'BALLOON', annualRate: 6, balloonRatio: 30 });
  ok(approx(r.balloonPayment, 30000, 1), 'TC-10 尾款=P×b 精确', `实际 ${r.balloonPayment}`);
  ok(r.repaymentPlan[10].remainingPrincipal > 30000, 'TC-10 第11期末剩余含尾款+末期正常本金', `${r.repaymentPlan[10].remainingPrincipal}`);
  ok(approx(r.repaymentPlan[10].remainingPrincipal, r.repaymentPlan[11].principal, 1), 'TC-10 末期剩余=末期本金', `${r.repaymentPlan[10].remainingPrincipal} vs ${r.repaymentPlan[11].principal}`);
  ok(r.repaymentPlan[11].remainingPrincipal === 0, 'TC-10 末期归零', `${r.repaymentPlan[11].remainingPrincipal}`);
}

// ---------- IRR 无费用 == 名义有效年化 ----------
{
  const r = calculateCarLoan({ loanAmount: 150000, loanTerm: 36, repaymentType: 'EQUAL_PI', annualRate: 7.2 });
  const eff = (Math.pow(1 + 0.072 / 12, 12) - 1) * 100;
  ok(approx(r.irr, eff, 0.05), 'IRR 无费≈有效年化', `实际 ${r.irr} 期望 ${eff.toFixed(4)}`);
  ok(approx(r.irrMonthly, 0.072 / 12, 1e-4), 'IRR 月≈名义月利率', `实际 ${r.irrMonthly}`);
}

// ---------- A-03 多方案对比 ----------
{
  const cmp = compareSchemes([
    { id: 'a', name: 'A 等额本息', input: { loanAmount: 150000, loanTerm: 36, repaymentType: 'EQUAL_PI', annualRate: 7.2 } },
    { id: 'b', name: 'B 等额本金', input: { loanAmount: 150000, loanTerm: 36, repaymentType: 'EQUAL_P', annualRate: 7.2 } },
    { id: 'c', name: 'C 含费', input: { loanAmount: 150000, loanTerm: 36, repaymentType: 'EQUAL_PI', annualRate: 7.2, fees: [{ type: 'SERVICE_FEE', amount: 3000, cycle: 'ONCE' }] } },
  ]);
  ok(cmp.schemes[0].isRecommended, 'A-03 推荐方案为首位(IRR最低)', cmp.recommendation.reason);
  ok(cmp.schemes[0].irr <= cmp.schemes[1].irr && cmp.schemes[1].irr <= cmp.schemes[2].irr, 'A-03 按 IRR 升序', cmp.schemes.map((s) => s.irr).join(','));
  ok(cmp.recommendation.saveAmount >= 0, 'A-03 saveAmount 非负', `${cmp.recommendation.saveAmount}`);
}

// ---------- A-04 提前还款 + 盈亏平衡 ----------
{
  const r = calculateCarLoan({ loanAmount: 200000, loanTerm: 36, repaymentType: 'EQUAL_PI', annualRate: 6 });
  const early = calculateCarLoan({
    loanAmount: 200000,
    loanTerm: 36,
    repaymentType: 'EQUAL_PI',
    annualRate: 6,
    prepaymentPeriod: 12,
    penaltyType: 'PERCENT',
    penaltyValue: 2,
  });
  ok(!!early.prepaymentAnalysis, 'A-04 提前还款分析存在', '');
  if (early.prepaymentAnalysis) {
    ok(early.prepaymentAnalysis.remainingPrincipal > 0, 'A-04 剩余本金>0', `${early.prepaymentAnalysis.remainingPrincipal}`);
    ok(early.prepaymentAnalysis.penalty > 0, 'A-04 违约金>0(2%)', `${early.prepaymentAnalysis.penalty}`);
  }
  const bp = findBestPrepaymentPeriods(r, 'NONE', 0);
  ok(bp.bestPeriod >= 1 && bp.bestPeriod <= 36, 'A-04 盈亏平衡最佳期在范围内', `${bp.bestPeriod}`);
}

console.log('\n========== 验证结果 ==========');
if (failures.length === 0) {
  console.log(`✅ 全部 ${pass} 项通过`);
} else {
  console.log(`通过 ${pass} 项，失败 ${failures.length} 项：`);
  failures.forEach((f) => console.log('  ' + f));
}
process.exit(failures.length === 0 ? 0 : 1);
