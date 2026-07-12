import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { Button, Toast } from '@nutui/nutui-react-taro';
import CarChart from '../../components/CarChart';
import NavBar from '../../components/NavBar';
import {
  RepayMethod,
  LoanType,
  MortgageInput,
  MortgageResult,
  calculateMortgage,
} from '../../utils/mortgage';
import { formatCurrency } from '../../utils/finance';
import './index.less';

const PERIODS_PER_PAGE = 12;

const METHOD_LABELS: Record<RepayMethod, string> = {
  equalPrincipalInterest: '等额本息',
  equalPrincipal: '等额本金',
};

const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  commercial: '商业贷',
  fund: '公积金贷',
  combination: '组合贷',
};

interface PageData {
  input: MortgageInput;
  result: MortgageResult;
}

export default function MortgageResultPage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  useEffect(() => {
    try {
      const stored = Taro.getStorageSync('MORTGAGE_RESULT_DATA');
      if (stored) {
        const data = stored as PageData;
        if (data.input && data.result) {
          setPageData(data);
        }
        Taro.removeStorageSync('MORTGAGE_RESULT_DATA');
        return;
      }
    } catch (e) {
      console.error('读取 mortgage result storage 失败', e);
    }

    // 兼容 URL 传参
    const pages = Taro.getCurrentPages();
    const cur = pages[pages.length - 1];
    const opt = (cur as any)?.options || {};
    if (opt.input) {
      try {
        const input = JSON.parse(decodeURIComponent(opt.input)) as MortgageInput;
        const result = calculateMortgage(input);
        if (result) {
          setPageData({ input, result });
        }
      } catch (e) {
        console.error('解析 mortgage input 失败', e);
      }
    }
  }, []);

  const input = pageData?.input;
  const result = pageData?.result;

  /* ---- 还款计划表分页 ---- */
  const [schedulePage, setSchedulePage] = useState(0);
  const totalPages = useMemo(() => {
    if (!result) return 0;
    return Math.ceil(result.schedule.length / PERIODS_PER_PAGE);
  }, [result]);
  const scheduleSlice = useMemo(() => {
    if (!result) return [];
    const start = schedulePage * PERIODS_PER_PAGE;
    return result.schedule.slice(start, start + PERIODS_PER_PAGE);
  }, [result, schedulePage]);
  const handleSchedulePage = useCallback(
    (idx: number) => setSchedulePage(idx),
    [],
  );

  if (!input || !result) {
    return (
      <View className="mortgage-result">
        <View className="loading">加载中…</View>
      </View>
    );
  }

  const pieData = [
    { name: '本金', value: result.totalPrincipal },
    { name: '利息', value: result.totalInterest },
  ];

  const isCombination = input.loanType === 'combination';
  const showComboBreakdown = isCombination && result.commercialMonthly != null && result.fundMonthly != null;

  const handleCopy = () => {
    const text = [
      `【房贷计算器 - ${METHOD_LABELS[input.repayMethod]} · ${LOAN_TYPE_LABELS[input.loanType]}】`,
      `贷款本金：¥${formatCurrency(result.totalPrincipal)}`,
      `期限：${input.years}年（${result.schedule.length}期）`,
      `月供：¥${formatCurrency(result.monthlyPayment)}${input.repayMethod === 'equalPrincipal' ? '起' : ''}`,
      `还款总额：¥${formatCurrency(result.totalPayment)}`,
      `总利息：¥${formatCurrency(result.totalInterest)}`,
      `首月利息：¥${formatCurrency(result.firstMonthInterest)}`,
      `末月利息：¥${formatCurrency(result.lastMonthInterest)}`,
    ];
    if (showComboBreakdown) {
      text.push(`商业贷月供：¥${formatCurrency(result.commercialMonthly!)}`);
      text.push(`公积金月供：¥${formatCurrency(result.fundMonthly!)}`);
    }
    Taro.setClipboardData({ data: text.join('\n'), success: () => setToast({ show: true, msg: '已复制' }) });
  };


  return (
    <View className="mortgage-result">
      <NavBar title="房贷计算结果" />
      <View className="result-header">
        <Text className="result-title">
          计算结果 · {METHOD_LABELS[input.repayMethod]} · {LOAN_TYPE_LABELS[input.loanType]}
        </Text>
        <Text className="result-sub">
          贷款本金 ¥{formatCurrency(result.totalPrincipal)} / {input.years}年（{result.schedule.length}期）
        </Text>
      </View>

      <ScrollView className="result-body" scrollY>
        {/* 核心指标 */}
        <View className="summary-grid">
          <View className="summary-cell">
            <Text className="cell-label">月供{input.repayMethod === 'equalPrincipal' ? '(首月)' : ''}</Text>
            <Text className="cell-value primary">¥{formatCurrency(result.monthlyPayment)}</Text>
          </View>
          <View className="summary-cell">
            <Text className="cell-label">总利息</Text>
            <Text className="cell-value warn">¥{formatCurrency(result.totalInterest)}</Text>
          </View>
          <View className="summary-cell">
            <Text className="cell-label">还款总额</Text>
            <Text className="cell-value">¥{formatCurrency(result.totalPayment)}</Text>
          </View>
          <View className="summary-cell">
            <Text className="cell-label">贷款本金</Text>
            <Text className="cell-value">¥{formatCurrency(result.totalPrincipal)}</Text>
          </View>
        </View>

        {/* 组合贷月供分项 */}
        {showComboBreakdown && (
          <View className="combo-block">
            <Text className="combo-title">组合贷分项</Text>
            <View className="combo-row">
              <Text className="combo-label">商业贷月供</Text>
              <Text className="combo-val">¥{formatCurrency(result.commercialMonthly!)}</Text>
            </View>
            <View className="combo-row">
              <Text className="combo-label">公积金月供</Text>
              <Text className="combo-val">¥{formatCurrency(result.fundMonthly!)}</Text>
            </View>
          </View>
        )}

        {/* 还款构成饼图 */}
        <View className="chart-card">
          <Text className="chart-title">还款构成（本金 / 利息）</Text>
          <CarChart kind="pie" data={pieData} nameField="name" valueField="value" />
        </View>

        {/* 首尾月利息 */}
        <View className="interest-card">
          <View className="interest-row">
            <Text className="interest-label">首月利息</Text>
            <Text className="interest-val">¥{formatCurrency(result.firstMonthInterest)}</Text>
          </View>
          <View className="interest-row">
            <Text className="interest-label">末月利息</Text>
            <Text className="interest-val">¥{formatCurrency(result.lastMonthInterest)}</Text>
          </View>
          <View className="interest-row interest-highlight">
            <Text className="interest-label">利息变化</Text>
            <Text className="interest-val warn">
              {result.firstMonthInterest > result.lastMonthInterest ? '↓' : '→'}{' '}
              差 ¥{formatCurrency(Math.abs(result.firstMonthInterest - result.lastMonthInterest))}
            </Text>
          </View>
        </View>

        {/* 还款计划表 */}
        <View className="schedule-section">
          <Text className="schedule-section-title">还款计划明细表（{result.schedule.length} 期）</Text>

          {/* 分页标签 */}
          {totalPages > 1 && (
            <ScrollView className="schedule-tabs" scrollX enable-flex>
              <View className="schedule-tabs-inner">
                {Array.from({ length: totalPages }, (_, i) => {
                  const start = i * PERIODS_PER_PAGE + 1;
                  const end = Math.min((i + 1) * PERIODS_PER_PAGE, result.schedule.length);
                  return (
                    <View
                      key={i}
                      className={`schedule-tab ${schedulePage === i ? 'active' : ''}`}
                      onClick={() => handleSchedulePage(i)}
                    >
                      <Text>{start}-{end}期</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          <View className="schedule-table">
            <View className="schedule-head">
              <Text className="col col-period">期</Text>
              <Text className="col">月供</Text>
              <Text className="col">本金</Text>
              <Text className="col">利息</Text>
              <Text className="col col-remain">剩余本金</Text>
            </View>
            <ScrollView className="schedule-body" scrollY>
              {scheduleSlice.map((r) => (
                <View className="schedule-row" key={r.period}>
                  <Text className="col col-period">{r.period}</Text>
                  <Text className="col">{formatCurrency(r.total)}</Text>
                  <Text className="col">{formatCurrency(r.principal)}</Text>
                  <Text className="col">{formatCurrency(r.interest)}</Text>
                  <Text className="col col-remain">{formatCurrency(r.remainingPrincipal)}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* 分页指示器 */}
          {totalPages > 1 && (
            <View className="schedule-pager">
              <Text
                className={`pager-btn ${schedulePage === 0 ? 'disabled' : ''}`}
                onClick={() => schedulePage > 0 && handleSchedulePage(schedulePage - 1)}
              >
                ‹ 上一页
              </Text>
              <Text className="pager-info">{schedulePage + 1} / {totalPages}</Text>
              <Text
                className={`pager-btn ${schedulePage >= totalPages - 1 ? 'disabled' : ''}`}
                onClick={() => schedulePage < totalPages - 1 && handleSchedulePage(schedulePage + 1)}
              >
                下一页 ›
              </Text>
            </View>
          )}
        </View>

        <View className="legal-notice">
          <Text className="notice-icon">ℹ️</Text>
          <Text className="notice-text">
            计算结果基于输入参数估算，仅供参考，不构成贷款建议。
          </Text>
        </View>

      </ScrollView>

      <View className="result-footer">
        <Button className="foot-btn" onClick={handleCopy}>
          复制
        </Button>
        <Button
          className="foot-btn primary"
          type="primary"
          onClick={() => Taro.navigateBack()}
        >
          返回修改
        </Button>
      </View>

      <Toast visible={toast.show} content={toast.msg} onClose={() => setToast({ show: false, msg: '' })} />
    </View>
  );
}
