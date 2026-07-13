import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Button, Cell, CellGroup } from '@nutui/nutui-react-taro';
import { CalculationResult, CalculationParams, generateCSV, generateReportText } from '../../utils/finance';
import { CompareItem, addToCompare } from '../../utils/storage';
import './index.less';

interface FeeItem {
  name: string;
  amount: number;
  chargeType: 'monthly' | 'one-time';
  isSuspectedInterest?: boolean;
}

interface StoredData {
  result: CalculationResult;
  params: CalculationParams;
  fees: FeeItem[];
}

const formatAnonymizedAmount = (amount: number, anonymize: boolean): string => {
  if (!anonymize) return `¥${amount.toFixed(2)}`;
  const str = amount.toFixed(2);
  if (str.length <= 4) return '¥****';
  return `¥${str[0]}****.${str.slice(-2)}`;
};

const formatAnonymizedRate = (rate: number, anonymize: boolean): string => {
  if (!anonymize) return `${rate.toFixed(2)}%`;
  return `${rate.toFixed(1)}%`;
};

export default function ResultPage() {
  const [data, setData] = useState<StoredData | null>(null);
  const [anonymizeAmount, setAnonymizeAmount] = useState(false);

  useEffect(() => {
    const stored = Taro.getStorageSync<StoredData | null>('IRR_RESULT_DETAIL');
    if (stored && stored.result) {
      setData(stored);
      Taro.removeStorageSync('IRR_RESULT_DETAIL');
      return;
    }

    const pages = Taro.getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const options = (currentPage as any).options || {};
    if (options.result) {
      try {
        const result = JSON.parse(decodeURIComponent(options.result)) as CalculationResult;
        setData({ result, params: {} as CalculationParams, fees: [] });
      } catch (e) {
        console.error('解析结果失败', e);
      }
    }
  }, []);

  const handleBack = () => {
    const pages = Taro.getCurrentPages();
    if (pages.length > 1) {
      Taro.navigateBack();
    } else {
      Taro.switchTab({ url: '/pages/index' });
    }
  };

  const handleRecalculate = () => {
    const pages = Taro.getCurrentPages();
    if (pages.length > 1) {
      Taro.navigateBack();
    } else {
      Taro.switchTab({ url: '/pages/index' });
    }
  };

  const handleCompare = () => {
    if (!data?.result) return;
    const item: CompareItem = {
      id: `result_${Date.now()}`,
      timestamp: Date.now(),
      params: data.params,
      result: { ...data.result },
      platformName: '当前计算',
    };
    addToCompare(item);
    Taro.showToast({ title: '已添加至对比', icon: 'none', duration: 2000 });
    setTimeout(() => {
      Taro.navigateTo({ url: '/pages/compare?tab=irr' });
    }, 300);
  };

  const handleCopy = () => {
    if (!data) return;
    try {
      const text = generateReportText(data.params, data.result, data.fees);
      Taro.setClipboardData({ data: text });
      Taro.showToast({ title: '报告已复制', icon: 'success' });
    } catch {
      Taro.showToast({ title: '复制失败', icon: 'none' });
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    try {
      const csv = generateCSV(data.params, data.result, data.fees);
      Taro.setClipboardData({
        data: csv,
        success: () => Taro.showToast({ title: 'CSV已复制', icon: 'success' }),
        fail: () => Taro.showToast({ title: '导出失败', icon: 'none' }),
      });
    } catch {
      Taro.showToast({ title: '导出失败', icon: 'none' });
    }
  };

  if (!data) {
    return (
      <View className="result-container">
        <View className="result-header">
          <View className="header-left" onClick={handleBack}>
            <Text className="back-icon">‹</Text>
          </View>
          <Text className="header-title">计算结果</Text>
          <View className="header-right" />
        </View>
        <View className="loading">加载中...</View>
      </View>
    );
  }

  const { result, params, fees } = data;
  const totalFees = fees.reduce((sum, fee) => {
    if (fee.chargeType === 'monthly' && params.periods) {
      return sum + fee.amount * params.periods;
    }
    return sum + fee.amount;
  }, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return '#16A34A';
      case 'warning': return '#D97706';
      case 'excessive': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'compliant': return '合规';
      case 'warning': return '偏高';
      case 'excessive': return '超额';
      default: return '';
    }
  };

  const getStatusConclusion = (status: string) => {
    switch (status) {
      case 'compliant': return '该贷款利率在法定范围内';
      case 'warning': return '该贷款利率已超过法定上限，建议关注';
      case 'excessive': return '该贷款利率已严重超过法定上限，可主张调整';
      default: return '';
    }
  };

  return (
    <View className="result-container">
      <View className="result-header">
        <View className="header-left" onClick={handleBack}>
          <Text className="back-icon">‹</Text>
        </View>
        <Text className="header-title">计算结果</Text>
        <View className="header-right" onClick={handleCopy}>
          <Text className="copy-icon">📋</Text>
        </View>
      </View>

      <ScrollView scrollY className="result-content">
        <View className={`status-card ${result.complianceStatus}`}>
          <View className="status-badge">
            <Text className="badge-icon">
              {result.complianceStatus === 'compliant' ? '🟢' :
                result.complianceStatus === 'warning' ? '🟡' : '🔴'}
            </Text>
            <Text className="badge-label">{getStatusLabel(result.complianceStatus)}</Text>
          </View>
          <Text className="status-conclusion">{getStatusConclusion(result.complianceStatus)}</Text>
        </View>

        <View className="rate-card">
          <Text className="rate-label">实际年化利率(IRR)</Text>
          <Text className="rate-value" style={{ color: getStatusColor(result.complianceStatus) }}>
            {formatAnonymizedRate(result.irr, anonymizeAmount)}
          </Text>
          <View className="rate-comparison">
            <Text className="comparison-item">名义APR：{formatAnonymizedRate(result.nominalAPR, anonymizeAmount)}</Text>
            {result.irr > result.nominalAPR && (
              <Text className="comparison-item">实际比名义高 {(result.irr - result.nominalAPR).toFixed(2)}%</Text>
            )}
          </View>
        </View>

        {result.excessInterest > 0 && (
          <View className="excess-card">
            <Text className="excess-label">超额利息</Text>
            <Text className="excess-value">{formatAnonymizedAmount(result.excessInterest, anonymizeAmount)}</Text>
            <Text className="excess-tip">该部分利息可能无需支付</Text>
            {result.excessPaid > 0 && (
              <View className="paid-excess">
                <Text className="paid-label">已付超额利息</Text>
                <Text className="paid-value">¥{result.excessPaid.toFixed(2)}</Text>
              </View>
            )}
          </View>
        )}

        <CellGroup className="summary-card">
          <Cell title="总还款额" extra={formatAnonymizedAmount(result.totalPayment, anonymizeAmount)} border={false} />
          <Cell title="总利息" extra={formatAnonymizedAmount(result.totalInterest, anonymizeAmount)} border={false} />
          <Cell title="法定上限(LPR×4)" extra={`${result.complianceLimit.toFixed(2)}%`} border={false} />
          <Cell title="使用LPR" extra={`${result.lprUsed}% (${result.lprDate})`} border={false} />
        </CellGroup>

        {result.avgPayment !== undefined && (
          <View className="stats-card">
            <Text className="stats-title">还款统计</Text>
            <View className="stats-grid">
              <View className="stat-item">
                <Text className="stat-label">平均月供</Text>
                <Text className="stat-value">{formatAnonymizedAmount(result.avgPayment, anonymizeAmount)}</Text>
              </View>
              <View className="stat-item">
                <Text className="stat-label">最高月供</Text>
                <Text className="stat-value">{formatAnonymizedAmount(result.maxPayment || 0, anonymizeAmount)}</Text>
              </View>
              <View className="stat-item">
                <Text className="stat-label">最低月供</Text>
                <Text className="stat-value">{formatAnonymizedAmount(result.minPayment || 0, anonymizeAmount)}</Text>
              </View>
              <View className="stat-item">
                <Text className="stat-label">还款集中度</Text>
                <Text className="stat-value">{(result.paymentConcentration || 0).toFixed(2)}%</Text>
              </View>
            </View>
          </View>
        )}

        {result.cashFlows && result.cashFlows.length > 1 && (
          <View className="cashflow-card">
            <Text className="cashflow-title">现金流明细</Text>
            <View className="cashflow-list">
              {result.cashFlows.map((flow, index) => (
                <View key={index} className="cashflow-row">
                  <Text className="cashflow-label">{index === 0 ? '借款本金' : `第${index}期还款`}</Text>
                  <Text className={`cashflow-value ${index === 0 ? 'cashflow-in' : 'cashflow-out'}`}>
                    {index === 0 ? '+' : '-'}{formatAnonymizedAmount(Math.abs(flow), anonymizeAmount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {totalFees > 0 && fees.length > 0 && (
          <View className="fee-card">
            <Text className="fee-title">费用明细</Text>
            <View className="fee-chart">
              {fees.map((fee, index) => {
                const feeTotal = fee.chargeType === 'monthly' ? fee.amount * (params.periods || 1) : fee.amount;
                const percent = totalFees > 0 ? (feeTotal / totalFees * 100).toFixed(1) : 0;
                const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
                const color = colors[index % colors.length];
                return (
                  <View key={index} className="fee-chart-item">
                    <View className="fee-chart-bar" style={{ width: `${Math.min(parseFloat(String(percent)), 100)}%`, backgroundColor: color }} />
                    <View className="fee-chart-label">
                      <Text className="fee-chart-name" style={{ color }}>{fee.name}</Text>
                      <Text className="fee-chart-value">¥{feeTotal.toFixed(0)} ({percent}%)</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View className="fee-list">
              {fees.map((fee, index) => {
                const feeTotal = fee.chargeType === 'monthly' ? fee.amount * (params.periods || 1) : fee.amount;
                const feePercent = totalFees > 0 ? (feeTotal / totalFees * 100).toFixed(1) : 0;
                return (
                  <View key={index} className={`fee-row ${fee.isSuspectedInterest ? 'suspected-interest' : ''}`}>
                    <Text className="fee-name">{fee.name}</Text>
                    {fee.isSuspectedInterest && <Text className="fee-suspected-tag">⚠️</Text>}
                    <Text className="fee-amount">{formatAnonymizedAmount(feeTotal, anonymizeAmount)}</Text>
                    <Text className="fee-percent">({feePercent}%)</Text>
                  </View>
                );
              })}
              <View className="fee-total">
                <Text className="fee-name">费用合计</Text>
                <Text className="fee-amount">{formatAnonymizedAmount(totalFees, anonymizeAmount)}</Text>
              </View>
            </View>
          </View>
        )}

        {result.excessLevel !== 'none' && result.actionSuggestion && (
          <View className={`action-card ${result.excessLevel}`}>
            <Text className="action-title">行动建议</Text>
            <Text className="action-suggestion">{result.actionSuggestion}</Text>
            <View className="action-list">
              {result.excessLevel === 'slight' && (
                <>
                  <Text className="action-item">1. 仔细核对合同中的费用条款</Text>
                  <Text className="action-item">2. 通过客服渠道询问费用构成</Text>
                </>
              )}
              {result.excessLevel === 'moderate' && (
                <>
                  <Text className="action-item">1. 收集完整的还款记录作为证据</Text>
                  <Text className="action-item">2. 与平台协商要求调整利率至合法范围</Text>
                  <Text className="action-item">3. 必要时咨询专业律师了解维权途径</Text>
                </>
              )}
              {result.excessLevel === 'severe' && (
                <>
                  <Text className="action-item">1. 立即停止继续还款</Text>
                  <Text className="action-item">2. 收集所有相关证据（合同、还款记录等）</Text>
                  <Text className="action-item">3. 向12378金融监管热线投诉举报</Text>
                  <Text className="action-item">4. 咨询律师提起诉讼主张返还超额利息</Text>
                </>
              )}
            </View>
          </View>
        )}

        {result.dataInsufficient && (
          <View className="warning-card">
            <Text className="warning-text">⚠️ 数据量不足（少于3期），计算结果仅供参考</Text>
          </View>
        )}

        <View className="legal-notice">
          <Text className="notice-icon">⚠️</Text>
          <Text className="notice-text">
            本工具仅供参考，不构成法律意见。利率上限标准因地区和案件具体情况存在差异，具体以司法机关认定为准。
          </Text>
        </View>
      </ScrollView>

      <View className="result-footer">
        <View className="result-anonymize-row">
          <Text className="result-anonymize-label">隐藏金额（截图去敏）</Text>
          <Button
            type={anonymizeAmount ? 'primary' : 'default'}
            size="small"
            onClick={() => setAnonymizeAmount(!anonymizeAmount)}
            className="result-anonymize-btn"
          >
            {anonymizeAmount ? '已隐藏' : '显示'}
          </Button>
        </View>
        <View className="footer-actions">
          <Button type="default" size="large" onClick={handleExportCSV} className="footer-btn secondary">导出CSV</Button>
          <Button type="default" size="large" onClick={handleCopy} className="footer-btn secondary">复制报告</Button>
        </View>
        <View className="footer-actions">
          <Button type="default" size="large" onClick={handleCompare} className="footer-btn secondary">加入对比</Button>
          <Button type="primary" size="large" onClick={handleRecalculate} className="footer-btn primary">重新计算</Button>
        </View>
      </View>
    </View>
  );
}
