import { View, Text } from '@tarojs/components';
import { Cell, CellGroup } from '@nutui/nutui-react-taro';
import { CalculationResult, CalculationParams } from '../../utils/finance';

interface Props {
  result: CalculationResult;
  params: CalculationParams;
}

export default function ResultCard({ result, params }: Props) {
  const statusConfig = {
    compliant: {
      icon: '🟢',
      text: '合规',
      description: '该贷款利率在法定范围内',
    },
    warning: {
      icon: '🟡',
      text: '偏高',
      description: '该贷款利率已超过法定上限，建议关注',
    },
    excessive: {
      icon: '🔴',
      text: '超额',
      description: '该贷款利率已严重超过法定上限，可主张调整',
    },
  };

  const config = statusConfig[result.complianceStatus];
  const irrDiff = result.irr - result.nominalAPR;
  const isCustomMode = params.mode === 'custom';

  return (
    <View className="result-section">
      <View className="compliance-card">
        <View className={`compliance-badge ${result.complianceStatus}`}>
          <Text className="compliance-icon">{config.icon}</Text>
          <Text className="compliance-text">{config.text}</Text>
        </View>
        <Text className="compliance-desc">{config.description}</Text>
      </View>

      <View className="rate-card">
        <Text className="card-title">核心利率</Text>
        <View className="irr-center">
          <Text className="irr-label">实际年化 IRR</Text>
          <Text className="irr-number">{result.irr.toFixed(2)}%</Text>
          {result.irrCompound !== result.irr && (
            <Text className="irr-compound">复利年化：{result.irrCompound.toFixed(2)}%</Text>
          )}
        </View>
        <CellGroup border={false}>
          <Cell title="名义 APR" extra={<Text className="compare-value">{result.nominalAPR.toFixed(2)}%</Text>} />
          {Math.abs(irrDiff) > 0.01 && (
            <Cell title="实际比名义" extra={<Text className={`compare-value ${irrDiff > 0 ? 'positive' : 'negative'}`}>
              {irrDiff > 0 ? '+' : ''}{irrDiff.toFixed(2)}%
            </Text>} />
          )}
          <Cell title="法定上限（LPR×4）" extra={<Text className="compare-value">{result.complianceLimit}%</Text>} />
          <Cell title="参考LPR" extra={<Text className="compare-value">{result.lprUsed}%（{result.lprDate}）</Text>} />
        </CellGroup>
      </View>

      {result.complianceStatus !== 'compliant' && (
        <View className="excess-card">
          <Text className="card-title">超额利息</Text>
          <Text className="excess-amount">¥{result.excessInterest.toLocaleString()}</Text>
          <Text className="excess-note">⚠️ 该部分利息可能无需支付</Text>
          {result.excessPaid > 0 && (
            <CellGroup border={false}>
              <Cell title="已付超额利息" extra={<Text className="compare-value positive">¥{result.excessPaid.toLocaleString()}</Text>} />
            </CellGroup>
          )}
          <Text className="excess-law">
            《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》
          </Text>
        </View>
      )}

      <View className="summary-card">
        <Text className="card-title">还款汇总</Text>
        <CellGroup border={false}>
          <Cell title="借款本金" extra={<Text className="compare-value">¥{params.principal.toLocaleString()}</Text>} />
          <Cell title="总还款额" extra={<Text className="compare-value">¥{result.totalPayment.toLocaleString()}</Text>} />
          <Cell title="总利息" extra={<Text className="compare-value">¥{result.totalInterest.toLocaleString()}</Text>} />
          <Cell title="总期数" extra={<Text className="compare-value">{result.periods} 期</Text>} />
        </CellGroup>
      </View>

      {isCustomMode && result.avgPayment !== undefined && (
        <View className="stats-card">
          <Text className="card-title">逐期还款统计</Text>
          <CellGroup border={false}>
            <Cell title="平均月供" extra={<Text className="compare-value">¥{result.avgPayment?.toLocaleString()}</Text>} />
            <Cell title="最高月供" extra={<Text className="compare-value">¥{result.maxPayment?.toLocaleString()}</Text>} />
            <Cell title="最低月供" extra={<Text className="compare-value">¥{result.minPayment?.toLocaleString()}</Text>} />
            <Cell title="还款集中度" extra={<Text className="compare-value">前50%期数占总还款的 {result.paymentConcentration}%</Text>} />
          </CellGroup>
        </View>
      )}
    </View>
  );
}
