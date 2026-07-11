import { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro, { useReady } from '@tarojs/taro';
import { Popup, Tabs, TabPane } from '@nutui/nutui-react-taro';
import { TEMPLATES_DATA, TemplateCase } from '../../data/templates';
import './index.less';

export default function TemplateList() {
  const [activeTab, setActiveTab] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateCase | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]tab=(\d+)/);
    if (match && match[1]) {
      const tabIndex = parseInt(match[1], 10);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 2) {
        setActiveTab(tabIndex);
      }
    }
  }, []);

  const currentTemplates = activeTab === 0 ? TEMPLATES_DATA.simple : activeTab === 1 ? TEMPLATES_DATA.periodic : TEMPLATES_DATA.fee;
  const currentMode = activeTab === 0 ? 'simple' : activeTab === 1 ? 'periodic' : 'fee';

  const handleBack = () => {
    const pages = Taro.getCurrentPages();
    if (pages.length > 1) {
      Taro.navigateBack();
    } else {
      Taro.switchTab({ url: '/pages/index' });
    }
  };

  const handleApply = (template: TemplateCase) => {
    try {
      setLoadingTemplate(template.id);
      const storageData: any = {
        id: template.id,
        name: template.name,
        type: template.type,
        data: {
          loanDate: '',
          paidPeriods: 0,
        },
        expected: template.expected,
      };

      if (template.type === 'simple') {
        const input = template.input as TemplateInputSimple;
        storageData.data.principal = input.principal;
        storageData.data.monthlyPayment = input.monthlyPayment;
        storageData.data.months = input.periods;
      } else if (template.type === 'periodic') {
        const input = template.input as TemplateInputPeriodic;
        storageData.data.principal = input.principal;
        storageData.data.payments = input.payments;
      } else if (template.type === 'fee') {
        const input = template.input as TemplateInputFee;
        storageData.data.principal = input.principal;
        storageData.data.periods = input.periods;
        storageData.data.fees = input.fees;
      }

      Taro.setStorageSync('appliedTemplate', storageData);
      Taro.showToast({ title: '⏳ 正在加载测算...', icon: 'loading', duration: 1500 });
      setTimeout(() => {
        setLoadingTemplate(null);
        const tabIndex = template.type === 'simple' ? 0 : template.type === 'periodic' ? 1 : 2;
        Taro.reLaunch({ url: `/pages/index?tab=${tabIndex}` });
      }, 800);
    } catch (e) {
      setLoadingTemplate(null);
      Taro.showToast({ title: '应用失败', icon: 'none' });
    }
  };

  const handlePreview = (template: TemplateCase) => {
    setSelectedTemplate(template);
    setShowDetail(true);
  };

  const formatInputDisplay = (template: TemplateCase) => {
    if (template.type === 'simple') {
      const input = template.input as TemplateInputSimple;
      return {
        items: [
          { label: '本金', value: `¥${input.principal.toLocaleString()}` },
          { label: '月供', value: `¥${input.monthlyPayment.toLocaleString()}` },
          { label: '期限', value: `${input.periods}期` },
        ],
      };
    } else if (template.type === 'periodic') {
      const input = template.input as TemplateInputPeriodic;
      const totalPayment = input.payments.reduce((a, b) => a + b, 0);
      return {
        items: [
          { label: '本金', value: `¥${input.principal.toLocaleString()}` },
          { label: '期数', value: `${input.payments.length}期` },
          { label: '总还款', value: `¥${totalPayment.toLocaleString()}` },
        ],
      };
    } else if (template.type === 'fee') {
      const input = template.input as TemplateInputFee;
      const totalMonthlyFee = input.fees.filter(f => f.chargeType === 'monthly').reduce((sum, f) => sum + f.amount, 0);
      const totalOneTimeFee = input.fees.filter(f => f.chargeType === 'one-time').reduce((sum, f) => sum + f.amount, 0);
      return {
        items: [
          { label: '本金', value: `¥${input.principal.toLocaleString()}` },
          { label: '期限', value: `${input.periods}期` },
          { label: '月费用', value: `¥${totalMonthlyFee.toLocaleString()}` },
          { label: '一次性费用', value: `¥${totalOneTimeFee.toLocaleString()}` },
        ],
        fees: input.fees,
      };
    }
    return { items: [] };
  };

  return (
    <View className="template-page">
      <View className="template-header">
        <Text className="back-btn" onClick={handleBack}>‹</Text>
        <Text className="template-title">参考模板</Text>
        <View className="template-header-placeholder" />
      </View>
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as number)} className="template-tabs">
        <TabPane tab="📋 简易模式" key={0} />
        <TabPane tab="📅 逐期录入" key={1} />
        <TabPane tab="💰 费用拆分" key={2} />
      </Tabs>
      <ScrollView scrollY className="template-content">
        <View className="template-section">
          <View className="template-section-header">
            <Text className="template-section-subtitle">选择模板快速测算，或直接查看报告</Text>
          </View>
          <View className="template-list">
            {currentTemplates.map((template) => {
              const display = formatInputDisplay(template);
              return (
                <View key={template.id} className={`template-card ${template.legalStatusColor}`}>
                  <View className="template-card-top">
                    <View className="template-card-info">
                      <Text className="template-card-name">{template.name}</Text>
                      <Text className="template-card-desc">{template.description}</Text>
                    </View>
                    <View className={`template-card-status ${template.legalStatusColor}`}>
                      <Text className="template-status-icon">
                        {template.legalStatusColor === 'compliant' ? '🟢' : template.legalStatusColor === 'warning' ? '🟡' : '🔴'}
                      </Text>
                      <Text className="template-status-text">
                        {template.legalStatusColor === 'compliant' ? '合规' : template.legalStatusColor === 'warning' ? '偏高' : '超额'}
                      </Text>
                    </View>
                  </View>
                  <View className="template-card-bottom">
                    {display.items.map((item, index) => (
                      <Text key={index} className="template-card-meta">{item.label} {item.value}</Text>
                    ))}
                    <Text className="template-card-irr">IRR {template.expected.irr.toFixed(2)}%</Text>
                  </View>
                  <View className="template-card-actions">
                    <Button type="default" size="small" onClick={(e) => { e.stopPropagation(); handlePreview(template); }} className="preview-btn">
                      📄 查看报告
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleApply(template); }}
                      className="apply-btn"
                      disabled={loadingTemplate === template.id}
                    >
                      {loadingTemplate === template.id ? '⏳ 加载中' : '📊 加载测算'}
                    </Button>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Popup
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        position="bottom"
        className="template-detail-popup"
      >
        {selectedTemplate && (
          <View className="detail-content">
            <View className="detail-header">
              <Text className="detail-header-title">📄 查看报告</Text>
              <Text className="detail-close-btn" onClick={() => setShowDetail(false)}>✕</Text>
            </View>
            <ScrollView scrollY className="detail-scroll">
              <View className="detail-body">
                <Text className="detail-title">{selectedTemplate.name}</Text>
                <Text className="detail-desc">{selectedTemplate.description}</Text>

                <View className={`template-report-badge ${selectedTemplate.legalStatusColor}`}>
                  <Text className="report-status-icon">
                    {selectedTemplate.legalStatusColor === 'compliant' ? '✅' : selectedTemplate.legalStatusColor === 'warning' ? '⚠️' : '🚫'}
                  </Text>
                  <Text className="report-status-text">{selectedTemplate.legalStatus}</Text>
                </View>

                <View className="template-report-section">
                  <Text className="template-report-label">📥 输入参数</Text>
                  <View className="template-report-grid">
                    {formatInputDisplay(selectedTemplate).items.map((item, index) => (
                      <View key={index} className="template-report-item">
                        <Text className="tr-label">{item.label}</Text>
                        <Text className="tr-value">{item.value}</Text>
                      </View>
                    ))}
                  </View>
                  {selectedTemplate.type === 'fee' && (
                    <View className="template-fee-list">
                      {(selectedTemplate.input as TemplateInputFee).fees.map((fee, index) => (
                        <View key={index} className="template-fee-item">
                          <Text className="tr-label">{fee.name} ({fee.chargeType === 'monthly' ? '月' : '次'})</Text>
                          <Text className="tr-value">¥{fee.amount.toLocaleString()}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View className="template-report-section">
                  <Text className="template-report-label">📊 测算结果</Text>
                  <View className="template-report-grid">
                    <View className="template-report-item highlight">
                      <Text className="tr-label">实际年化 IRR</Text>
                      <Text className="tr-value irr-value">{selectedTemplate.expected.irr.toFixed(2)}%</Text>
                    </View>
                    <View className="template-report-item">
                      <Text className="tr-label">名义 APR</Text>
                      <Text className="tr-value">{selectedTemplate.expected.apr.toFixed(2)}%</Text>
                    </View>
                    <View className="template-report-item">
                      <Text className="tr-label">总还款额</Text>
                      <Text className="tr-value">¥{selectedTemplate.expected.totalPayment.toLocaleString()}</Text>
                    </View>
                    <View className="template-report-item">
                      <Text className="tr-label">总利息</Text>
                      <Text className="tr-value">¥{selectedTemplate.expected.totalInterest.toLocaleString()}</Text>
                    </View>
                    <View className="template-report-item">
                      <Text className="tr-label">法定上限</Text>
                      <Text className="tr-value">{selectedTemplate.expected.complianceLimit}% (LPR×4)</Text>
                    </View>
                    <View className="template-report-item">
                      <Text className="tr-label">合规状态</Text>
                      <Text className={`tr-value status-${selectedTemplate.legalStatusColor}`}>
                        {selectedTemplate.legalStatusColor === 'compliant' ? '合规' : selectedTemplate.legalStatusColor === 'warning' ? '偏高' : '超额'}
                      </Text>
                    </View>
                  </View>
                </View>

                {selectedTemplate.expected.irr > selectedTemplate.expected.complianceLimit && (
                  <View className="template-report-section excess-section">
                    <Text className="template-report-label excess-label">⚠️ 超额利息分析</Text>
                    <Text className="excess-text">
                      该产品年化 IRR {selectedTemplate.expected.irr.toFixed(2)}% 已超过法定上限 {selectedTemplate.expected.complianceLimit}%（LPR×4），
                      超额利息约 <Text className="excess-amount">¥{Math.round(selectedTemplate.expected.totalInterest * (selectedTemplate.expected.irr - selectedTemplate.expected.complianceLimit) / selectedTemplate.expected.irr).toLocaleString()}</Text>。
                      根据相关法规，超过部分的利息可主张调整或返还。
                    </Text>
                  </View>
                )}

                <View className="template-report-section">
                  <Text className="template-report-label">📈 现金流分析</Text>
                  <ScrollView scrollY className="template-cashflow-list">
                    <View className="template-cashflow-row">
                      <Text className="cashflow-label">期初（借款）</Text>
                      <Text className="cashflow-value cashflow-in">+¥{selectedTemplate.input.principal.toLocaleString()}</Text>
                    </View>
                    {selectedTemplate.type === 'simple' && (
                      (selectedTemplate.input as TemplateInputSimple).periods > 0 &&
                      Array.from({ length: (selectedTemplate.input as TemplateInputSimple).periods }, (_, i) => (
                        <View key={i} className="template-cashflow-row">
                          <Text className="cashflow-label">第{i + 1}期（还款）</Text>
                          <Text className="cashflow-value cashflow-out">-¥{(selectedTemplate.input as TemplateInputSimple).monthlyPayment.toLocaleString()}</Text>
                        </View>
                      ))
                    )}
                    {selectedTemplate.type === 'periodic' && (
                      (selectedTemplate.input as TemplateInputPeriodic).payments.map((payment, i) => (
                        <View key={i} className="template-cashflow-row">
                          <Text className="cashflow-label">第{i + 1}期（还款）</Text>
                          <Text className="cashflow-value cashflow-out">-¥{payment.toLocaleString()}</Text>
                        </View>
                      ))
                    )}
                    {selectedTemplate.type === 'fee' && (
                      (selectedTemplate.input as TemplateInputFee).periods > 0 &&
                      Array.from({ length: (selectedTemplate.input as TemplateInputFee).periods }, (_, i) => {
                        const input = selectedTemplate.input as TemplateInputFee;
                        const monthlyFees = input.fees.filter(f => f.chargeType === 'monthly').reduce((sum, f) => sum + f.amount, 0);
                        return (
                          <View key={i} className="template-cashflow-row">
                            <Text className="cashflow-label">第{i + 1}期（还款）</Text>
                            <Text className="cashflow-value cashflow-out">-¥{monthlyFees.toLocaleString()}</Text>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                </View>

                <View className="template-report-section">
                  <Text className="template-report-label">⚖️ 法律依据</Text>
                  <View className="template-report-law">
                    <Text className="law-text">《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第二十五条</Text>
                    <Text className="law-desc">出借人请求借款人按照合同约定利率支付利息的，人民法院应予支持，但是双方约定的利率超过合同成立时一年期贷款市场报价利率四倍的除外。</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
            <View className="detail-actions">
              <Button type="default" size="large" onClick={() => setShowDetail(false)} className="detail-btn-cancel" disabled={loadingTemplate !== null}>关闭</Button>
              <Button
                type="primary"
                size="large"
                onClick={() => {
                  handleApply(selectedTemplate);
                  setShowDetail(false);
                }}
                className="detail-btn-apply"
                disabled={loadingTemplate !== null}
              >
                {loadingTemplate !== null ? '⏳ 加载中' : '📊 加载测算'}
              </Button>
            </View>
          </View>
        )}
      </Popup>
    </View>
  );
}
