import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { Button } from '@nutui/nutui-react-taro';
import { SafeToast } from '../../components/SafeToast';

import NavBar from '../../components/NavBar'
import { addToCompare, CompareItem } from '../../utils/storage'
import { addMortgageScheme } from '../../utils/mortgageCompare'
import { calculateMortgage, MortgageInput } from '../../utils/mortgage'
import { HistoryItem, PrepayHistoryItem } from '../../services/api'
import './index.less'

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  compliant: { label: '合规', color: 'var(--color-compliant)', bg: '#ECFDF5' },
  warning: { label: '偏高', color: 'var(--color-warning)', bg: '#FFFBEB' },
  excessive: { label: '超额', color: 'var(--color-excessive)', bg: '#FEF2F2' },
}

const irrModeLabelMap: Record<string, string> = {
  fixed: '简易模式', custom: '逐期录入', fee: '费用拆分',
}

const prepayModeLabelMap: Record<string, string> = {
  EQUAL_PI: '等额本息', EQUAL_P: '等额本金',
}

const prepayTypeLabelMap: Record<string, string> = {
  FULL: '全部偿还', PARTIAL: '部分偿还',
}

function formatDate(isoStr: string) {
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type DetailType = 'irr' | 'prepay'

export default function HistoryDetailPage() {
  const [type, setType] = useState<DetailType>('irr')
  const [record, setRecord] = useState<HistoryItem | PrepayHistoryItem | null>(null)
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' })

  useEffect(() => {
    const pages = Taro.getCurrentPages()
    const cur = pages[pages.length - 1]
    const opt = (cur as any)?.options || {}
    const t = (opt.type || 'irr') as DetailType
    setType(t)

    const stored = Taro.getStorageSync('HISTORY_DETAIL_ITEM')
    if (stored && stored.record) {
      setRecord(stored.record)
      Taro.removeStorageSync('HISTORY_DETAIL_ITEM')
    }
  }, [])

  const handleAddCompare = () => {
    if (!record) return

    if (type === 'irr') {
      const r = record as HistoryItem
      const item: CompareItem = {
        id: String(r.id) + '_c',
        timestamp: new Date(r.createdAt).getTime(),
        params: {
          mode: r.mode as any,
          principal: r.principal,
          fixedPayment: r.fixedPayment ?? undefined,
          customPayments: r.customPayments ?? undefined,
          periods: r.periods,
        },
        result: {
          irr: r.irr,
          complianceStatus: r.complianceStatus,
          complianceLimit: r.complianceLimit,
          totalPayment: r.totalPayment,
          totalInterest: r.totalInterest,
          excessInterest: r.excessInterest ?? 0,
          nominalAPR: r.nominalAPR ?? 0,
          periods: r.periods,
          irrCompound: r.irrCompound ?? 0,
          monthlyIRR: 0,
          lprUsed: r.lprUsed ?? 0,
          lprDate: '',
          excessPaid: 0,
          excessLevel: 'none',
          actionSuggestion: '',
          cashFlows: [],
        },
        platformName: '贷款1',
      }
      addToCompare(item)
      Taro.navigateTo({ url: '/pages/compare?tab=irr' })
      return
    }

    // prepay -> 加入房贷对比
    const r = record as PrepayHistoryItem
    const d = r.inputSnapshot || {}
    const loanAmount = d.loanAmount ?? r.principal ?? 0
    const loanYears = d.loanYears ?? r.years ?? 0
    const annualRate = d.annualRate ?? r.rate ?? 0
    const repaymentType = d.repaymentType ?? r.mode ?? 'EQUAL_PI'
    const firstPaymentDate = d.firstPaymentDate ?? '2023-01'

    const repayMethod = repaymentType === 'EQUAL_P' ? 'equalPrincipal' : 'equalPrincipalInterest'
    const firstPayDate = firstPaymentDate.length > 7 ? firstPaymentDate.slice(0, 7) : firstPaymentDate

    const input: MortgageInput = {
      repayMethod,
      loanType: 'commercial',
      calcMode: 'byTotal',
      housePrice: loanAmount / 10000,
      loanTotal: loanAmount / 10000,
      ratio: 70,
      years: loanYears,
      firstPayDate,
      commercialRate: annualRate,
      fundRate: 3.25,
      fundAmount: 0,
    }

    const result = calculateMortgage(input)
    if (!result) {
      setToast({ show: true, msg: '数据不完整，无法加入对比' })
      return
    }

    const label = `${prepayModeLabelMap[repaymentType] || repaymentType} · ${prepayTypeLabelMap[r.prepayType] || r.prepayType}`
    addMortgageScheme({
      id: 'prepay_h_' + r.id,
      label,
      input,
      result,
      createdAt: new Date(r.createdAt).getTime(),
    })
    Taro.navigateTo({ url: '/pages/compare?tab=mortgage' })
  }

  if (!record) {
    return (
      <View className="history-detail-page">
        <NavBar title="记录详情" />
        <View className="detail-empty">
          <Text className="detail-empty-text">数据加载失败</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="history-detail-page">
      <NavBar title={type === 'irr' ? '网贷详情' : '提前还贷详情'} />

      <ScrollView scrollY className="detail-body">
        {type === 'irr' ? <IrrDetail record={record as HistoryItem} /> : <PrepayDetail record={record as PrepayHistoryItem} />}
      </ScrollView>

      <View className="detail-footer">
        <Button className="detail-footer-btn" onClick={handleAddCompare}>
          📊 加入对比
        </Button>
      </View>

      <SafeToast visible={toast.show} content={toast.msg} onClose={() => setToast({ show: false, msg: '' })} />
    </View>
  )
}

function IrrDetail({ record }: { record: HistoryItem }) {
  return (
    <View className="detail-section">
      <View className="detail-header">
        <Text className="detail-date">{formatDate(record.createdAt)}</Text>
        <Text className="detail-status" style={{
          color: (statusMap[record.complianceStatus] || statusMap.compliant).color,
          background: (statusMap[record.complianceStatus] || statusMap.compliant).bg,
        }}>
          {(statusMap[record.complianceStatus] || statusMap.compliant).label}
        </Text>
      </View>
      <View className="detail-irr">
        <Text className="detail-irr-value">{record.irr.toFixed(2)}%</Text>
        <Text className="detail-irr-label">IRR</Text>
      </View>
      <View className="detail-info">
        <View className="detail-row"><Text className="detail-label">借款本金</Text><Text className="detail-value">¥{Math.round(record.principal).toLocaleString('zh-CN')}</Text></View>
        <View className="detail-row"><Text className="detail-label">总还款额</Text><Text className="detail-value">¥{Math.round(record.totalPayment).toLocaleString('zh-CN')}</Text></View>
        <View className="detail-row"><Text className="detail-label">总利息</Text><Text className="detail-value">¥{Math.round(record.totalInterest).toLocaleString('zh-CN')}</Text></View>
        <View className="detail-row"><Text className="detail-label">总期数</Text><Text className="detail-value">{record.periods} 期</Text></View>
        <View className="detail-row"><Text className="detail-label">计算模式</Text><Text className="detail-value">{irrModeLabelMap[record.mode] || record.mode}</Text></View>
        <View className="detail-row"><Text className="detail-label">名义APR</Text><Text className="detail-value">{(record.nominalAPR ?? 0).toFixed(2)}%</Text></View>
        <View className="detail-row"><Text className="detail-label">法定上限</Text><Text className="detail-value">{record.complianceLimit}%</Text></View>
        {record.excessInterest != null && record.excessInterest > 0 && (
          <View className="detail-row excess">
            <Text className="detail-label">超额利息</Text>
            <Text className="detail-value" style={{ color: 'var(--color-excessive)' }}>¥{Math.round(record.excessInterest).toLocaleString('zh-CN')}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

function PrepayDetail({ record }: { record: PrepayHistoryItem }) {
  const netSave = record.savedInterest - record.penalty
  return (
    <View className="detail-section">
      <View className="detail-header">
        <Text className="detail-date">{formatDate(record.createdAt)}</Text>
      </View>

      <View className="detail-irr">
        <Text className="detail-irr-value saved">{Math.round(netSave).toLocaleString('zh-CN')}</Text>
        <Text className="detail-irr-label">元 实际节省利息</Text>
      </View>

      <View className="prepay-advantage-card">
        <Text className="prepay-advantage-title">提前还贷优点</Text>
        <View className="prepay-advantage-item">
          <Text className="prepay-advantage-icon">💰</Text>
          <View className="prepay-advantage-content">
            <Text className="prepay-advantage-name">减少利息支出</Text>
            <Text className="prepay-advantage-desc">预计节省利息 ¥{Math.round(record.savedInterest).toLocaleString('zh-CN')}，占原总利息 {(record.savedInterest / record.totalInterest * 100).toFixed(1)}%</Text>
          </View>
        </View>
        <View className="prepay-advantage-item">
          <Text className="prepay-advantage-icon">⏱</Text>
          <View className="prepay-advantage-content">
            <Text className="prepay-advantage-name">缩短还款周期</Text>
            <Text className="prepay-advantage-desc">已还 {record.paidMonths} 期 / 共 {record.periods} 期，提前偿还可显著减少后续利息</Text>
          </View>
        </View>
        <View className="prepay-advantage-item">
          <Text className="prepay-advantage-icon">🛡</Text>
          <View className="prepay-advantage-content">
            <Text className="prepay-advantage-name">降低负债压力</Text>
            <Text className="prepay-advantage-desc">{record.prepayType === 'FULL' ? '一次性还清后彻底摆脱月供压力' : '部分偿还后月供更轻，灵活性更高'}</Text>
          </View>
        </View>
        {record.penalty === 0 && (
          <View className="prepay-advantage-item">
            <Text className="prepay-advantage-icon">✅</Text>
            <View className="prepay-advantage-content">
              <Text className="prepay-advantage-name">无违约金</Text>
              <Text className="prepay-advantage-desc">当前方案无需支付违约金，提前还款成本更低</Text>
            </View>
          </View>
        )}
      </View>

      <View className="detail-info">
        <View className="detail-row"><Text className="detail-label">还款方式</Text><Text className="detail-value">{prepayModeLabelMap[record.mode] || record.mode}</Text></View>
        <View className="detail-row"><Text className="detail-label">提前还款方式</Text><Text className="detail-value">{prepayTypeLabelMap[record.prepayType] || record.prepayType}</Text></View>
        <View className="detail-row"><Text className="detail-label">贷款金额</Text><Text className="detail-value">¥{Math.round(record.principal).toLocaleString('zh-CN')}</Text></View>
        <View className="detail-row"><Text className="detail-label">年利率</Text><Text className="detail-value">{record.rate}%</Text></View>
        <View className="detail-row"><Text className="detail-label">贷款期限</Text><Text className="detail-value">{record.years} 年（{record.periods}期）</Text></View>
        <View className="detail-row"><Text className="detail-label">月供</Text><Text className="detail-value">¥{Math.round(record.monthlyPayment).toLocaleString('zh-CN')}</Text></View>
        <View className="detail-row"><Text className="detail-label">已还月数</Text><Text className="detail-value">{record.paidMonths} 期</Text></View>
        <View className="detail-row"><Text className="detail-label">剩余本金</Text><Text className="detail-value">¥{Math.round(record.remainingPrincipal).toLocaleString('zh-CN')}</Text></View>
        <View className="detail-row"><Text className="detail-label">违约金</Text><Text className="detail-value" style={{ color: record.penalty > 0 ? 'var(--color-excessive)' : 'var(--color-compliant)' }}>¥{Math.round(record.penalty).toLocaleString('zh-CN')}</Text></View>
        <View className="detail-row"><Text className="detail-label">本次需还总额</Text><Text className="detail-value">¥{Math.round(record.totalPrepay).toLocaleString('zh-CN')}</Text></View>
        <View className="detail-row"><Text className="detail-label">原计划总利息</Text><Text className="detail-value">¥{Math.round(record.totalInterest).toLocaleString('zh-CN')}</Text></View>
        <View className="detail-row"><Text className="detail-label">原计划总还款</Text><Text className="detail-value">¥{Math.round(record.totalPayment).toLocaleString('zh-CN')}</Text></View>
        {record.prepayType === 'PARTIAL' && record.partialAmount != null && record.partialAmount > 0 && (
          <View className="detail-row"><Text className="detail-label">本次部分偿还</Text><Text className="detail-value">¥{Math.round(record.partialAmount).toLocaleString('zh-CN')}</Text></View>
        )}
      </View>
    </View>
  )
}
