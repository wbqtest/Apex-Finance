import { View, Text, Input, Button } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import {
  calculateAllFromPayments,
  formatCurrency,
  formatRate,
  CalculationResult,
} from '../../utils/finance';
import {
  getLatestLPR,
  formatLPRDate,
  ComplianceStatus,
} from '../../data/lpr';
import { QUICK_PERIODS } from '../../data/templates';
import CustomTabBar from '../../components/CustomTabBar/custom-tab-bar';
import './index.less';

export default function Calculator() {
  const [principal, setPrincipal] = useState<string>('');
  const [payment, setPayment] = useState<string>('');
  const [periods, setPeriods] = useState<string>('');
  const [paidPeriods, setPaidPeriods] = useState<string>('0');
  const [lprRecord, setLprRecord] = useState(getLatestLPR());
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = () => {
    const principalNum = parseFloat(principal.replace(/,/g, ''));
    const paymentNum = parseFloat(payment.replace(/,/g, ''));
    const periodsNum = parseInt(periods, 10);
    const paidPeriodsNum = parseInt(paidPeriods, 10) || 0;

    if (!principalNum || !paymentNum || !periodsNum) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    if (principalNum <= 0) {
      Taro.showToast({ title: '借款本金必须大于0', icon: 'none' });
      return;
    }

    if (paymentNum <= 0) {
      Taro.showToast({ title: '每期还款额必须大于0', icon: 'none' });
      return;
    }

    if (periodsNum <= 0) {
      Taro.showToast({ title: '借款期限必须大于0', icon: 'none' });
      return;
    }

    if (paidPeriodsNum > periodsNum) {
      Taro.showToast({ title: '已还期数不能超过总期数', icon: 'none' });
      return;
    }

    setIsCalculating(true);

    setTimeout(() => {
      const calculatedResult = calculateAllFromPayments(
        principalNum,
        paymentNum,
        periodsNum,
        lprRecord.value,
        paidPeriodsNum
      );
      setResult(calculatedResult);
      setIsCalculating(false);
    }, 300);
  };

  const handleReset = () => {
    setPrincipal('');
    setPayment('');
    setPeriods('');
    setPaidPeriods('0');
    setResult(null);
  };

  const handleCopy = () => {
    if (!result) return;

    const text = `网贷利率检测结果：
实际年化利率(IRR)：${result.irr}%
法定上限(LPR×4)：${result.legalLimit}%
合规状态：${getStatusLabel(result.complianceStatus)}
超额利息：¥${formatCurrency(result.excessInterest)}
总还款额：¥${formatCurrency(result.totalPayment)}
总利息：¥${formatCurrency(result.totalInterest)}

仅供参考，不构成法律意见。`;

    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showToast({ title: '已复制', icon: 'success' });
      },
    });
  };

  const formatPrincipalInput = (value: string): string => {
    const num = parseFloat(value.replace(/,/g, ''));
    if (isNaN(num) || num <= 0) return value;
    return num.toLocaleString('zh-CN');
  };

  const getStatusLabel = (status: ComplianceStatus): string => {
    switch (status) {
      case 'compliant':
        return '合规';
      case 'warning':
        return '偏高';
      case 'excessive':
        return '超额';
      default:
        return '';
    }
  };

  const getStatusColor = (status: ComplianceStatus): string => {
    switch (status) {
      case 'compliant':
        return '#16A34A';
      case 'warning':
        return '#D97706';
      case 'excessive':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const getStatusConclusion = (status: ComplianceStatus): string => {
    switch (status) {
      case 'compliant':
        return '该贷款利率在法定范围内';
      case 'warning':
        return '该贷款利率已超过法定上限，建议关注';
      case 'excessive':
        return '该贷款利率已严重超过法定上限，可主张调整';
      default:
        return '';
    }
  };

  const isFormValid = principal && payment && periods;

  return (
    <View className="calculator-container">
      <View className="calculator-header">
        <Text className="app-name">网贷利率测</Text>
        <View className="lpr-info">
          <Text className="lpr-label">LPR</Text>
          <Text className="lpr-value">{lprRecord.value}%</Text>
          <Text className="lpr-date">({formatLPRDate(lprRecord.date)})</Text>
        </View>
        <Text className="lpr-source">数据来源：全国银行间同业拆借中心</Text>
      </View>

      <View className="input-section">
        <View className="input-card">
          <Text className="input-label">借款本金</Text>
          <View className="input-wrapper">
            <Text className="input-prefix">¥</Text>
            <Input
              className="input-field"
              type="digit"
              value={principal}
              placeholder="请输入实际到账金额"
              onInput={(e: any) => setPrincipal(e.detail.value)}
            />
          </View>
          <View className="input-tip">
            <Text className="tip-icon">⚠️</Text>
            <Text className="tip-text">本金为实际到账金额，非合同金额</Text>
          </View>
        </View>

        <View className="input-card">
          <Text className="input-label">每期还款额</Text>
          <View className="input-wrapper">
            <Text className="input-prefix">¥</Text>
            <Input
              className="input-field"
              type="digit"
              value={payment}
              placeholder="请输入每期实际还款"
              onInput={(e: any) => setPayment(e.detail.value)}
            />
          </View>
          <Text className="input-helper">含本息及所有费用</Text>
        </View>

        <View className="input-card">
          <Text className="input-label">借款期限</Text>
          <View className="input-wrapper">
            <Input
              className="input-field term-input"
              type="number"
              value={periods}
              placeholder="请输入总期数"
              onInput={(e: any) => setPeriods(e.detail.value)}
            />
            <Text className="input-suffix">期(月)</Text>
          </View>
          <View className="quick-buttons">
            {QUICK_PERIODS.map((p) => (
              <Button
                key={p}
                className={`quick-btn ${periods === p.toString() ? 'active' : ''}`}
                onClick={() => setPeriods(p.toString())}
              >
                {p}期
              </Button>
            ))}
          </View>
        </View>

        <View className="input-card">
          <Text className="input-label">已还期数</Text>
          <View className="input-wrapper">
            <Input
              className="input-field"
              type="number"
              value={paidPeriods}
              placeholder="0"
              onInput={(e: any) => setPaidPeriods(e.detail.value)}
            />
            <Text className="input-suffix">期</Text>
          </View>
          <Text className="input-helper">用于计算已付超额利息</Text>
        </View>
      </View>

      <Button
        className={`calculate-btn ${isFormValid ? 'active' : ''}`}
        onClick={handleCalculate}
        loading={isCalculating}
        disabled={!isFormValid || isCalculating}
      >
        {isCalculating ? '测算中...' : '开始测算'}
      </Button>

      {result && (
        <View className="result-section">
          <View
            className={`status-card ${result.complianceStatus}`}
          >
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
            <Text className="rate-value">{formatRate(result.irr)}</Text>
            <View className="rate-comparison">
              <Text className="comparison-item">名义APR：{formatRate(result.nominalAPR)}</Text>
              <Text className="comparison-item">
                实际比名义高 {formatRate(result.irr - result.nominalAPR)}
              </Text>
            </View>
          </View>

          {result.complianceStatus !== 'compliant' && (
            <View className="excess-card">
              <Text className="excess-label">超额利息</Text>
              <Text className="excess-value">¥{formatCurrency(result.excessInterest)}</Text>
              <Text className="excess-tip">该部分利息可能无需支付</Text>
              {result.paidExcessInterest > 0 && (
                <View className="paid-excess">
                  <Text className="paid-label">已付超额利息</Text>
                  <Text className="paid-value">¥{formatCurrency(result.paidExcessInterest)}</Text>
                </View>
              )}
              <Text className="legal-reference">
                《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》
              </Text>
            </View>
          )}

          <View className="summary-card">
            <View className="summary-row">
              <Text className="summary-label">总还款额</Text>
              <Text className="summary-value">¥{formatCurrency(result.totalPayment)}</Text>
            </View>
            <View className="summary-row">
              <Text className="summary-label">总利息</Text>
              <Text className="summary-value">¥{formatCurrency(result.totalInterest)}</Text>
            </View>
            <View className="summary-row">
              <Text className="summary-label">法定上限(LPR×4)</Text>
              <Text className="summary-value">{formatRate(result.legalLimit)}</Text>
            </View>
          </View>

          <View className="action-buttons">
            <Button className="action-btn copy-btn" onClick={handleCopy}>
              📋 复制结果
            </Button>
            <Button className="action-btn reset-btn" onClick={handleReset}>
              🔄 重新测算
            </Button>
          </View>
        </View>
      )}

      <View className="legal-notice">
        <Text className="notice-icon">⚖️</Text>
        <Text className="notice-text">
          本工具仅供参考，不构成法律意见。利率上限标准因地区和案件具体情况存在差异，具体以司法机关认定为准。
        </Text>
      </View>

      <CustomTabBar />
    </View>
  );
}
