import { View, Text } from '@tarojs/components';
import { useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { Cell, CellGroup, Button } from '@nutui/nutui-react-taro';
import { CalculationResult, formatCurrency, formatRate } from '../../utils/finance';
import { CompareItem, addToCompare } from '../../utils/storage';
import './index.less';

export default function ResultPage() {
  const [result, setResult] = useState<CalculationResult | null>(null);

  useEffect(() => {
    const pages = Taro.getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const options = (currentPage as any).options || {};

    if (options.result) {
      try {
        setResult(JSON.parse(decodeURIComponent(options.result)));
      } catch (e) {
        console.error('解析结果失败', e);
      }
    }
  }, []);

  const handleCopy = () => {
    if (!result) return;
    const statusMap: Record<string, string> = { compliant: '合规', warning: '偏高', excessive: '超额' };
    const text = [
      `【网贷利率测 - 计算结果】`,
      `实际年化IRR：${result.irr.toFixed(2)}%`,
      `名义APR：${result.nominalAPR.toFixed(2)}%`,
      `合规状态：${statusMap[result.complianceStatus]}`,
      `法定上限(LPR×4)：${result.complianceLimit}%`,
      result.excessInterest > 0 ? `超额利息：¥${result.excessInterest.toFixed(2)}` : '',
      `总还款额：¥${result.totalPayment.toFixed(2)}`,
      `总利息：¥${result.totalInterest.toFixed(2)}`,
      `\n⚖️ 本工具仅供参考，不构成法律意见。`,
    ].filter(Boolean).join('\n');

    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showToast({ title: '结果已复制到剪贴板', icon: 'none' });
      },
    });
  };

  const handleBack = () => {
    Taro.navigateBack({ fail: () => Taro.switchTab({ url: '/pages/index' }) });
  };

  const handleRecalculate = () => {
    Taro.navigateBack({ fail: () => Taro.switchTab({ url: '/pages/index' }) });
  };

  const handleReport = () => {
    if (!result) return;
    Taro.setStorageSync('reportParams', JSON.stringify({}));
    Taro.setStorageSync('reportResult', JSON.stringify(result));
    Taro.setStorageSync('reportTimestamp', Date.now());
    Taro.navigateTo({ url: '/pages/report' });
  };

  const handleCompare = () => {
    if (!result) return;
    const item: CompareItem = {
      id: `result_${Date.now()}`,
      timestamp: Date.now(),
      params: {},
      result: { ...result },
      platformName: '当前计算',
    };
    addToCompare(item);
    Taro.showToast({ title: '已添加至对比列表', icon: 'none', duration: 2000 });
    Taro.navigateTo({ url: '/pages/compare' });
  };

  if (!result) {
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
        <View className="loading">加载中...</View>
      </View>
    );
  }

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
          <Text className="back-icon">←</Text>
        </View>
        <Text className="header-title">计算结果</Text>
        <View className="header-right" onClick={handleCopy}>
          <Text className="copy-icon">📋</Text>
        </View>
      </View>

      <View className="result-content">
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
            {formatRate(result.irr)}
          </Text>
          <View className="rate-comparison">
            <Text className="comparison-item">名义APR：{formatRate(result.nominalAPR)}</Text>
            {result.irr > result.nominalAPR && (
              <Text className="comparison-item">
                实际比名义高 {formatRate(result.irr - result.nominalAPR)}
              </Text>
            )}
          </View>
        </View>

        {result.complianceStatus !== 'compliant' && (
          <View className="excess-card">
            <Text className="excess-label">超额利息</Text>
            <Text className="excess-value">¥{formatCurrency(result.excessInterest)}</Text>
            <Text className="excess-tip">该部分利息可能无需支付</Text>
            {result.excessPaid > 0 && (
              <View className="paid-excess">
                <Text className="paid-label">已付超额利息</Text>
                <Text className="paid-value">¥{formatCurrency(result.excessPaid)}</Text>
              </View>
            )}
          </View>
        )}

        <CellGroup className="summary-card">
          <Cell title="总还款额" extra={`¥${formatCurrency(result.totalPayment)}`} border={false} />
          <Cell title="总利息" extra={`¥${formatCurrency(result.totalInterest)}`} border={false} />
          <Cell title="法定上限(LPR×4)" extra={formatRate(result.complianceLimit)} border={false} />
          <Cell title="使用LPR" extra={`${result.lprUsed}% (${result.lprDate})`} border={false} />
        </CellGroup>

        <View className="legal-notice">
          <Text className="notice-icon">⚖️</Text>
          <Text className="notice-text">
            本工具仅供参考，不构成法律意见。利率上限标准因地区和案件具体情况存在差异，具体以司法机关认定为准。
          </Text>
        </View>
      </View>

      <View className="result-footer">
        <View className="footer-actions">
          <Button type="default" size="large" onClick={handleCompare} className="footer-btn secondary">
            🔄 加入对比
          </Button>
          <Button type="default" size="large" onClick={handleReport} className="footer-btn secondary">
            📋 生成报告
          </Button>
        </View>
        <Button type="primary" size="large" onClick={handleRecalculate} className="footer-btn">
          🔄 重新计算
        </Button>
      </View>
    </View>
  );
}
