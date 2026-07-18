import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { PrepayInput, PrepayResult } from '../../utils/prepayCalc';
import { formatCurrency } from '../../utils/finance';
import NavBar from '../../components/NavBar';
import './index.less';

const METHOD_LABELS: Record<string, string> = {
  EQUAL_PI: '等额本息',
  EQUAL_P: '等额本金',
};

export default function PrepaySchedulePage() {
  const [input, setInput] = useState<PrepayInput | null>(null);
  const [result, setResult] = useState<PrepayResult | null>(null);

  useEffect(() => {
    try {
      const stored = Taro.getStorageSync<{ input: PrepayInput; result: PrepayResult } | null>('PREPAY_RESULT_DATA');
      if (stored && stored.input && stored.result) {
        setInput(stored.input);
        setResult(stored.result);
        Taro.removeStorageSync('PREPAY_RESULT_DATA');
      }
    } catch (e) {
      console.error('读取 PREPAY_RESULT_DATA 失败', e);
    }
  }, []);

  if (!input || !result) {
    return (
      <View className="prepay-schedule">
        <NavBar title="还款计划表" />
        <View className="loading">加载中…</View>
      </View>
    );
  }

  return (
    <View className="prepay-schedule">
      <NavBar title="还款计划表" />
      <View className="schedule-header">
        <Text className="schedule-title">
          {METHOD_LABELS[input.repaymentType]} · 共 {result.loanTerm} 期
        </Text>
        <Text className="schedule-sub">
          贷款 ¥{formatCurrency(result.loanAmount)} / 月供 ¥{formatCurrency(result.monthlyPayment)}
        </Text>
      </View>

      <ScrollView className="schedule-body" scrollY>
        <View className="schedule-table">
          <View className="schedule-head">
            <Text className="col col-period">期数</Text>
            <Text className="col">还款</Text>
            <Text className="col">本金</Text>
            <Text className="col">利息</Text>
            <Text className="col">剩余本金</Text>
          </View>
          {result.schedules.map((r) => (
            <View className={`schedule-row ${r.month === result.prepayMonth ? 'prepay-month' : ''}`} key={r.month}>
              <Text className="col col-period">{r.month}</Text>
              <Text className="col">{formatCurrency(r.payment)}</Text>
              <Text className="col">{formatCurrency(r.principal)}</Text>
              <Text className="col">{formatCurrency(r.interest)}</Text>
              <Text className="col">{formatCurrency(r.remainingPrincipal)}</Text>
            </View>
          ))}
        </View>
        <View className="bottom-spacer" />
      </ScrollView>
    </View>
  );
}
