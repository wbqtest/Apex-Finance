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
import NavBar from '../../components/NavBar';
import './index.less';

const PENALTY_OPTIONS: { key: PenaltyType; label: string }[] = [
  { key: 'NONE', label: '无' },
  { key: 'PERCENT', label: '百分比' },
  { key: 'FIXED', label: '固定金额' },
];

const formatWan = (v: number): string => `${(v / 10000).toFixed(1)}`;


/** 根据利息金额生成场景化扎心文案 */
const interestSceneCopy = (interest: number): string => {
  const wan = interest / 10000;
  if (wan >= 25) return '这笔利息相当于一辆特斯拉 Model 3 的价格';
  if (wan >= 18) return '这笔利息相当于一辆比亚迪汉 EV 的价格';
  if (wan >= 12) return '这笔利息相当于一辆大众帕萨特的价格';
  if (wan >= 8) return '这笔利息相当于一辆本田思域的价格';
  if (wan >= 5) return '这笔利息相当于一台顶配 MacBook Pro 的价格';
  if (wan >= 2) return '这笔利息相当于一次欧洲双人游的价格';
  if (wan >= 1) return '这笔利息相当于一台 iPhone 16 Pro Max 的价格';
  return '这笔利息也能省下一笔不小的开支，值得认真规划';
};

export default function AutoResultPage() {
  const [input, setInput] = useState<CarLoanInput | null>(null);
  const [payoffPeriod, setPayoffPeriod] = useState<number>(12);
  const [penaltyType, setPenaltyType] = useState<PenaltyType>('NONE');
  const [penaltyValue, setPenaltyValue] = useState<number>(0);
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  useEffect(() => {
    try {
      const stored = Taro.getStorageSync('AUTO_RESULT_INPUT');
      if (stored) {
        setInput(stored as CarLoanInput);
        if (stored.prepaymentPeriod) setPayoffPeriod(stored.prepaymentPeriod);
        if (stored.penaltyType && stored.penaltyType !== 'NONE') {
          setPenaltyType(stored.penaltyType);
          setPenaltyValue(stored.penaltyValue ?? 0);
        }
        Taro.removeStorageSync('AUTO_RESULT_INPUT');
        return;
      }
    } catch (e) {
      console.error('读取 storage input 失败', e);
    }

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

  const result = useMemo(() => {
    if (!input) return null;
    const r = calculateCarLoan(input);
    console.log('🔍 [auto-result] input:', JSON.parse(JSON.stringify(input)));
    console.log('🔍 [auto-result] result:', {
      loanAmount: r.loanAmount,
      totalInterest: r.totalInterest,
      totalFee: r.totalFee,
      monthlyPayment: r.monthlyPayment,
      repaymentType: r.repaymentType,
      loanTerm: r.loanTerm,
      annualRate: r.annualRate,
      planLength: r.repaymentPlan?.length,
      planFirst: r.repaymentPlan?.[0],
      planLast: r.repaymentPlan?.[r.repaymentPlan.length - 1],
    });
    return r;
  }, [input]);

  const early = useMemo(() => {
    if (!result || !input) return null;
    return calculateEarlyRepayment(result, { payoffPeriod, penaltyType, penaltyValue });
  }, [result, input, payoffPeriod, penaltyType, penaltyValue]);

  // ====== 所有 useMemo 必须在 early return 之前 ======

  /* ---- 图1：本金 vs 利息 环形图 ---- */
  const pieData = useMemo(
    () => [
      { name: '利息', value: result?.totalInterest || 0 },
      { name: '本金', value: result?.loanAmount || 0 },
      { name: '费用', value: result?.totalFee || 0 },
    ],
    [result?.totalInterest, result?.loanAmount, result?.totalFee],
  );

  const maxPeriod = useMemo(
    () => (result ? result.loanTerm - 1 : 0),
    [result],
  );

  if (!input || !result) {
    return (
      <View className="auto-result">
        <NavBar title="车贷详情" />
        <View className="loading">加载中…</View>
      </View>
    );
  }



  const hasFee = result.totalFee > 0;

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
    setTimeout(() => {
      Taro.navigateTo({ url: '/pages/compare?tab=auto' });
    }, 300);
  };

  const handleViewSchedule = () => {
    Taro.setStorageSync('AUTO_RESULT_INPUT', input);
    Taro.navigateTo({ url: '/pages/auto-schedule' });
  };

  return (
    <View className="auto-result">
      <NavBar title="车贷详情" />

      {/* ===== 顶部摘要（固定） ===== */}
      <View className="result-header">
        <Text className="result-title">车贷详情 · {REPAYMENT_LABELS[result.repaymentType]}</Text>
        <Text className="result-monthly-label">常规月供</Text>
        <Text className="result-monthly">¥{formatCurrency(result.monthlyPayment)}</Text>
        <View className="result-summary-row">
          <View className="result-summary-item">
            <Text className="rsi-label">贷款总额</Text>
            <Text className="rsi-value">¥{formatCurrency(result.loanAmount)}</Text>
          </View>
          <View className="result-summary-item">
            <Text className="rsi-label">年利率</Text>
            <Text className="rsi-value">{formatRate(result.annualRate)}</Text>
          </View>
          <View className="result-summary-item">
            <Text className="rsi-label">期限</Text>
            <Text className="rsi-value">{result.loanTerm}期</Text>
          </View>
        </View>
      </View>

      <ScrollView className="result-body" scrollY>
        {/* ===== 图1：本金 vs 利息 环形图 ===== */}
        <View className="chart-card chart-card-featured">
          <View className="chart-head">
            <Text className="chart-title">银行到底赚了我多少钱？</Text>
            <Text className="chart-subtitle">本金 vs 利息 构成</Text>
          </View>
          <CarChart
            kind="ring"
            data={pieData}
            nameField="name"
            valueField="value"
            height={260}
            centerTitle="总利息"
            centerSubtitle={`${formatWan(result.totalInterest)}万`}
          />
          <View className="chart-copy">
            <Text className="chart-copy-text">{interestSceneCopy(result.totalInterest)}</Text>
          </View>
        </View>

        {/* ===== 气球款提示 ===== */}
        {result.balloonPayment > 0 && (
          <View className="balloon-tip">
            <Text>末期尾款(气球款)：¥{formatCurrency(result.balloonPayment)}</Text>
          </View>
        )}

        {/* ===== 提前还款分析 ===== */}
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

        {/* ===== 查看完整还款计划 ===== */}
        <View className="schedule-link-card" onClick={handleViewSchedule}>
          <View className="schedule-link-main">
            <Text className="schedule-link-title">查看完整还款计划表</Text>
            <Text className="schedule-link-sub">共 {result.loanTerm} 期，纯列表更省流</Text>
          </View>
          <Text className="schedule-link-arrow">›</Text>
        </View>

        {/* ===== 免责声明 ===== */}
        <View className="legal-notice">
          <Text className="notice-icon">ℹ️</Text>
          <Text className="notice-text">
            计算结果基于输入参数估算，IRR 已包含各项费用，仅供参考，不构成贷款建议。
          </Text>
        </View>

        <View className="bottom-spacer" />
      </ScrollView>

      {/* ===== 底部操作栏 ===== */}
      <View className="result-footer">
        <Button className="foot-btn" onClick={handleAddCompare}>
          加入对比
        </Button>
        <Button
          className="foot-btn primary"
          type="primary"
          onClick={() => Taro.navigateTo({ url: '/pages/compare?tab=auto' })}
        >
          方案对比
        </Button>
      </View>

      <Toast visible={toast.show} content={toast.msg} onClose={() => setToast({ show: false, msg: '' })} />
    </View>
  );
}
