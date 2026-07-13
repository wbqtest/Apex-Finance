import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Button, Cell, CellGroup, Tag, Toast, Empty } from '@nutui/nutui-react-taro';
import CarChart from '../../components/CarChart';
import { REPAYMENT_LABELS } from '../../utils/carFinance';
import { formatCurrency, formatRate } from '../../utils/finance';
import { getCarSchemes, removeCarScheme, CarScheme } from '../../utils/carCompare';
import NavBar from '../../components/NavBar';
import './index.less';

export default function AutoComparePage() {
  const [schemes, setSchemes] = useState<CarScheme[]>([]);
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });

  const refresh = () => setSchemes(getCarSchemes());

  useEffect(() => {
    refresh();
  }, []);

  const sorted = [...schemes].sort((a, b) => {
    const ka = a.result.irrConverged ? a.result.irr : Infinity;
    const kb = b.result.irrConverged ? b.result.irr : Infinity;
    return ka - kb;
  });
  const bestId = sorted[0]?.id;

  const barData = sorted.map((s) => ({
    name: s.label,
    principal: s.result.loanAmount,
    interest: s.result.totalInterest,
  }));

  const handleRemove = (id: string) => {
    removeCarScheme(id);
    refresh();
    setToast({ show: true, msg: '已移除' });
  };

  return (
    <View className="auto-compare">
      <NavBar title="方案对比" />
      <View className="cmp-header">
        <Text className="cmp-title">方案对比</Text>
        <Text className="cmp-sub">按真实年化(IRR)升序，越低越划算</Text>
      </View>

      <ScrollView className="cmp-body" scrollY>
        {schemes.length === 0 ? (
          <Empty description="暂无方案，请先去计算结果页「加入对比」" />
        ) : (
          <>
            <View className="chart-card">
              <Text className="chart-title">各方案本金与利息构成</Text>
              <CarChart
                kind="bar"
                data={barData}
                nameField="name"
                seriesField={['principal', 'interest']}
                seriesNames={['本金', '利息']}
              />
            </View>

            <CellGroup title="方案明细">
              {sorted.map((s) => (
                <Cell
                  key={s.id}
                  title={
                    <View className="cmp-scheme-title">
                      <Text>{s.label}</Text>
                      {s.id === bestId && <Tag type="primary">最优选</Tag>}
                    </View>
                  }
                  description={`${REPAYMENT_LABELS[s.result.repaymentType]} · 贷款¥${formatCurrency(s.result.loanAmount)}`}
                >
                  <View className="cmp-cell-right">
                    <View className="cmp-metrics">
                      <Text>月供 ¥{formatCurrency(s.result.monthlyPayment)}</Text>
                      <Text>利息 ¥{formatCurrency(s.result.totalInterest)}</Text>
                      <Text className="irr">IRR {s.result.irrConverged ? formatRate(s.result.irr) : '—'}</Text>
                    </View>
                    <Button
                      size="small"
                      fill="outline"
                      className="cmp-del"
                      onClick={() => handleRemove(s.id)}
                    >
                      移除
                    </Button>
                  </View>
                </Cell>
              ))}
            </CellGroup>

            <View className="cmp-actions">
              <Button block type="primary" onClick={() => Taro.navigateTo({ url: '/pages/auto' })}>
                新增方案
              </Button>
            </View>
          </>
        )}
      </ScrollView>

      <Toast visible={toast.show} content={toast.msg} onClose={() => setToast({ show: false, msg: '' })} />
    </View>
  );
}
