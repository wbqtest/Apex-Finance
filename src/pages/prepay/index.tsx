import { View, Text, ScrollView, Picker } from '@tarojs/components';
import { useState, useMemo } from 'react';
import { InputNumber, Button, Toast } from '@nutui/nutui-react-taro';
import {
  PrepayInput,
  PrepayResult,
  RepaymentType,
  PenaltyType,
  PrepayType,
  validatePrepayInput,
  calculatePrepay,
} from '../../utils/prepayCalc';
import { formatCurrency } from '../../utils/finance';
import CustomTabBar from '../../components/CustomTabBar/custom-tab-bar';
import './index.less';

const METHOD_OPTIONS: { key: RepaymentType; label: string }[] = [
  { key: 'EQUAL_PI', label: '等额本息' },
  { key: 'EQUAL_P', label: '等额本金' },
];

const PENALTY_OPTIONS: { key: PenaltyType; label: string }[] = [
  { key: 'NONE', label: '无' },
  { key: 'PERCENT', label: '百分比' },
  { key: 'FIXED', label: '固定金额' },
];

const PREPAY_OPTIONS: { key: PrepayType; label: string }[] = [
  { key: 'FULL', label: '全部偿还' },
  { key: 'PARTIAL', label: '部分偿还' },
];

export default function PrepayCalcPage() {
  /* ---- 表单状态 ---- */
  const [loanAmount, setLoanAmount] = useState<number>(500000);
  const [loanYears, setLoanYears] = useState<number>(20);
  const [annualRate, setAnnualRate] = useState<number>(4.2);
  const [repaymentType, setRepaymentType] = useState<RepaymentType>('EQUAL_PI');
  const [firstPaymentDate, setFirstPaymentDate] = useState('2023-01-15');
  const [prepaymentDate, setPrepaymentDate] = useState('2026-07-15');
  const [penaltyType, setPenaltyType] = useState<PenaltyType>('NONE');
  const [penaltyValue, setPenaltyValue] = useState<number>(0);
  const [prepayType, setPrepayType] = useState<PrepayType>('FULL');
  const [partialAmount, setPartialAmount] = useState<number>(0);

  /* ---- 结果弹窗 ---- */
  const [result, setResult] = useState<PrepayResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  /* ---- Toast ---- */
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  const input: PrepayInput = useMemo(
    () => ({
      loanAmount,
      loanYears,
      annualRate,
      repaymentType,
      firstPaymentDate,
      prepaymentDate,
      penaltyType,
      penaltyValue,
      prepayType,
      partialAmount,
    }),
    [loanAmount, loanYears, annualRate, repaymentType, firstPaymentDate, prepaymentDate, penaltyType, penaltyValue, prepayType, partialAmount]
  );

  /** 表单是否可提交 */
  const canSubmit = useMemo(() => {
    return validatePrepayInput(input).length === 0;
  }, [input]);

  const handleCalc = () => {
    const errs = validatePrepayInput(input);
    if (errs.length) {
      setToast({ show: true, msg: errs[0] });
      return;
    }
    const res = calculatePrepay(input);
    if (!res) {
      setToast({ show: true, msg: '计算失败，请检查输入' });
      return;
    }
    setResult(res);
    setShowResult(true);
  };

  const handleCloseResult = () => {
    setShowResult(false);
  };

  /* 日期格式化显示 */
  const fmtDate = (d: string) => (d || '请选择');

  return (
    <View className="prepay-page">
      {/* 顶部标题 */}
      <View className="prepay-header">
        <View className="header-main">
          <Text className="header-title">提前还款计算器</Text>
          <Text className="header-sub">精准测算提前还款能省多少利息</Text>
        </View>
      </View>

      <ScrollView className="prepay-body" scrollY>
        {/* 还款方式 */}
        <View className="section">
          <Text className="section-title">还款方式</Text>
          <View className="method-grid">
            {METHOD_OPTIONS.map((m) => (
              <View
                key={m.key}
                className={`method-card ${repaymentType === m.key ? 'active' : ''}`}
                onClick={() => setRepaymentType(m.key)}
              >
                <View className={`method-radio ${repaymentType === m.key ? 'checked' : ''}`} />
                <Text className="method-name">{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 贷款信息 */}
        <View className="section">
          <Text className="section-title">贷款信息</Text>
          <View className="form-card">
            <View className="form-row">
              <Text className="form-label">贷款金额</Text>
              <View className="form-control">
                <Text className="prefix">¥</Text>
                <InputNumber
                  value={loanAmount}
                  min={0}
                  max={100000000}
                  step={10000}
                  onChange={(v: number | string) => setLoanAmount(Number(v) || 0)}
                />
              </View>
            </View>

            <View className="form-row form-row-vertical">
              <View className="form-label-row">
                <Text className="form-label">贷款期限</Text>
                <View className="form-control form-control-inline">
                  <InputNumber
                    value={loanYears}
                    min={1}
                    max={50}
                    step={1}
                    digits={0}
                    onChange={(v: number | string) => setLoanYears(Number(v) || 1)}
                  />
                  <Text className="suffix">年</Text>
                </View>
              </View>
              <View className="tag-row">
                {[5, 10, 15, 20, 25, 30].map((y) => (
                  <View
                    key={y}
                    className={`tag-chip ${loanYears === y ? 'active' : ''}`}
                    onClick={() => setLoanYears(y)}
                  >
                    <Text>{y}年</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="form-row">
              <Text className="form-label">贷款利率</Text>
              <View className="form-control">
                <InputNumber
                  value={annualRate}
                  min={0}
                  max={36}
                  step={0.05}
                  digits={2}
                  onChange={(v: number | string) => setAnnualRate(Number(v) || 0)}
                />
                <Text className="suffix">%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 还款日期 */}
        <View className="section">
          <Text className="section-title">还款日期</Text>
          <View className="form-card">
            <View className="form-row">
              <Text className="form-label">首次还款日期</Text>
              <View className="form-control">
                <Picker
                  mode="date"
                  value={firstPaymentDate}
                  start="2000-01-01"
                  end="2050-12-31"
                  onChange={(e) => setFirstPaymentDate(e.detail.value)}
                >
                  <View className="picker-value">
                    <Text>{firstPaymentDate}</Text>
                    <Text className="picker-arrow">▼</Text>
                  </View>
                </Picker>
              </View>
            </View>

            <View className="form-row">
              <Text className="form-label">提前还款日期</Text>
              <View className="form-control">
                <Picker
                  mode="date"
                  value={prepaymentDate}
                  start={firstPaymentDate}
                  end="2050-12-31"
                  onChange={(e) => setPrepaymentDate(e.detail.value)}
                >
                  <View className="picker-value">
                    <Text>{prepaymentDate}</Text>
                    <Text className="picker-arrow">▼</Text>
                  </View>
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* 违约金 */}
        <View className="section">
          <Text className="section-title">违约金设置</Text>
          <View className="form-card">
            <View className="form-row">
              <Text className="form-label">违约金类型</Text>
              <View className="seg">
                {PENALTY_OPTIONS.map((p) => (
                  <View
                    key={p.key}
                    className={`seg-item ${penaltyType === p.key ? 'active' : ''}`}
                    onClick={() => setPenaltyType(p.key)}
                  >
                    <Text>{p.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {penaltyType !== 'NONE' && (
              <View className="form-row">
                <Text className="form-label">
                  {penaltyType === 'PERCENT' ? '违约金比例' : '违约金金额'}
                </Text>
                <View className="form-control">
                  <InputNumber
                    value={penaltyValue}
                    min={0}
                    max={penaltyType === 'PERCENT' ? 10 : 100000}
                    step={penaltyType === 'PERCENT' ? 0.5 : 100}
                    digits={penaltyType === 'PERCENT' ? 2 : 0}
                    onChange={(v: number | string) => setPenaltyValue(Number(v) || 0)}
                  />
                  <Text className="suffix">{penaltyType === 'PERCENT' ? '%' : '元'}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* 提前还款方式 */}
        <View className="section">
          <Text className="section-title">提前还款方式</Text>
          <View className="method-grid">
            {PREPAY_OPTIONS.map((p) => (
              <View
                key={p.key}
                className={`method-card ${prepayType === p.key ? 'active' : ''}`}
                onClick={() => setPrepayType(p.key)}
              >
                <View className={`method-radio ${prepayType === p.key ? 'checked' : ''}`} />
                <Text className="method-name">{p.label}</Text>
              </View>
            ))}
          </View>

          {prepayType === 'PARTIAL' && (
            <View className="form-card partial-card">
              <View className="form-row">
                <Text className="form-label">部分偿还金额</Text>
                <View className="form-control">
                  <Text className="prefix">¥</Text>
                  <InputNumber
                    value={partialAmount}
                    min={1}
                    max={loanAmount}
                    step={10000}
                    onChange={(v: number | string) => setPartialAmount(Number(v) || 0)}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        <View className="bottom-spacer" />

        {/* 底部按钮 */}
        <View className="prepay-footer">
          <Button type="primary" block disabled={!canSubmit} onClick={handleCalc}>
            开始计算
          </Button>
        </View>
      </ScrollView>

      {/* 结果弹窗 */}
      {showResult && result && (
        <View className="result-mask" onClick={handleCloseResult}>
          <View className="result-panel" onClick={(e: any) => e.stopPropagation()}>
            <View className="result-head">
              <Text className="result-title">计算结果</Text>
              <Text className="result-close" onClick={handleCloseResult}>✕</Text>
            </View>
            <ScrollView className="result-scroll" scrollY>
              {/* 贷款概况 */}
              <View className="result-block">
                <Text className="result-block-title">贷款概况</Text>
                <View className="result-row">
                  <Text className="res-label">贷款金额</Text>
                  <Text className="res-value">¥{formatCurrency(result.loanAmount)}</Text>
                </View>
                <View className="result-row">
                  <Text className="res-label">贷款期限</Text>
                  <Text className="res-value">{result.loanTerm} 期（{result.loanTerm / 12} 年）</Text>
                </View>
                <View className="result-row">
                  <Text className="res-label">还款方式</Text>
                  <Text className="res-value">{repaymentType === 'EQUAL_PI' ? '等额本息' : '等额本金'}</Text>
                </View>
                <View className="result-row">
                  <Text className="res-label">月供</Text>
                  <Text className="res-value highlight">¥{formatCurrency(result.monthlyPayment)}</Text>
                </View>
              </View>

              {/* 已还情况 */}
              <View className="result-block">
                <Text className="result-block-title">已还情况</Text>
                <View className="result-row">
                  <Text className="res-label">已还月数</Text>
                  <Text className="res-value">{result.paidMonths} 期</Text>
                </View>
                <View className="result-row">
                  <Text className="res-label">已还本金</Text>
                  <Text className="res-value">¥{formatCurrency(result.paidPrincipal)}</Text>
                </View>
                <View className="result-row">
                  <Text className="res-label">已还利息</Text>
                  <Text className="res-value warn">¥{formatCurrency(result.paidInterest)}</Text>
                </View>
              </View>

              {/* 提前还款分析 */}
              <View className="result-block">
                <Text className="result-block-title">提前还款分析</Text>
                <View className="result-row result-highlight">
                  <Text className="res-label">剩余本金</Text>
                  <Text className="res-value primary">¥{formatCurrency(result.remainingPrincipal)}</Text>
                </View>
                {result.penalty > 0 && (
                  <View className="result-row">
                    <Text className="res-label">违约金</Text>
                    <Text className="res-value warn">¥{formatCurrency(result.penalty)}</Text>
                  </View>
                )}
                <View className="result-row result-highlight">
                  <Text className="res-label">本次需还总额</Text>
                  <Text className="res-value primary">¥{formatCurrency(result.totalPrepay)}</Text>
                </View>
              </View>

              {/* 节省分析 */}
              <View className="result-block result-block-green">
                <Text className="result-block-title">节省分析</Text>
                <View className="result-row">
                  <Text className="res-label">原计划剩余利息</Text>
                  <Text className="res-value">¥{formatCurrency(result.remainingInterest)}</Text>
                </View>
                <View className="result-row">
                  <Text className="res-label">违约金</Text>
                  <Text className="res-value">¥{formatCurrency(result.penalty)}</Text>
                </View>
                <View className="result-row result-highlight">
                  <Text className="res-label">实际节省利息</Text>
                  <Text className="res-value saved">¥{formatCurrency(result.savedInterest - result.penalty)}</Text>
                </View>
                <View className="result-row">
                  <Text className="res-label">节省比例</Text>
                  <Text className="res-value saved">{result.saveRatio}%</Text>
                </View>
              </View>

              {/* 一句话结论 */}
              <View className="result-summary">
                <Text className="summary-text">
                  {result.savedInterest > result.penalty
                    ? `提前还款可为您节省约 ¥${formatCurrency(result.savedInterest - result.penalty)} 利息`
                    : result.penalty > 0
                    ? `当前违约金较高，节省空间不大，建议综合考量`
                    : `提前还款仅需偿还剩余本金，无需违约金`}
                </Text>
              </View>
            </ScrollView>
            <Button className="result-btn" onClick={handleCloseResult}>
              知道了
            </Button>
          </View>
        </View>
      )}

      <Toast visible={toast.show} content={toast.msg} onClose={() => setToast({ show: false, msg: '' })} />
      <CustomTabBar />
    </View>
  );
}
