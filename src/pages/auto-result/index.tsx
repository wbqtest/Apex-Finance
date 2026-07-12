import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useMemo } from 'react';
import Taro from '@tarojs/taro';
import {
  Button,
  Cell,
  CellGroup,
  Range,
  InputNumber,
  Toast,
} from '@nutui/nutui-react-taro';
import CarChart from '../../components/CarChart';
import {
  calculateCarLoan,
  calculateEarlyRepayment,
  CarLoanInput,
  REPAYMENT_LABELS,
  PenaltyType,
} from '../../utils/carFinance';
import { formatCurrency, formatRate } from '../../utils/finance';
import { addCarScheme } from '../../utils/carCompare';
import './index.less';

const PENALTY_OPTIONS: { key: PenaltyType; label: string }[] = [
  { key: 'NONE', label: '无' },
  { key: 'PERCENT', label: '百分比' },
  { key: 'FIXED', label: '固定金额' },
];

export default function AutoResultPage() {
  const [input, setInput] = useState<CarLoanInput | null>(null);
  const [payoffPeriod, setPayoffPeriod] = useState<number>(12);
  const [penaltyType, setPenaltyType] = useState<PenaltyType>('NONE');
  const [penaltyValue, setPenaltyValue] = useState<number>(0);
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  useEffect(() => {
    const pages = Taro.getCurrentPages();
    const cur = pages[pages.length - 1];
    const opt = (cur as any)?.options || {};
    if (opt.input) {
      try {
        const parsed = JSON.parse(decodeURIComponent(opt.input)) as CarLoanInput;
        setInput(parsed);
        if (parsed.prepaymentPeriod) setPayoffPeriod(parsed.prepaymentPeriod);
        if (parsed.penaltyType && parsed.penaltyType !== 'NONE') {
          setPenaltyType(parsed.penaltyType);
          setPenaltyValue(parsed.penaltyValue ?? 0);
        }
      } catch (e) {
        console.error('解析 input 失败', e);
      }
    }
  }, []);

  const result = useMemo(() => (input ? calculateCarLoan(input) : null), [input]);

  const early = useMemo(() => {
    if (!result || !input) return null;
    return calculateEarlyRepayment(result, { payoffPeriod, penaltyType, penaltyValue });
  }, [result, input, payoffPeriod, penaltyType, penaltyValue]);

  if (!input || !result) {
    return (
      <View className="auto-result">
        <View className="loading">加载中…</View>
      </View>
    );
  }

  const pieData = [
    { name: '本金', value: result.loanAmount },
    { name: '利息', value: result.totalInterest },
    { name: '费用', value: result.totalFee },
  ];
  const lineData = result.repaymentPlan.map((r) => ({ x: r.period, y: r.remainingPrincipal }));

  const maxPeriod = result.loanTerm - 1;
  const hasFee = result.totalFee > 0;

  const handleCopy = () => {
    const text = [
      `【车贷精算师 - ${REPAYMENT_LABELS[result.repaymentType]}】`,
      `贷款额：¥${formatCurrency(result.loanAmount)}`,
      `期限：${result.loanTerm}期`,
      `常规月供：¥${formatCurrency(result.monthlyPayment)}`,
      `总利息：¥${formatCurrency(result.totalInterest)}`,
      `费用合计：¥${formatCurrency(result.totalFee)}`,
      `真实年化IRR：${result.irrConverged ? formatRate(result.irr) : '—'}`,
      `总支出(本金+利息+费用)：¥${formatCurrency(result.totalPayment)}`,
    ].join('\n');
    Taro.setClipboardData({ data: text, success: () => setToast({ show: true, msg: '已复制' }) });
  };

  const handleAddCompare = () => {
    const scheme = {
      id: `car_${Date.now()}`,
      label: `${REPAYMENT_LABELS[result.repaymentType]} ${result.loanTerm}期`,
      input,
      result,
      createdAt: Date.now(),
    };
    addCarScheme(scheme);
    setToast({ show: true, msg: '已加入对比' });
  };

  return (
    <View className="auto-result">
      <View className="result-header">
        <Text className="result-title">计算结果 · {REPAYMENT_LABELS[result.repaymentType]}</Text>
        <Text className="result-sub">
          贷款 ¥{formatCurrency(result.loanAmount)} / {result.loanTerm}期
        </Text>
      </View>

      <ScrollView className="result-body" scrollY>
        <View className="summary-grid">
          <View className="summary-cell">
            <Text className="cell-label">常规月供</Text>
            <Text className="cell-value">¥{formatCurrency(result.monthlyPayment)}</Text>
          </View>
          <View className="summary-cell">
            <Text className="cell-label">总利息</Text>
            <Text className="cell-value">¥{formatCurrency(result.totalInterest)}</Text>
          </View>
          <View className="summary-cell">
            <Text className="cell-label">真实年化IRR</Text>
            <Text className="cell-value danger">{result.irrConverged ? formatRate(result.irr) : '—'}</Text>
          </View>
          <View className="summary-cell">
            <Text className="cell-label">总支出</Text>
            <Text className="cell-value">¥{formatCurrency(result.totalPayment)}</Text>
          </View>
        </View>

        {result.balloonPayment > 0 && (
          <View className="balloon-tip">
            <Text>末期尾款(气球款)：¥{formatCurrency(result.balloonPayment)}</Text>
          </View>
        )}

        <View className="chart-card">
          <Text className="chart-title">还款构成（本金 / 利息 / 费用）</Text>
          <CarChart kind="pie" data={pieData} nameField="name" valueField="value" />
        </View>

        <View className="chart-card">
          <Text className="chart-title">剩余本金趋势</Text>
          <CarChart kind="line" data={lineData} />
        </View>

        <CellGroup title="提前还款分析">
          <Cell title={`提前结清期数（当前 ${payoffPeriod} 期）`}>
            <View className="ratio-row">
              <Range value={payoffPeriod} min={1} max={maxPeriod} step={1} onChange={(v: number | number[]) => setPayoffPeriod(Array.isArray(v) ? v[0] : v)} />
              <Text className="ratio-val">{payoffPeriod}期</Text>
            </View>
          </Cell>
          <Cell title="违约金类型">
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
          </Cell>
          {penaltyType !== 'NONE' && (
            <Cell title={penaltyType === 'PERCENT' ? '违约金比例(%)' : '违约金金额(元)'}>
              <InputNumber
                value={penaltyValue}
                min={0}
                max={penaltyType === 'PERCENT' ? 10 : 10000}
                step={penaltyType === 'PERCENT' ? 0.5 : 100}
                digits={penaltyType === 'PERCENT' ? 2 : 0}
                onChange={(v: number | string) => setPenaltyValue(Number(v) || 0)}
              />
            </Cell>
          )}
          {early && (
            <View className="early-card">
              <View className="early-row">
                <Text>剩余本金</Text>
                <Text>¥{formatCurrency(early.remainingPrincipal)}</Text>
              </View>
              <View className="early-row">
                <Text>当期利息</Text>
                <Text>¥{formatCurrency(early.currentInterest)}</Text>
              </View>
              <View className="early-row">
                <Text>违约金</Text>
                <Text>¥{formatCurrency(early.penalty)}</Text>
              </View>
              <View className="early-row">
                <Text>结清需支付</Text>
                <Text>¥{formatCurrency(early.totalPayNow)}</Text>
              </View>
              <View className="early-row">
                <Text>可省利息</Text>
                <Text className="pos">¥{formatCurrency(early.saveInterest)}</Text>
              </View>
              <View className={`early-note ${early.saveInterest > 0 ? 'good' : 'bad'}`}>
                <Text>{early.suggestion}</Text>
              </View>
            </View>
          )}
        </CellGroup>

        <CellGroup title="还款计划表">
          <View className="schedule-table">
            <View className="schedule-head">
              <Text className="col">期</Text>
              <Text className="col">还款</Text>
              <Text className="col">本金</Text>
              <Text className="col">利息</Text>
              {hasFee && <Text className="col">费用</Text>}
              <Text className="col">剩余</Text>
            </View>
            <ScrollView className="schedule-body" scrollY>
              {result.repaymentPlan.map((r) => (
                <View className="schedule-row" key={r.period}>
                  <Text className="col">{r.period}</Text>
                  <Text className="col">{formatCurrency(r.payment)}</Text>
                  <Text className="col">{formatCurrency(r.principal)}</Text>
                  <Text className="col">{formatCurrency(r.interest)}</Text>
                  {hasFee && <Text className="col">{formatCurrency(r.feeAtPeriod)}</Text>}
                  <Text className="col">{formatCurrency(r.remainingPrincipal)}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </CellGroup>

        <View className="legal-notice">
          <Text className="notice-icon">ℹ️</Text>
          <Text className="notice-text">
            计算结果基于输入参数估算，IRR 已包含各项费用，仅供参考，不构成贷款建议。
          </Text>
        </View>
      </ScrollView>

      <View className="result-footer">
        <Button className="foot-btn" onClick={handleCopy}>
          复制
        </Button>
        <Button className="foot-btn" onClick={handleAddCompare}>
          加入对比
        </Button>
        <Button
          className="foot-btn primary"
          type="primary"
          onClick={() => Taro.navigateTo({ url: '/pages/auto-compare' })}
        >
          方案对比
        </Button>
      </View>

      <Toast visible={toast.show} content={toast.msg} onClose={() => setToast({ show: false, msg: '' })} />
    </View>
  );
}
