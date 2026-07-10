import { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro, { useReady } from '@tarojs/taro';
import { Popup, Tabs, TabPane } from '@nutui/nutui-react-taro';
import './index.less';

interface TemplateExpected {
  irr: number;
  apr: number;
  totalPayment: number;
  totalInterest: number;
  complianceStatus: string;
  complianceLimit: number;
}

interface TemplateInputSimple {
  principal: number;
  monthlyPayment: number;
  periods: number;
  quickButton?: number;
}

interface TemplateInputPeriodic {
  principal: number;
  payments: number[];
}

interface TemplateInputFee {
  principal: number;
  periods: number;
  fees: { name: string; amount: number; chargeType: 'monthly' | 'one-time' }[];
}

type TemplateInput = TemplateInputSimple | TemplateInputPeriodic | TemplateInputFee;

interface TemplateCase {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'simple' | 'periodic' | 'fee';
  input: TemplateInput;
  expected: TemplateExpected;
  legalStatus: string;
  legalStatusColor: 'compliant' | 'warning' | 'excessive';
}

const TEMPLATES_DATA: Record<string, TemplateCase[]> = {
  simple: [
    {
      id: 'T01',
      name: '银行低息消费贷',
      description: '2026年交通银行惠民贷新客利率',
      category: '银行',
      type: 'simple',
      input: { principal: 50000, monthlyPayment: 4238.54, periods: 12, quickButton: 12 },
      expected: { irr: 3.10, apr: 3.10, totalPayment: 50862.48, totalInterest: 862.48, complianceStatus: 'compliant', complianceLimit: 12.4 },
      legalStatus: '🟢 合规',
      legalStatusColor: 'compliant',
    },
    {
      id: 'T02',
      name: '银行中等利率贷',
      description: '股份制银行消费贷',
      category: '银行',
      type: 'simple',
      input: { principal: 100000, monthlyPayment: 4345.82, periods: 24, quickButton: 24 },
      expected: { irr: 4.00, apr: 4.00, totalPayment: 104299.68, totalInterest: 4299.68, complianceStatus: 'compliant', complianceLimit: 12.4 },
      legalStatus: '🟢 合规',
      legalStatusColor: 'compliant',
    },
    {
      id: 'T03',
      name: '合规小贷',
      description: '持牌小贷公司合规产品',
      category: '小贷',
      type: 'simple',
      input: { principal: 10000, monthlyPayment: 872.84, periods: 12, quickButton: 12 },
      expected: { irr: 8.50, apr: 8.50, totalPayment: 10474.08, totalInterest: 474.08, complianceStatus: 'compliant', complianceLimit: 12.4 },
      legalStatus: '🟢 合规',
      legalStatusColor: 'compliant',
    },
    {
      id: 'T04',
      name: '信用卡账单分期',
      description: '股份制银行信用卡分期，宣传月费率0.67%',
      category: '信用卡',
      type: 'simple',
      input: { principal: 10000, monthlyPayment: 900.00, periods: 12, quickButton: 12 },
      expected: { irr: 14.31, apr: 8.00, totalPayment: 10800.00, totalInterest: 800.00, complianceStatus: 'warning', complianceLimit: 12.4 },
      legalStatus: '🟡 偏高',
      legalStatusColor: 'warning',
    },
    {
      id: 'T05',
      name: '助贷平台中等费率',
      description: '小象优品分期商城，商品溢价模式',
      category: '助贷',
      type: 'simple',
      input: { principal: 8000, monthlyPayment: 748.18, periods: 12, quickButton: 12 },
      expected: { irr: 23.95, apr: 13.70, totalPayment: 8978.12, totalInterest: 978.12, complianceStatus: 'warning', complianceLimit: 12.4 },
      legalStatus: '🟡 偏高',
      legalStatusColor: 'warning',
    },
  ],
  periodic: [
    {
      id: 'T06',
      name: '消费分期平台（媒体实测）',
      description: '《法治周末》实测网贷平台，6期等额还款',
      category: '媒体实测',
      type: 'periodic',
      input: { principal: 3000, payments: [554.19, 554.19, 554.19, 554.19, 554.19, 554.19] },
      expected: { irr: 35.89, apr: 30.00, totalPayment: 3325.14, totalInterest: 325.14, excessInterest: 165.00, complianceStatus: 'excessive', complianceLimit: 12.4, avgPayment: 554.19, maxPayment: 554.19, minPayment: 554.19, paymentConcentration: 50.00 },
      legalStatus: '🔴 超额',
      legalStatusColor: 'excessive',
    },
    {
      id: 'T07',
      name: '不规则前高后低（分期商城模式）',
      description: '花花有米平台用户投诉案例，前3期高额还款',
      category: '投诉案例',
      type: 'periodic',
      input: { principal: 6000, payments: [1046.32, 1046.32, 1046.32, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52] },
      expected: { irr: 72.00, apr: 45.00, totalPayment: 8156.64, totalInterest: 2156.64, excessInterest: 2156.64, complianceStatus: 'excessive', complianceLimit: 12.4, avgPayment: 679.72, maxPayment: 1046.32, minPayment: 557.52, paymentConcentration: 38.48 },
      legalStatus: '🔴 严重违法',
      legalStatusColor: 'excessive',
    },
    {
      id: 'T08',
      name: '砍头息·超短期高炮',
      description: '富益花APP，借款2000元秒扣600元担保费',
      category: '高炮',
      type: 'periodic',
      input: { principal: 1400, payments: [2008.22] },
      expected: { irr: 1132.65, apr: 500.00, totalPayment: 2008.22, totalInterest: 608.22, excessInterest: 608.22, complianceStatus: 'excessive', complianceLimit: 12.4, avgPayment: 2008.22, maxPayment: 2008.22, minPayment: 2008.22, paymentConcentration: 100.00 },
      legalStatus: '🔴 严重违法（涉嫌非法经营罪）',
      legalStatusColor: 'excessive',
    },
    {
      id: 'T08B',
      name: '砍头息·极端高炮',
      description: '好想用APP，借款3000元秒扣1050元',
      category: '高炮',
      type: 'periodic',
      input: { principal: 1950, payments: [3008.22] },
      expected: { irr: 2200.86, apr: 800.00, totalPayment: 3008.22, totalInterest: 1058.22, excessInterest: 1058.22, complianceStatus: 'excessive', complianceLimit: 12.4, avgPayment: 3008.22, maxPayment: 3008.22, minPayment: 3008.22, paymentConcentration: 100.00 },
      legalStatus: '🔴 严重违法',
      legalStatusColor: 'excessive',
    },
  ],
  fee: [
    {
      id: 'T09',
      name: '宜享花费用拆分',
      description: '助贷平台利息+担保费双轨费用结构',
      category: '助贷',
      type: 'fee',
      input: {
        principal: 34400,
        periods: 12,
        fees: [
          { name: '利息', amount: 125.73, chargeType: 'monthly' },
          { name: '担保费', amount: 194.23, chargeType: 'monthly' },
        ],
      },
      expected: { irr: 22.00, apr: 11.17, totalPayment: 38239.56, totalInterest: 3839.56, complianceStatus: 'warning', complianceLimit: 12.4 },
      legalStatus: '🟡 偏高',
      legalStatusColor: 'warning',
    },
    {
      id: 'T10',
      name: '易得花担保费拆分',
      description: '担保费是利息的1.66倍，变相利息',
      category: '助贷',
      type: 'fee',
      input: {
        principal: 5000,
        periods: 12,
        fees: [
          { name: '利息', amount: 56.12, chargeType: 'monthly' },
          { name: '担保费', amount: 93.24, chargeType: 'monthly' },
        ],
      },
      expected: { irr: 35.85, apr: 13.47, totalPayment: 6792.36, totalInterest: 1792.36, complianceStatus: 'excessive', complianceLimit: 12.4 },
      legalStatus: '🔴 超额',
      legalStatusColor: 'excessive',
    },
    {
      id: 'T09B',
      name: '复杂费用结构（四费齐全）',
      description: '利息+服务费+担保费+保险费的完整场景',
      category: '综合',
      type: 'fee',
      input: {
        principal: 20000,
        periods: 12,
        fees: [
          { name: '利息', amount: 66.67, chargeType: 'monthly' },
          { name: '服务费', amount: 50.00, chargeType: 'monthly' },
          { name: '担保费', amount: 33.33, chargeType: 'monthly' },
          { name: '其他费用', amount: 16.67, chargeType: 'monthly' },
        ],
      },
      expected: { irr: 17.00, apr: 9.00, totalPayment: 22000.00, totalInterest: 2000.00, complianceStatus: 'warning', complianceLimit: 12.4 },
      legalStatus: '🟡 偏高',
      legalStatusColor: 'warning',
    },
  ],
};

export default function TemplateList() {
  const [activeTab, setActiveTab] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateCase | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);

  useReady(() => {
    const pages = Taro.getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const options = (currentPage as any)?.options || {};
    console.log('templates options:', options);
    console.log('templates tab param:', options.tab);
    if (options.tab !== undefined && options.tab !== '') {
      const tabIndex = parseInt(options.tab, 10);
      console.log('templates tabIndex:', tabIndex);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 2) {
        setActiveTab(tabIndex);
        console.log('templates setActiveTab:', tabIndex);
      }
    }
  });

  const currentTemplates = activeTab === 0 ? TEMPLATES_DATA.simple : activeTab === 1 ? TEMPLATES_DATA.periodic : TEMPLATES_DATA.fee;
  const currentMode = activeTab === 0 ? 'simple' : activeTab === 1 ? 'periodic' : 'fee';

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
        Taro.switchTab({ url: '/pages/index' });
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
        <Text className="back-btn" onClick={() => Taro.navigateBack({ fail: () => Taro.switchTab({ url: '/pages/index' }) })}>‹</Text>
        <Text className="template-title">参考模板</Text>
        <View className="template-header-placeholder" />
      </View>

      <Tabs activeKey={String(activeTab)} onChange={(value) => setActiveTab(typeof value === 'string' ? parseInt(value, 10) : value)} className="template-tabs">
        <TabPane title="📝 简易模式" subTitle="一键测算" />
        <TabPane title="📊 逐期录入" subTitle="逐期还款" />
        <TabPane title="💰 费用拆分" subTitle="费用明细" />
      </Tabs>

      <ScrollView scrollY className="template-content">
        <View className="template-section">
          <View className="template-section-header">
            <Text className="template-section-title">📋 {currentMode === 'simple' ? '简易模式模板' : currentMode === 'periodic' ? '逐期录入模板' : '费用拆分模板'}</Text>
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
