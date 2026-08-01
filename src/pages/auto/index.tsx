import { View, Text, ScrollView, Input } from '@tarojs/components';
import { useState, useEffect, useMemo } from 'react';
import Taro from '@tarojs/taro';
import { InputNumber, Button } from '@nutui/nutui-react-taro';
import { SafeToast } from '../../components/SafeToast';

import {
  validateCarInput,
  calculateCarLoan,
  CarLoanInput,
  CarLoanResult,
  RepaymentType,
  FeeCycle,
  PenaltyType,
  REPAYMENT_LABELS,
} from '../../utils/carFinance';
import { formatCurrency, formatRate } from '../../utils/finance';
import { getCachedCarConfig, initCarConfig } from '../../services/carConfig';
import { saveCalcRecord } from '../../services/api';
import { CarConfigBundle, KnowledgeItem } from '../../data/carDefaults';
import CustomTabBar from '../../components/CustomTabBar/custom-tab-bar';
import './index.less';

const METHODS: { key: RepaymentType; label: string }[] = [
  { key: 'EQUAL_PI', label: '等额本息' },
  { key: 'EQUAL_P', label: '等额本金' },
  { key: 'INTEREST_FIRST', label: '先息后本' },
  { key: 'BALLOON', label: '气球贷' },
];

const CYCLES: { key: FeeCycle; label: string }[] = [
  { key: 'ONCE', label: '一次性' },
  { key: 'YEARLY', label: '每年' },
  { key: 'MONTHLY', label: '每月' },
];

const PENALTY_OPTIONS: { key: PenaltyType; label: string }[] = [
  { key: 'NONE', label: '无' },
  { key: 'PERCENT', label: '百分比' },
  { key: 'FIXED', label: '固定金额' },
];

// 「算法说明」弹层兜底文案：后端知识库不可用 / 为空时展示，结构对齐 KnowledgeItem
const FALLBACK_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: -1,
    category: 'IRR',
    title: '真实年化 IRR',
    content:
      '把所有还款现金流与各项费用折现到净现值为 0 时的年化利率，反映包含费用后的真实借款成本，是不同方案对比的公平基准。',
    readTime: 2,
  },
  {
    id: -2,
    category: '还款方式',
    title: '四种还款方式',
    content:
      '等额本息：每月固定还款，压力均衡。\n等额本金：每月本金固定，月供递减、总利息更少。\n先息后本：前期只还利息，末期一次性还本金。\n气球贷：前期低月供，末期一次性偿还大额尾款。',
    readTime: 3,
  },
  {
    id: -3,
    category: '费用与提前还款',
    title: '费用与提前还款',
    content:
      '一次性 / 每年 / 每月费用均计入 IRR 现金流；提前还款可节省后续利息，但可能含违约金，盈亏平衡点通常在还款前期。',
    readTime: 2,
  },
];

interface FeeDraft {
  id: string;
  label: string;
  amount: number;
  cycle: FeeCycle;
}

let feeSeq = 0;
const nextFeeId = () => `fee_${Date.now()}_${feeSeq++}`;

export default function AutoCalcPage() {
  const [loanAmount, setLoanAmount] = useState<number>(100000);
  const [term, setTerm] = useState<number>(36);
  const [rate, setRate] = useState<number>(6.0);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [method, setMethod] = useState<RepaymentType>('EQUAL_PI');
  const [fees, setFees] = useState<FeeDraft[]>([]);

  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [prepaymentPeriod, setPrepaymentPeriod] = useState<number>(12);
  const [penaltyType, setPenaltyType] = useState<PenaltyType>('NONE');
  const [penaltyValue, setPenaltyValue] = useState<number>(0);

  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });
  const [algoOpen, setAlgoOpen] = useState<boolean>(false);
  const [result, setResult] = useState<CarLoanResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const [cfg, setCfg] = useState<CarConfigBundle>(getCachedCarConfig());

  useEffect(() => {
    initCarConfig()
      .then((bundle) => {
        setCfg(bundle);
        if (bundle.calcParams?.defaultTerm) setTerm(bundle.calcParams.defaultTerm);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calcParams = cfg.calcParams;
  const termOptions = calcParams?.loanTermOptions || [12, 24, 36, 48, 60];

  const input: CarLoanInput = useMemo(
    () => ({
      loanAmount,
      loanTerm: term,
      repaymentType: method,
      annualRate: rate,
      downPayment: downPayment > 0 ? downPayment : undefined,
      balloonRatio: method === 'BALLOON' ? 30 : undefined,
      fees: fees
        .filter((f) => f.amount > 0)
        .map(({ id, ...rest }) => ({ ...rest, type: rest.label || 'CUSTOM' })),
      prepaymentPeriod: advancedOpen ? prepaymentPeriod : undefined,
      penaltyType: advancedOpen ? penaltyType : 'NONE',
      penaltyValue: advancedOpen ? penaltyValue : 0,
    }),
    [loanAmount, term, rate, downPayment, method, fees, advancedOpen, prepaymentPeriod, penaltyType, penaltyValue]
  );

  const handleSubmit = () => {
    const errs = validateCarInput(input, calcParams);
    if (errs.length) {
      setToast({ show: true, msg: errs[0] });
      return;
    }
    const res = calculateCarLoan(input);
    setResult(res);
    setShowResult(true);

    // 异步保存到后端历史记录
    saveCalcRecord({
      calculatorType: 'auto',
      mode: method,
      principal: loanAmount,
      totalPayment: res.totalPayment,
      totalInterest: res.totalInterest,
      totalFee: res.totalFee,
      periods: term,
      rate,
      irr: res.irrConverged ? res.irr : undefined,
      monthlyPayment: res.monthlyPayment,
      downPayment,
      inputSnapshot: {
        loanAmount, term, rate, downPayment, method,
        fees: fees.filter(f => f.amount > 0),
        prepaymentPeriod: advancedOpen ? prepaymentPeriod : undefined,
      },
      fees: fees.filter(f => f.amount > 0).map(f => ({
        name: f.label || '费用',
        amount: f.amount,
        cycle: f.cycle,
      })),
    }).catch(() => {});
  };

  const handleViewDetail = () => {
    if (!result) return;
    Taro.setStorageSync('AUTO_RESULT_INPUT', input);
    Taro.navigateTo({
      url: '/pages/auto-result',
    });
    setShowResult(false);
  };

  const addFee = () =>
    setFees((prev) => [...prev, { id: nextFeeId(), label: '', amount: 0, cycle: 'ONCE' }]);
  const removeFee = (id: string) => setFees((prev) => prev.filter((f) => f.id !== id));
  const updateFee = (id: string, patch: Partial<FeeDraft>) =>
    setFees((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  // 算法说明弹层：打开时再同步一次后端知识库，确保内容最新（失败则保留本地兜底）
  const openAlgo = () => {
    setAlgoOpen(true);
    initCarConfig()
      .then(setCfg)
      .catch(() => {});
  };

  // 预演算，供「立即计算」前的轻量校验（不展示，避免与精简设计冲突）
  const previewOk = useMemo(() => {
    if (!calcParams) return false;
    return validateCarInput(input, calcParams).length === 0;
  }, [input, calcParams]);

  return (
    <View className="calc-page">
      <View className="calc-header">
        <View className="header-main">
          <Text className="header-title">车贷精算师</Text>
          <Text className="header-sub">看清月供、利息与真实年化(IRR)</Text>
        </View>
        <View className="header-badge" onClick={openAlgo}>
          <Text className="header-badge-text">算法说明</Text>
        </View>
      </View>

      <ScrollView className="calc-body" scrollY>
        {/* 还款方式 */}
        <View className="section">
          <Text className="section-title">还款方式</Text>
          <View className="method-grid">
            {METHODS.map((m) => (
              <View
                key={m.key}
                className={`method-card ${method === m.key ? 'active' : ''}`}
                onClick={() => setMethod(m.key)}
              >
                <View className={`method-radio ${method === m.key ? 'checked' : ''}`} />
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
              <Text className="form-label">贷款本金</Text>
              <View className="form-control">
                <Text className="prefix">¥</Text>
                <InputNumber
                  value={loanAmount}
                  min={0}
                  max={5000000}
                  step={1000}
                  onChange={(v: number | string) => setLoanAmount(Number(v) || 0)}
                />
              </View>
            </View>

            <View className="form-row">
              <Text className="form-label">贷款期限</Text>
              <View className="tag-row">
                {termOptions.map((t) => (
                  <View
                    key={t}
                    className={`tag-chip ${term === t ? 'active' : ''}`}
                    onClick={() => setTerm(t)}
                  >
                    <Text>{t}期</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="form-row">
              <Text className="form-label">年化利率</Text>
              <View className="form-control">
                <InputNumber
                  value={rate}
                  min={0}
                  max={calcParams?.rateMax ?? 36}
                  step={0.1}
                  digits={2}
                  onChange={(v: number | string) => setRate(Number(v) || 0)}
                />
                <Text className="suffix">%</Text>
              </View>
            </View>

            <View className="form-row">
              <Text className="form-label">首付(选填)</Text>
              <View className="form-control">
                <Text className="prefix">¥</Text>
                <InputNumber
                  value={downPayment}
                  min={0}
                  step={1000}
                  onChange={(v: number | string) => setDownPayment(Number(v) || 0)}
                />
              </View>
            </View>

            <View className="form-row">
              <Text className="form-label">费用(选填)</Text>
              <View className="form-control end">
                <Text className="add-fee" onClick={addFee}>
                  ＋ 添加费用
                </Text>
              </View>
            </View>

            {fees.map((f) => (
              <View className="fee-editor" key={f.id}>
                <View className="fee-editor-head">
                  <Input
                    className="fee-name"
                    value={f.label}
                    placeholder="费用名称"
                    onInput={(e: any) => updateFee(f.id, { label: e.detail.value })}
                  />
                  <Text className="fee-del" onClick={() => removeFee(f.id)}>
                    删除
                  </Text>
                </View>
                <View className="fee-editor-body">
                  <View className="fee-field">
                    <Text className="fee-label">金额</Text>
                    <InputNumber
                      value={f.amount}
                      min={0}
                      step={100}
                      onChange={(v: number | string) => updateFee(f.id, { amount: Number(v) || 0 })}
                    />
                  </View>
                  <View className="fee-field">
                    <Text className="fee-label">周期</Text>
                    <View className="seg">
                      {CYCLES.map((c) => (
                        <View
                          key={c.key}
                          className={`seg-item ${f.cycle === c.key ? 'active' : ''}`}
                          onClick={() => updateFee(f.id, { cycle: c.key })}
                        >
                          <Text>{c.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 高级设置 */}
        <View className="section">
          <View className="adv-toggle" onClick={() => setAdvancedOpen((v) => !v)}>
            <Text className="section-title">高级设置</Text>
            <Text className="adv-arrow">{advancedOpen ? '收起 ▲' : '展开 ▼'}</Text>
          </View>
          {advancedOpen && (
            <View className="form-card">
              <View className="form-row">
                <Text className="form-label">提前还款期数</Text>
                <View className="form-control">
                  <InputNumber
                    value={prepaymentPeriod}
                    min={1}
                    max={term}
                    step={1}
                    onChange={(v: number | string) => setPrepaymentPeriod(Math.min(term, Number(v) || 1))}
                  />
                  <Text className="suffix">期</Text>
                </View>
              </View>

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
                      max={penaltyType === 'PERCENT' ? 10 : 10000}
                      step={penaltyType === 'PERCENT' ? 0.5 : 100}
                      digits={penaltyType === 'PERCENT' ? 2 : 0}
                      onChange={(v: number | string) => setPenaltyValue(Number(v) || 0)}
                    />
                    <Text className="suffix">{penaltyType === 'PERCENT' ? '%' : '元'}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        <View className="bottom-spacer" />

        <View className="calc-footer">
          <Button type="primary" block disabled={!previewOk} onClick={handleSubmit}>
            立即计算
          </Button>
        </View>
      </ScrollView>

      {/* 计算结果弹窗 */}
      {showResult && result && (
        <View className="algo-mask" onClick={() => setShowResult(false)}>
          <View className="result-panel-wide" onClick={(e: any) => e.stopPropagation()}>
            <View className="algo-panel-head">
              <Text className="algo-title">
                计算结果 · {REPAYMENT_LABELS[result.repaymentType]}
              </Text>
              <Text className="algo-close-x" onClick={() => setShowResult(false)}>✕</Text>
            </View>
            <ScrollView className="algo-scroll" scrollY>
              {/* 核心指标 */}
              <View className="result-summary-grid">
                <View className="rsg-cell">
                  <Text className="rsg-label">常规月供</Text>
                  <Text className="rsg-value">¥{formatCurrency(result.monthlyPayment)}</Text>
                </View>
                <View className="rsg-cell">
                  <Text className="rsg-label">总利息</Text>
                  <Text className="rsg-value">¥{formatCurrency(result.totalInterest)}</Text>
                </View>
                <View className="rsg-cell">
                  <Text className="rsg-label">费用合计</Text>
                  <Text className="rsg-value">¥{formatCurrency(result.totalFee)}</Text>
                </View>
                <View className="rsg-cell">
                  <Text className="rsg-label">真实年化IRR</Text>
                  <Text className="rsg-value danger">{result.irrConverged ? formatRate(result.irr) : '—'}</Text>
                </View>
                <View className="rsg-cell full">
                  <Text className="rsg-label">总支出(本金+利息+费用)</Text>
                  <Text className="rsg-value">¥{formatCurrency(result.totalPayment)}</Text>
                </View>
              </View>

              {result.balloonPayment > 0 && (
                <View className="balloon-tip-inline">
                  <Text>末期尾款(气球款)：¥{formatCurrency(result.balloonPayment)}</Text>
                </View>
              )}

              {/* 提前还款分析 */}
              {input.prepaymentPeriod != null && result.prepaymentAnalysis && (
                <View className="result-block result-block-blue">
                  <Text className="result-block-title">提前还款分析（第{result.prepaymentAnalysis.payoffPeriod}期）</Text>
                  <View className="result-row">
                    <Text className="res-label">剩余本金</Text>
                    <Text className="res-value primary">¥{formatCurrency(result.prepaymentAnalysis.remainingPrincipal)}</Text>
                  </View>
                  <View className="result-row">
                    <Text className="res-label">当期利息</Text>
                    <Text className="res-value">¥{formatCurrency(result.prepaymentAnalysis.currentInterest)}</Text>
                  </View>
                  {result.prepaymentAnalysis.penalty > 0 && (
                    <View className="result-row">
                      <Text className="res-label">违约金</Text>
                      <Text className="res-value warn">¥{formatCurrency(result.prepaymentAnalysis.penalty)}</Text>
                    </View>
                  )}
                  <View className="result-row result-highlight">
                    <Text className="res-label">结清需支付</Text>
                    <Text className="res-value primary">¥{formatCurrency(result.prepaymentAnalysis.totalPayNow)}</Text>
                  </View>
                  <View className="result-row">
                    <Text className="res-label">可省利息</Text>
                    <Text className="res-value saved">¥{formatCurrency(result.prepaymentAnalysis.saveInterest)}</Text>
                  </View>
                  <View className="prepay-suggestion">
                    <Text>{result.prepaymentAnalysis.suggestion}</Text>
                  </View>
                </View>
              )}

              {/* 还款计划简表（前6期） */}
              <View className="result-block">
                <Text className="result-block-title">还款计划预览（前6期）</Text>
                <View className="schedule-table">
                  <View className="schedule-head">
                    <Text className="col">期</Text>
                    <Text className="col">还款</Text>
                    <Text className="col">本金</Text>
                    <Text className="col">利息</Text>
                    <Text className="col">剩余</Text>
                  </View>
                  {result.repaymentPlan.slice(0, 6).map((r) => (
                    <View className="schedule-row" key={r.period}>
                      <Text className="col">{r.period}</Text>
                      <Text className="col">{formatCurrency(r.payment)}</Text>
                      <Text className="col">{formatCurrency(r.principal)}</Text>
                      <Text className="col">{formatCurrency(r.interest)}</Text>
                      <Text className="col">{formatCurrency(r.remainingPrincipal)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View className="result-footer-btns">
              <Button className="result-btn-secondary" onClick={() => setShowResult(false)}>
                关闭
              </Button>
              <Button className="result-btn-primary" type="primary" onClick={handleViewDetail}>
                具体详情
              </Button>
            </View>
          </View>
        </View>
      )}
      {algoOpen && (
        <View className="algo-mask" onClick={() => setAlgoOpen(false)}>
          <View className="algo-panel" onClick={(e: any) => e.stopPropagation()}>
            <View className="algo-panel-head">
              <Text className="algo-title">算法说明</Text>
              <Text
                className="algo-close-x"
                onClick={() => setAlgoOpen(false)}
              >
                ✕
              </Text>
            </View>
            <ScrollView className="algo-scroll" scrollY>
              {(cfg.knowledge && cfg.knowledge.length ? cfg.knowledge : FALLBACK_KNOWLEDGE).map(
                (k) => (
                  <View className="algo-block" key={k.id}>
                    <Text className="algo-h">{k.title}</Text>
                    {k.content
                      .split('\n')
                      .filter((line) => line.trim() !== '')
                      .map((line, i) => (
                        <Text className="algo-p" key={i}>
                          {line}
                        </Text>
                      ))}
                  </View>
                )
              )}
            </ScrollView>
            <Button className="algo-close" onClick={() => setAlgoOpen(false)}>
              知道了
            </Button>
          </View>
        </View>
      )}

      <SafeToast visible={toast.show} content={toast.msg} onClose={() => setToast({ show: false, msg: '' })} />

      <CustomTabBar />
    </View>
  );
}
