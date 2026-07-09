import { useState } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Popup } from '@nutui/nutui-react-taro';
import './index.less';

const TEMPLATES = [
  {
    id: 1,
    name: '简易模式-案例1',
    desc: '本金5万，月供4238.54，12期，预期IRR 3.10%',
    type: 'simple',
    data: {
      principal: 50000,
      monthlyPayment: 4238.54,
      months: 12,
    },
  },
  {
    id: 2,
    name: '简易模式-案例2',
    desc: '本金10万，月供4345.82，24期，预期IRR 4.00%',
    type: 'simple',
    data: {
      principal: 100000,
      monthlyPayment: 4345.82,
      months: 24,
    },
  },
  {
    id: 3,
    name: '简易模式-案例3',
    desc: '本金1万，月供872.84，12期，预期IRR 8.50%',
    type: 'simple',
    data: {
      principal: 10000,
      monthlyPayment: 872.84,
      months: 12,
    },
  },
  {
    id: 4,
    name: '简易模式-案例4',
    desc: '本金1万，月供900，12期，预期IRR 14.31%',
    type: 'simple',
    data: {
      principal: 10000,
      monthlyPayment: 900,
      months: 12,
    },
  },
  {
    id: 5,
    name: '简易模式-案例5',
    desc: '本金8千，月供748.18，12期，预期IRR 23.95%',
    type: 'simple',
    data: {
      principal: 8000,
      monthlyPayment: 748.18,
      months: 12,
    },
  },
  {
    id: 6,
    name: '逐期录入-案例1',
    desc: '本金3千，6期等额还款，预期IRR 35.89%',
    type: 'periodic',
    data: {
      principal: 3000,
      payments: [554.19, 554.19, 554.19, 554.19, 554.19, 554.19],
    },
  },
  {
    id: 7,
    name: '逐期录入-案例2',
    desc: '本金6千，前3期1046.32，后9期557.52，预期IRR 72.00%',
    type: 'periodic',
    data: {
      principal: 6000,
      payments: [1046.32, 1046.32, 1046.32, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52],
    },
  },
  {
    id: 8,
    name: '逐期录入-案例3',
    desc: '本金1400，1期还款2008.22，预期IRR 1132.65%',
    type: 'periodic',
    data: {
      principal: 1400,
      payments: [2008.22],
    },
  },
  {
    id: 9,
    name: '费用拆分-案例1',
    desc: '本金34400，12期，含利息和担保费，预期IRR 22.00%',
    type: 'fee',
    data: {
      principal: 34400,
      periods: 12,
      fees: [
        { name: '利息', amount: 1508.80, chargeType: 'monthly' as const },
        { name: '担保费', amount: 2330.76, chargeType: 'monthly' as const },
      ],
    },
  },
  {
    id: 10,
    name: '费用拆分-案例2',
    desc: '本金5000，12期，含利息和担保费，预期IRR 35.85%',
    type: 'fee',
    data: {
      principal: 5000,
      periods: 12,
      fees: [
        { name: '利息', amount: 673.48, chargeType: 'monthly' as const },
        { name: '担保费', amount: 1118.88, chargeType: 'monthly' as const },
      ],
    },
  },
  {
    id: 11,
    name: '费用拆分-案例3',
    desc: '本金20000，12期，含利息、服务费、担保费等，预期IRR 17.00%',
    type: 'fee',
    data: {
      principal: 20000,
      periods: 12,
      fees: [
        { name: '利息', amount: 800.00, chargeType: 'monthly' as const },
        { name: '服务费', amount: 600.00, chargeType: 'monthly' as const },
        { name: '担保费', amount: 400.00, chargeType: 'monthly' as const },
        { name: '其他费用', amount: 200.00, chargeType: 'monthly' as const },
      ],
    },
  },
];

export default function TemplateList() {
  const [showDetail, setShowDetail] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);

  const handleApply = (template: typeof TEMPLATES[0]) => {
    try {
      Taro.setStorageSync('appliedTemplate', template);
      Taro.showToast({ title: '已应用模板', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1000);
    } catch (e) {
      Taro.showToast({ title: '应用失败', icon: 'none' });
    }
  };

  const handlePreview = (template: typeof TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setShowDetail(true);
  };

  return (
    <View className="template-page">
      <View className="template-header">
        <Text className="back-btn" onClick={() => Taro.navigateBack({ fail: () => Taro.switchTab({ url: '/pages/index' }) })}>‹</Text>
        <Text className="template-title">参考模板</Text>
        <View className="template-header-placeholder" />
      </View>

      <ScrollView scrollY className="template-content">
        <View className="template-list">
          {TEMPLATES.map((template) => (
            <View key={template.id} className="template-card">
              <View className="template-info">
                <Text className="template-name">{template.name}</Text>
                <Text className="template-desc">{template.desc}</Text>
                <Text className="template-type">{template.type === 'simple' ? '简易模式' : template.type === 'periodic' ? '逐期录入' : '费用拆分'}</Text>
              </View>
              <View className="template-actions">
                <Button type="default" size="small" onClick={() => handlePreview(template)} className="preview-btn">
                  预览
                </Button>
                <Button type="primary" size="small" onClick={() => handleApply(template)} className="apply-btn">
                  应用
                </Button>
              </View>
            </View>
          ))}
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
            <Text className="detail-title">{selectedTemplate.name}</Text>
            <Text className="detail-desc">{selectedTemplate.desc}</Text>
            <View className="detail-data">
              {selectedTemplate.type === 'simple' ? (
                <>
                  <View className="data-item">
                    <Text className="data-label">本金</Text>
                    <Text className="data-value">¥{selectedTemplate.data.principal.toLocaleString()}</Text>
                  </View>
                  <View className="data-item">
                    <Text className="data-label">月供</Text>
                    <Text className="data-value">¥{selectedTemplate.data.monthlyPayment.toLocaleString()}</Text>
                  </View>
                  <View className="data-item">
                    <Text className="data-label">期数</Text>
                    <Text className="data-value">{selectedTemplate.data.months}期</Text>
                  </View>
                </>
              ) : selectedTemplate.type === 'periodic' ? (
                <>
                  <View className="data-item">
                    <Text className="data-label">本金</Text>
                    <Text className="data-value">¥{selectedTemplate.data.principal.toLocaleString()}</Text>
                  </View>
                  <View className="data-item">
                    <Text className="data-label">期数</Text>
                    <Text className="data-value">{selectedTemplate.data.payments.length}期</Text>
                  </View>
                  <View className="data-item">
                    <Text className="data-label">首月还款</Text>
                    <Text className="data-value">¥{selectedTemplate.data.payments[0].toLocaleString()}</Text>
                  </View>
                  <View className="data-item">
                    <Text className="data-label">末月还款</Text>
                    <Text className="data-value">¥{selectedTemplate.data.payments[selectedTemplate.data.payments.length - 1].toLocaleString()}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View className="data-item">
                    <Text className="data-label">本金</Text>
                    <Text className="data-value">¥{selectedTemplate.data.principal.toLocaleString()}</Text>
                  </View>
                  <View className="data-item">
                    <Text className="data-label">期数</Text>
                    <Text className="data-value">{selectedTemplate.data.periods}期</Text>
                  </View>
                  <View className="data-item">
                    <Text className="data-label">费用明细</Text>
                    <Text className="data-value">{selectedTemplate.data.fees.length}项</Text>
                  </View>
                  {selectedTemplate.data.fees.map((fee: { name: string; amount: number; chargeType: string }, index: number) => (
                    <View key={index} className="data-item fee-item">
                      <Text className="data-label">{fee.name}</Text>
                      <Text className="data-value">¥{fee.amount.toLocaleString()}/{fee.chargeType === 'monthly' ? '月' : '次'}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
            <Button type="primary" onClick={() => {
              handleApply(selectedTemplate);
              setShowDetail(false);
            }} className="detail-apply-btn">
              应用模板
            </Button>
          </View>
        )}
      </Popup>
    </View>
  );
}
