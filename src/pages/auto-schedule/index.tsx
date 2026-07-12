import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useMemo } from 'react';
import Taro from '@tarojs/taro';
import { calculateCarLoan, CarLoanInput, REPAYMENT_LABELS } from '../../utils/carFinance';
import { formatCurrency } from '../../utils/finance';
import NavBar from '../../components/NavBar';
import './index.less';

export default function AutoSchedulePage() {
  const [input, setInput] = useState<CarLoanInput | null>(null);

  useEffect(() => {
    try {
      const stored = Taro.getStorageSync('AUTO_RESULT_INPUT');
      if (stored) {
        setInput(stored as CarLoanInput);
        Taro.removeStorageSync('AUTO_RESULT_INPUT');
      }
    } catch (e) {
      console.error('读取 storage input 失败', e);
    }
  }, []);

  const result = useMemo(() => (input ? calculateCarLoan(input) : null), [input]);

  if (!input || !result) {
    return (
      <View className="auto-schedule">
        <NavBar title="还款计划表" />
        <View className="loading">加载中…</View>
      </View>
    );
  }

  const hasFee = result.totalFee > 0;

  return (
    <View className="auto-schedule">
      <NavBar title="还款计划表" />
      <View className="schedule-header">
        <Text className="schedule-title">{REPAYMENT_LABELS[result.repaymentType]} · 共 {result.loanTerm} 期</Text>
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
            {hasFee && <Text className="col">费用</Text>}
            <Text className="col">剩余</Text>
          </View>
          {result.repaymentPlan.map((r) => (
            <View className="schedule-row" key={r.period}>
              <Text className="col col-period">{r.period}</Text>
              <Text className="col">{formatCurrency(r.payment)}</Text>
              <Text className="col">{formatCurrency(r.principal)}</Text>
              <Text className="col">{formatCurrency(r.interest)}</Text>
              {hasFee && <Text className="col">{formatCurrency(r.feeAtPeriod)}</Text>}
              <Text className="col">{formatCurrency(r.remainingPrincipal)}</Text>
            </View>
          ))}
        </View>
        <View className="bottom-spacer" />
      </ScrollView>
    </View>
  );
}
