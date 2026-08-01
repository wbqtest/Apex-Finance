import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Button } from '@nutui/nutui-react-taro';
import { SafeToast } from '../../components/SafeToast';

import NavBar from '../../components/NavBar';
import { calculatePrepay } from '../../services/api';
import { PrepayInput, PrepayResult } from '../../utils/prepayCalc';
import { formatCurrency } from '../../utils/finance';
import { addPrepayScheme, PrepayScheme } from '../../utils/prepayCompare';
import './index.less';

const METHOD_LABELS: Record<string, string> = {
  EQUAL_PI: '等额本息',
  EQUAL_P: '等额本金',
};

const PENALTY_LABELS: Record<string, string> = {
  NONE: '无',
  PERCENT: '百分比',
  FIXED: '固定金额',
};

const PREPAY_TYPE_LABELS: Record<string, string> = {
  FULL: '全部偿还',
  PARTIAL: '部分偿还',
};

export default function PrepayResultPage() {
  const [input, setInput] = useState<PrepayInput | null>(null);
  const [result, setResult] = useState<PrepayResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 优先读取弹窗传入的结果
      const stored = Taro.getStorageSync<{ input: PrepayInput; result: PrepayResult } | null>('PREPAY_RESULT_DATA');
      if (stored && stored.input && stored.result) {
        setInput(stored.input);
        setResult(stored.result);
        Taro.removeStorageSync('PREPAY_RESULT_DATA');
        setLoading(false);
        return;
      }
    } catch (e) {
      console.error('读取 PREPAY_RESULT_DATA 失败', e);
    }

    try {
      const pages = Taro.getCurrentPages();
      const cur = pages[pages.length - 1];
      const opt = (cur as any)?.options || {};

      if (!opt.input) {
        setError('缺少计算参数');
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(decodeURIComponent(opt.input)) as PrepayInput;
      setInput(parsed);

      const response = await calculatePrepay(parsed);
      if (response.code === 200 && response.data) {
        setResult(response.data);
      } else {
        setError(response.message || '计算失败');
      }
    } catch (err: any) {
      console.error('提前还贷详情加载失败', err);
      setError(err?.message || '加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!input || !result) return;
    const netSave = result.savedInterest - result.penalty;
    const text = [
      '【提前还款计算器】',
      `还款方式：${METHOD_LABELS[input.repaymentType] || input.repaymentType}`,
      `提前还款方式：${PREPAY_TYPE_LABELS[input.prepayType] || input.prepayType}`,
      `贷款金额：¥${formatCurrency(result.loanAmount)}`,
      `贷款期限：${result.loanTerm} 期（${result.loanTerm / 12} 年）`,
      `年利率：${input.annualRate}%`,
      `月供：¥${formatCurrency(result.monthlyPayment)}`,
      `已还月数：${result.paidMonths} 期`,
      `已还本金：¥${formatCurrency(result.paidPrincipal)}`,
      `已还利息：¥${formatCurrency(result.paidInterest)}`,
      `剩余本金：¥${formatCurrency(result.remainingPrincipal)}`,
      `违约金：¥${formatCurrency(result.penalty)}`,
      `本次需还总额：¥${formatCurrency(result.totalPrepay)}`,
      `实际节省利息：¥${formatCurrency(netSave)}`,
    ];
    Taro.setClipboardData({
      data: text.join('\n'),
      success: () => setToast({ show: true, msg: '已复制结果' }),
    });
  };

  const handleAddCompare = () => {
    if (!input || !result) return;
    const scheme: PrepayScheme = {
      id: Date.now().toString(),
      label: `${METHOD_LABELS[input.repaymentType]} · ${PREPAY_TYPE_LABELS[input.prepayType]} · ¥${formatCurrency(result.totalPrepay)}`,
      input: input,
      result: result,
      createdAt: Date.now(),
    };
    addPrepayScheme(scheme);
    setToast({ show: true, msg: '已加入对比' });
    setTimeout(() => {
      Taro.navigateTo({ url: '/pages/compare?tab=prepay' });
    }, 300);
  };

  const handleViewSchedule = () => {
    Taro.setStorageSync('PREPAY_RESULT_DATA', { input, result });
    Taro.navigateTo({ url: '/pages/prepay-schedule' });
  };

  if (loading) {
    return (
      <View className="prepay-result">
        <NavBar title="提前还款详情" />
        <View className="state-box">
          <Text className="state-text">正在计算…</Text>
        </View>
      </View>
    );
  }

  if (error || !input || !result) {
    return (
      <View className="prepay-result">
        <NavBar title="提前还款详情" />
        <View className="state-box">
          <Text className="state-text state-error">{error || '加载失败'}</Text>
          <Button className="state-btn" type="primary" onClick={() => Taro.navigateBack()}>
            返回修改
          </Button>
        </View>
      </View>
    );
  }

  const netSave = result.savedInterest - result.penalty;

  return (
    <View className="prepay-result">
      <NavBar title="提前还款详情" />

      <ScrollView className="result-body" scrollY>
        {/* 头部摘要 */}
        <View className="result-summary-card">
          <Text className="result-summary-title">
            {METHOD_LABELS[input.repaymentType]} · {PREPAY_TYPE_LABELS[input.prepayType]}
          </Text>
          <View className="result-summary-main">
            <Text className="result-summary-label">实际节省利息</Text>
            <Text className={`result-summary-value ${netSave > 0 ? 'saved' : 'warn'}`}>
              ¥{formatCurrency(netSave)}
            </Text>
          </View>
          <Text className="result-summary-tip">
            {netSave > 0
              ? `提前还款可为您节省约 ¥${formatCurrency(netSave)} 利息`
              : result.penalty > 0
                ? '当前违约金较高，节省空间不大，建议综合考量'
                : '提前还款仅需偿还剩余本金，无需违约金'}
          </Text>
        </View>

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
            <Text className="res-value">{METHOD_LABELS[input.repaymentType] || input.repaymentType}</Text>
          </View>
          <View className="result-row">
            <Text className="res-label">年利率</Text>
            <Text className="res-value">{input.annualRate}%</Text>
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
          {input.prepayType === 'PARTIAL' && input.partialAmount > 0 && (
            <View className="result-row">
              <Text className="res-label">本次部分偿还</Text>
              <Text className="res-value">¥{formatCurrency(input.partialAmount)}</Text>
            </View>
          )}
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
            <Text className="res-value saved">¥{formatCurrency(netSave)}</Text>
          </View>
          <View className="result-row">
            <Text className="res-label">节省比例</Text>
            <Text className="res-value saved">{result.saveRatio}%</Text>
          </View>
        </View>

        {/* 费用设置摘要 */}
        <View className="result-block">
          <Text className="result-block-title">费用设置</Text>
          <View className="result-row">
            <Text className="res-label">违约金类型</Text>
            <Text className="res-value">{PENALTY_LABELS[input.penaltyType] || input.penaltyType}</Text>
          </View>
          {input.penaltyType !== 'NONE' && (
            <View className="result-row">
              <Text className="res-label">违约金数值</Text>
              <Text className="res-value">
                {input.penaltyType === 'PERCENT' ? `${input.penaltyValue}%` : `¥${formatCurrency(input.penaltyValue)}`}
              </Text>
            </View>
          )}
          <View className="result-row">
            <Text className="res-label">首次还款日期</Text>
            <Text className="res-value">{input.firstPaymentDate}</Text>
          </View>
          <View className="result-row">
            <Text className="res-label">提前还款日期</Text>
            <Text className="res-value">{input.prepaymentDate}</Text>
          </View>
        </View>

        <View className="schedule-link-card" onClick={handleViewSchedule}>
          <View className="schedule-link-main">
            <Text className="schedule-link-title">查看完整还款计划表</Text>
            <Text className="schedule-link-sub">共 {result.loanTerm} 期，纯列表更省流</Text>
          </View>
          <Text className="schedule-link-arrow">›</Text>
        </View>

        <View className="legal-notice">
          <Text className="notice-icon">ℹ️</Text>
          <Text className="notice-text">
            计算结果基于输入参数估算，仅供参考，不构成贷款建议。
          </Text>
        </View>

        <View className="bottom-spacer" />
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
          onClick={() => Taro.navigateBack()}
        >
          返回修改
        </Button>
      </View>

      <SafeToast visible={toast.show} content={toast.msg} onClose={() => setToast({ show: false, msg: '' })} />
    </View>
  );
}
