import { View, Text, ScrollView, Picker } from '@tarojs/components';
import { useState, useMemo, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { InputNumber, Button, Toast, Popup } from '@nutui/nutui-react-taro';
import {
  RepayMethod,
  LoanType,
  CalcMode,
  RateType,
  MortgageInput,
  MortgageResult,
  BASE_RATE,
  RATE_TYPE_OPTIONS,
  validateMortgageInput,
  calculateMortgage,
  calcLoanByRatio,
  formatManYuan,
} from '../../utils/mortgage';
import { formatCurrency } from '../../utils/finance';
import CustomTabBar from '../../components/CustomTabBar/custom-tab-bar';
import './index.less';

const METHOD_OPTIONS: { key: RepayMethod; label: string; desc: string }[] = [
  { key: 'equalPrincipalInterest', label: '等额本息', desc: '每月还款金额固定' },
  { key: 'equalPrincipal', label: '等额本金', desc: '月供逐月递减' },
];

const LOAN_TYPE_OPTIONS: { key: LoanType; label: string }[] = [
  { key: 'commercial', label: '商业贷' },
  { key: 'combination', label: '组合贷' },
  { key: 'fund', label: '公积金贷' },
];

const CALC_MODE_OPTIONS: { key: CalcMode; label: string }[] = [
  { key: 'byTotal', label: '按贷款总额' },
  { key: 'byRatio', label: '按揭比例' },
];

const YEAR_OPTIONS = [5, 10, 15, 20, 25, 30];

const STORAGE_KEY = 'mortgage_params';

export default function MortgagePage() {
  /* ---- 表单状态 ---- */
  const [repayMethod, setRepayMethod] = useState<RepayMethod>('equalPrincipalInterest');
  const [loanType, setLoanType] = useState<LoanType>('commercial');
  const [calcMode, setCalcMode] = useState<CalcMode>('byTotal');
  const [housePrice, setHousePrice] = useState<number>(200);
  const [loanTotal, setLoanTotal] = useState<number>(140);
  const [ratio, setRatio] = useState<number>(70);
  const [years, setYears] = useState<number>(20);
  const [firstPayDate] = useState<string>('2026-07');
  const [commercialRate, setCommercialRate] = useState<number>(BASE_RATE);
  const [rateType, setRateType] = useState<RateType>('base');
  const [fundRate, setFundRate] = useState<number>(3.25);
  const [fundAmount, setFundAmount] = useState<number>(50);

  /* ---- 结果与弹窗 ---- */
  const [result, setResult] = useState<MortgageResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  const isCombination = loanType === 'combination';
  const showFundFields = loanType === 'fund' || isCombination;
  const showCommercialRate = loanType === 'commercial' || isCombination;

  /* ---- 输入对象 ---- */
  const input: MortgageInput = useMemo(() => ({
    repayMethod,
    loanType,
    calcMode,
    housePrice,
    loanTotal,
    ratio,
    years,
    firstPayDate,
    commercialRate,
    fundRate,
    fundAmount,
  }), [repayMethod, loanType, calcMode, housePrice, loanTotal, ratio, years, firstPayDate, commercialRate, fundRate, fundAmount]);

  /* ---- 计算后的贷款总额展示 ---- */
  const displayLoanTotal = useMemo(() => {
    if (calcMode === 'byRatio') return calcLoanByRatio(housePrice, ratio);
    return loanTotal;
  }, [calcMode, housePrice, ratio, loanTotal]);

  /* ---- 校验 ---- */
  const canSubmit = useMemo(() => validateMortgageInput(input).length === 0, [input]);

  /* ---- 利率类型切换 ---- */
  const handleRateType = (type: RateType) => {
    setRateType(type);
    const opt = RATE_TYPE_OPTIONS.find(o => o.key === type);
    if (opt) {
      setCommercialRate(round2(BASE_RATE * opt.multiplier));
    }
  };

  /* ---- 本地缓存 ---- */
  const saveCache = () => {
    const data = { repayMethod, loanType, calcMode, housePrice, loanTotal, ratio, years, commercialRate, rateType, fundRate, fundAmount };
    Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
  };

  useEffect(() => {
    const cached = Taro.getStorageSync(STORAGE_KEY);
    if (cached && typeof cached === 'string') {
      try {
        const d = JSON.parse(cached);
        if (d.repayMethod) setRepayMethod(d.repayMethod);
        if (d.loanType) setLoanType(d.loanType);
        if (d.calcMode) setCalcMode(d.calcMode);
        if (d.housePrice) setHousePrice(d.housePrice);
        if (d.loanTotal) setLoanTotal(d.loanTotal);
        if (d.ratio) setRatio(d.ratio);
        if (d.years) setYears(d.years);
        if (d.commercialRate) setCommercialRate(d.commercialRate);
        if (d.rateType) setRateType(d.rateType);
        if (d.fundRate) setFundRate(d.fundRate);
        if (d.fundAmount) setFundAmount(d.fundAmount);
      } catch (e) { console.error('parse mortgage cache error:', e); }
    }
  }, []);

  useEffect(() => { saveCache(); }, [repayMethod, loanType, calcMode, housePrice, loanTotal, ratio, years, commercialRate, rateType, fundRate, fundAmount]);

  /* ---- 计算 ---- */
  const handleCalc = () => {
    const errs = validateMortgageInput(input);
    if (errs.length) {
      setToast({ show: true, msg: errs[0] });
      return;
    }
    const res = calculateMortgage(input);
    if (!res) {
      setToast({ show: true, msg: '计算失败，请检查输入' });
      return;
    }
    setResult(res);
    setShowResult(true);
  };

  return (
    <View className="mortgage-page">
      {/* 顶部标题 */}
      <View className="mortgage-header">
        <View className="header-main">
          <Text className="header-title">房贷计算器</Text>
          <Text className="header-sub">商业贷 / 公积金贷 / 组合贷</Text>
        </View>
      </View>

      <ScrollView className="mortgage-body" scrollY>
        {/* 1. 还款方式 */}
        <View className="section">
          <Text className="section-title">还款方式</Text>
          <View className="method-grid">
            {METHOD_OPTIONS.map(m => (
              <View
                key={m.key}
                className={`method-card ${repayMethod === m.key ? 'active' : ''}`}
                onClick={() => setRepayMethod(m.key)}
              >
                <View className={`method-radio ${repayMethod === m.key ? 'checked' : ''}`} />
                <View className="method-info">
                  <Text className="method-name">{m.label}</Text>
                  <Text className="method-desc">{m.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 2. 贷款类别 */}
        <View className="section">
          <Text className="section-title">贷款类别</Text>
          <View className="loan-type-grid">
            {LOAN_TYPE_OPTIONS.map(l => (
              <View
                key={l.key}
                className={`loan-type-card ${loanType === l.key ? 'active' : ''}`}
                onClick={() => setLoanType(l.key)}
              >
                <View className={`method-radio ${loanType === l.key ? 'checked' : ''}`} />
                <Text className="method-name">{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 3. 计算方式 */}
        <View className="section">
          <Text className="section-title">计算方式</Text>
          <View className="method-grid">
            {CALC_MODE_OPTIONS.map(cm => (
              <View
                key={cm.key}
                className={`method-card ${calcMode === cm.key ? 'active' : ''}`}
                onClick={() => setCalcMode(cm.key)}
              >
                <View className={`method-radio ${calcMode === cm.key ? 'checked' : ''}`} />
                <Text className="method-name">{cm.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 4. 贷款信息 */}
        <View className="section">
          <Text className="section-title">贷款信息</Text>
          <View className="form-card">
            <View className="form-row">
              <Text className="form-label">房屋总价</Text>
              <View className="form-control">
                <Text className="prefix">¥</Text>
                <InputNumber
                  value={housePrice}
                  min={1} max={10000} step={5} digits={0}
                  onChange={(v: number | string) => setHousePrice(Number(v) || 0)}
                />
                <Text className="suffix">万元</Text>
              </View>
            </View>

            {calcMode === 'byTotal' ? (
              <View className="form-row">
                <Text className="form-label">贷款总额</Text>
                <View className="form-control">
                  <Text className="prefix">¥</Text>
                  <InputNumber
                    value={loanTotal}
                    min={1} max={housePrice} step={1} digits={0}
                    onChange={(v: number | string) => setLoanTotal(Number(v) || 0)}
                  />
                  <Text className="suffix">万元</Text>
                </View>
              </View>
            ) : (
              <View className="form-row form-row-vertical">
                <View className="form-label-row">
                  <Text className="form-label">按揭比例</Text>
                  <Text className="form-value-hint">{ratio}%（贷款 {displayLoanTotal} 万）</Text>
                </View>
                <View className="form-control">
                  <InputNumber
                    value={ratio}
                    min={10} max={90} step={5} digits={0}
                    onChange={(v: number | string) => setRatio(Number(v) || 10)}
                  />
                  <Text className="suffix">%</Text>
                </View>
              </View>
            )}

            <View className="form-row">
              <Text className="form-label">按揭年数</Text>
              <View className="tag-row">
                {YEAR_OPTIONS.map(y => (
                  <View
                    key={y}
                    className={`tag-chip ${years === y ? 'active' : ''}`}
                    onClick={() => setYears(y)}
                  >
                    <Text>{y}年</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="form-row">
              <Text className="form-label">首次还款</Text>
              <View className="form-control">
                <Picker
                  mode="date"
                  fields="month"
                  value={firstPayDate}
                  start="2020-01"
                  end="2050-12"
                >
                  <View className="picker-value">
                    <Text>{firstPayDate}</Text>
                    <Text className="picker-arrow">▼</Text>
                  </View>
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* 5. 商业贷利率 */}
        {showCommercialRate && (
          <View className="section">
            <Text className="section-title">商业贷利率</Text>
            <View className="form-card">
              <View className="form-row">
                <Text className="form-label">年利率</Text>
                <View className="form-control">
                  <InputNumber
                    value={commercialRate}
                    min={0.01} max={20} step={0.01} digits={2}
                    onChange={(v: number | string) => { setCommercialRate(Number(v) || 0); setRateType('base'); }}
                  />
                  <Text className="suffix">%</Text>
                </View>
              </View>
              <View className="rate-shortcuts">
                {RATE_TYPE_OPTIONS.map(rt => (
                  <View
                    key={rt.key}
                    className={`rate-chip ${rateType === rt.key ? 'active' : ''}`}
                    onClick={() => handleRateType(rt.key)}
                  >
                    <Text className="rate-chip-label">{rt.label}</Text>
                    <Text className="rate-chip-val">{round2(BASE_RATE * rt.multiplier)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* 6. 公积金贷利率 & 金额 */}
        {showFundFields && (
          <View className="section">
            <Text className="section-title">{isCombination ? '公积金贷设置' : '公积金贷利率'}</Text>
            <View className="form-card">
              <View className="form-row">
                <Text className="form-label">年利率</Text>
                <View className="form-control">
                  <InputNumber
                    value={fundRate}
                    min={0.01} max={10} step={0.01} digits={2}
                    onChange={(v: number | string) => setFundRate(Number(v) || 0)}
                  />
                  <Text className="suffix">%</Text>
                </View>
              </View>
              {isCombination && (
                <View className="form-row">
                  <Text className="form-label">公积金金额</Text>
                  <View className="form-control">
                    <Text className="prefix">¥</Text>
                    <InputNumber
                      value={fundAmount}
                      min={1} max={displayLoanTotal - 1} step={1} digits={0}
                      onChange={(v: number | string) => setFundAmount(Number(v) || 0)}
                    />
                    <Text className="suffix">万元</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        <View className="bottom-spacer" />

        {/* 底部按钮 */}
        <View className="mortgage-footer">
          <Button type="primary" block disabled={!canSubmit} onClick={handleCalc}>
            立即计算
          </Button>
        </View>
      </ScrollView>

      {/* ========== 结果弹窗 ========== */}
      {showResult && result && (
        <View className="result-mask" onClick={() => setShowResult(false)}>
          <View className="result-panel" onClick={(e: any) => e.stopPropagation()}>
            <View className="result-head">
              <Text className="result-title">
                计算结果 · {METHOD_OPTIONS.find(m => m.key === repayMethod)?.label}
              </Text>
              <Text className="result-close" onClick={() => setShowResult(false)}>✕</Text>
            </View>
            <ScrollView className="result-scroll" scrollY>
              {/* 组合贷分项 */}
              {isCombination && result.commercialMonthly != null && result.fundMonthly != null && (
                <View className="result-block result-block-blue">
                  <Text className="result-block-title">月供分项</Text>
                  <View className="result-row">
                    <Text className="res-label">商业贷月供</Text>
                    <Text className="res-value">¥{formatCurrency(result.commercialMonthly)}</Text>
                  </View>
                  <View className="result-row">
                    <Text className="res-label">公积金月供</Text>
                    <Text className="res-value">¥{formatCurrency(result.fundMonthly)}</Text>
                  </View>
                </View>
              )}

              {/* 核心指标 */}
              <View className="result-block">
                <Text className="result-block-title">还款概览</Text>
                <View className="result-row result-highlight">
                  <Text className="res-label">月供</Text>
                  <Text className="res-value primary">
                    ¥{formatCurrency(result.monthlyPayment)}
                    {repayMethod === 'equalPrincipal' ? '起' : ''}
                  </Text>
                </View>
                <View className="result-row">
                  <Text className="res-label">还款总额</Text>
                  <Text className="res-value">¥{formatCurrency(result.totalPayment)}</Text>
                </View>
                <View className="result-row">
                  <Text className="res-label">支付利息</Text>
                  <Text className="res-value warn">¥{formatCurrency(result.totalInterest)}</Text>
                </View>
                <View className="result-row">
                  <Text className="res-label">还款本金</Text>
                  <Text className="res-value">¥{formatCurrency(result.totalPrincipal)}</Text>
                </View>
                <View className="result-row">
                  <Text className="res-label">首月利息</Text>
                  <Text className="res-value">¥{formatCurrency(result.firstMonthInterest)}</Text>
                </View>
                <View className="result-row">
                  <Text className="res-label">末月利息</Text>
                  <Text className="res-value">¥{formatCurrency(result.lastMonthInterest)}</Text>
                </View>
              </View>

              {/* 一句话结论 */}
              <View className="result-summary">
                <Text className="summary-text">
                  {repayMethod === 'equalPrincipalInterest'
                    ? '等额本息月供固定，适合收入稳定的人群'
                    : '等额本金总利息更少，但前期月供较高'}
                </Text>
              </View>
            </ScrollView>
            <View className="result-footer-btns">
              <Button className="result-btn-secondary" onClick={() => setShowResult(false)}>
                关闭
              </Button>
              <Button className="result-btn-primary" type="primary" onClick={() => { setShowResult(false); setShowSchedule(true); }}>
                查看还款计划
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* ========== 还款计划抽屉 ========== */}
      <Popup
        visible={showSchedule}
        position="bottom"
        style={{ height: '80vh', borderRadius: '24rpx 24rpx 0 0' }}
        onClose={() => setShowSchedule(false)}
      >
        <View className="schedule-drawer">
          <View className="schedule-drawer-head">
            <Text className="schedule-drawer-title">还款计划明细</Text>
            <Text className="schedule-drawer-desc">{result?.schedule.length || 0} 期</Text>
          </View>
          <View className="schedule-table-fixed">
            <View className="schedule-head">
              <Text className="col">期数</Text>
              <Text className="col">月供</Text>
              <Text className="col">本金</Text>
              <Text className="col">利息</Text>
              <Text className="col">剩余本金</Text>
            </View>
          </View>
          <ScrollView className="schedule-scroll" scrollY>
            {result?.schedule.map(r => (
              <View className="schedule-row" key={r.period}>
                <Text className="col">{r.period}</Text>
                <Text className="col">{formatCurrency(r.total * 10000)}</Text>
                <Text className="col">{formatCurrency(r.principal * 10000)}</Text>
                <Text className="col">{formatCurrency(r.interest * 10000)}</Text>
                <Text className="col">{formatCurrency(r.remainingPrincipal * 10000)}</Text>
              </View>
            ))}
          </ScrollView>
          <View className="schedule-drawer-close">
            <Button onClick={() => setShowSchedule(false)}>关闭</Button>
          </View>
        </View>
      </Popup>

      <Toast visible={toast.show} content={toast.msg} onClose={() => setToast({ show: false, msg: '' })} />
      <CustomTabBar />
    </View>
  );
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
