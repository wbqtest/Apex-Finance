import { useState, useCallback } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import './index.less'
import {
  fetchHistory, deleteHistoryRecord, deleteHistoryRecordsBatch, HistoryItem,
  fetchMortgageHistory, deleteMortgageRecord, deleteMortgageRecordsBatch, MortgageHistoryItem,
  fetchAutoLoanHistory, deleteAutoLoanRecord, deleteAutoLoanRecordsBatch, AutoLoanHistoryItem,
  fetchPrepayHistory, deletePrepayRecord, deletePrepayRecordsBatch, PrepayHistoryItem,
} from '../../services/api'
import { getToken } from '../../utils/storage'
import { calculateMortgage, MortgageInput } from '../../utils/mortgage'
import { calculateCarLoan, CarLoanInput } from '../../utils/carFinance'

// ---- 公共 ----
const checkLogin = (): boolean => {
  const token = getToken()
  if (!token) {
    Taro.showToast({ title: '请先登录', icon: 'none' })
    Taro.navigateTo({ url: '/pages/login' })
    return false
  }
  return true
}

const handleBack = () => {
  const pages = Taro.getCurrentPages()
  if (pages.length > 1) {
    Taro.navigateBack()
  } else {
    Taro.switchTab({ url: '/pages/index' })
  }
}

function formatDate(isoStr: string) {
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const openHistoryDetail = (type: 'irr' | 'prepay', record: any) => {
  Taro.setStorageSync('HISTORY_DETAIL_ITEM', { type, record })
  Taro.navigateTo({ url: `/pages/history-detail?type=${type}` })
}

const showToast = (msg: string) => {
  Taro.showToast({ title: msg, icon: 'none', duration: 2000 })
}

// ---- 标签 ----
type TabType = 'irr' | 'mortgage' | 'auto' | 'prepay'
const TABS: { key: TabType; label: string }[] = [
  { key: 'irr', label: '网贷' },
  { key: 'mortgage', label: '房贷' },
  { key: 'auto', label: '车贷' },
  { key: 'prepay', label: '提前还贷' },
]

// ---- 网贷：模式和状态映射 ----
const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  compliant: { label: '合规', color: 'var(--color-compliant)', bg: '#ECFDF5' },
  warning: { label: '偏高', color: 'var(--color-warning)', bg: '#FFFBEB' },
  excessive: { label: '超额', color: 'var(--color-excessive)', bg: '#FEF2F2' },
}
const irrModeLabelMap: Record<string, string> = {
  fixed: '简易模式', custom: '逐期录入', fee: '费用拆分',
}

// ---- 房贷：还款方式 ----
const mortgageModeLabelMap: Record<string, string> = {
  '等额本息': '等额本息', '等额本金': '等额本金',
}

// ---- 车贷：还款方式 ----
const autoModeLabelMap: Record<string, string> = {
  EQUAL_PI: '等额本息', EQUAL_P: '等额本金',
  INTEREST_FIRST: '先息后本', BALLOON: '气球贷',
}

// ---- 提前还贷：还款方式 ----
const prepayModeLabelMap: Record<string, string> = {
  EQUAL_PI: '等额本息', EQUAL_P: '等额本金',
}

// ---- 提前还贷：类型 ----
const prepayTypeLabelMap: Record<string, string> = {
  FULL: '全部偿还', PARTIAL: '部分偿还',
}

// ==================== 组件 ====================
export default function HistoryPage() {
  // ---- 公共状态 ----
  const [activeTab, setActiveTab] = useState<TabType>('irr')
  const [loading, setLoading] = useState(false)

  // ---- 网贷 ----
  const [irrList, setIrrList] = useState<HistoryItem[]>([])

  // ---- 房贷 ----
  const [mortgageList, setMortgageList] = useState<MortgageHistoryItem[]>([])

  // ---- 车贷 ----
  const [autoList, setAutoList] = useState<AutoLoanHistoryItem[]>([])

  // ---- 提前还贷 ----
  const [prepayList, setPrepayList] = useState<PrepayHistoryItem[]>([])

  // ---- 加载全部 ----
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const fetchers = [
        { fn: fetchHistory, setter: setIrrList },
        { fn: fetchMortgageHistory, setter: setMortgageList },
        { fn: fetchAutoLoanHistory, setter: setAutoList },
        { fn: fetchPrepayHistory, setter: setPrepayList },
      ]
      await Promise.all(
        fetchers.map(async ({ fn, setter }) => {
          try {
            const res = await fn(100, 0)
            if (res.data) setter(res.data)
          } catch (err) {
            console.error('加载历史记录失败:', err)
          }
        })
      )
    } finally { setLoading(false) }
  }, [])

  useDidShow(() => { loadAll() })

  // ---- 当前列表 ----
  const currentList = activeTab === 'irr' ? irrList : activeTab === 'mortgage' ? mortgageList : activeTab === 'auto' ? autoList : prepayList

  // ---- 删除 ----
  const doDelete = async (id: number) => {
    if (!checkLogin()) return
    Taro.showModal({
      title: '确认删除', content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          if (activeTab === 'irr') {
            await deleteHistoryRecord(id)
          } else if (activeTab === 'mortgage') {
            await deleteMortgageRecord(id)
          } else if (activeTab === 'auto') {
            await deleteAutoLoanRecord(id)
          } else {
            await deletePrepayRecord(id)
          }
          loadAll()
          showToast('记录已删除')
        } catch { /* api.ts 已 toast */ }
      }
    })
  }

  // ---- 清空当前标签 ----
  const handleClearAll = async () => {
    if (!checkLogin()) return
    const label = TABS.find(t => t.key === activeTab)!.label
    const ids =
      activeTab === 'irr' ? irrList.map(item => item.id) :
      activeTab === 'mortgage' ? mortgageList.map(item => item.id) :
      activeTab === 'auto' ? autoList.map(item => item.id) :
      prepayList.map(item => item.id)

    if (ids.length === 0) {
      showToast('当前没有可清空的记录')
      return
    }

    Taro.showModal({
      title: '确认清空',
      content: `确定要清空所有${label}吗？共 ${ids.length} 条，清空后不可恢复。`,
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({ title: '清空中...' })
        try {
          if (activeTab === 'irr') {
            await deleteHistoryRecordsBatch(ids)
          } else if (activeTab === 'mortgage') {
            await deleteMortgageRecordsBatch(ids)
          } else if (activeTab === 'auto') {
            await deleteAutoLoanRecordsBatch(ids)
          } else {
            await deletePrepayRecordsBatch(ids)
          }
          Taro.hideLoading()
          loadAll()
          showToast('已清空所有记录')
        } catch {
          Taro.hideLoading()
        }
      }
    })
  }

  // ---- 房贷：查看完整详情 ----
  const handleViewMortgageDetail = (r: MortgageHistoryItem) => {
    if (!r.inputSnapshot) return
    try {
      const d = r.inputSnapshot
      const input: MortgageInput = {
        repayMethod: d.repayMethod || 'equalPrincipalInterest',
        loanType: d.loanType || 'commercial',
        calcMode: d.calcMode || 'byTotal',
        housePrice: d.housePrice || 200,
        loanTotal: d.loanTotal || 140,
        ratio: d.ratio != null ? d.ratio : 70,
        years: d.years || 20,
        firstPayDate: d.firstPayDate || '2026-07',
        commercialRate: d.commercialRate ?? 3.1,
        fundRate: d.fundRate ?? 3.25,
        fundAmount: d.fundAmount ?? 50,
      }
      const result = calculateMortgage(input)
      if (!result) {
        showToast('数据不完整，无法查看详情')
        return
      }
      Taro.setStorageSync('MORTGAGE_RESULT_DATA', { input, result })
      Taro.navigateTo({ url: '/pages/mortgage-result' })
    } catch (e) {
      console.error('parse mortgage snapshot error:', e)
      showToast('数据解析失败')
    }
  }

  // ---- 车贷：查看完整详情 ----
  const handleViewAutoDetail = (r: AutoLoanHistoryItem) => {
    if (!r.inputSnapshot) return
    try {
      const d = r.inputSnapshot
      const input: CarLoanInput = {
        loanAmount: d.loanAmount ?? r.principal ?? 0,
        loanTerm: d.term ?? d.loanTerm ?? r.periods ?? 36,
        repaymentType: d.method ?? d.repaymentType ?? 'EQUAL_PI',
        annualRate: d.rate ?? d.annualRate ?? r.rate ?? 6,
        downPayment: d.downPayment ?? r.downPayment ?? 0,
        fees: d.fees ?? r.fees ?? [],
        prepaymentPeriod: d.prepaymentPeriod,
      }
      const result = calculateCarLoan(input)
      if (!result) {
        showToast('数据不完整，无法查看详情')
        return
      }
      Taro.setStorageSync('AUTO_RESULT_INPUT', input)
      Taro.navigateTo({ url: '/pages/auto-result' })
    } catch (e) {
      console.error('parse auto snapshot error:', e)
      showToast('数据解析失败')
    }
  }

  // ============== 渲染 ==============
  const getTabCount = (tab: TabType) => {
    if (tab === 'irr') return irrList.length
    if (tab === 'mortgage') return mortgageList.length
    if (tab === 'auto') return autoList.length
    return prepayList.length
  }

  return (
    <View className="history-page">
      {/* Header */}
      <View className="history-header">
        <Text className="back-btn" onClick={handleBack}>‹</Text>
        <Text className="history-title">计算历史</Text>
        <View className="history-clear-placeholder" />
      </View>

      {/* Tabs */}
      <View className="history-tabs">
        {TABS.map(tab => (
          <View
            key={tab.key}
            className={`history-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text className="tab-label">{tab.label}</Text>
            {getTabCount(tab.key) > 0 && <Text className="tab-badge">{getTabCount(tab.key)}</Text>}
          </View>
        ))}
      </View>

      {/* Sub Header */}
      <View className="history-sub-header">
        <Text className="history-total">共 {currentList.length} 条</Text>
        {currentList.length > 0 && (
          <Text className="history-clear" onClick={handleClearAll}>清空</Text>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View className="empty-state">
          <Text className="empty-text">加载中...</Text>
        </View>
      ) : currentList.length === 0 ? (
        <View className="empty-state">
          <Text className="empty-icon">📋</Text>
          <Text className="empty-text">暂无记录</Text>
          <Button className="empty-btn" onClick={() => {
            const urlMap: Record<TabType, string> = { irr: '/pages/index', mortgage: '/pages/mortgage', auto: '/pages/auto', prepay: '/pages/prepay' }
            Taro.navigateTo({ url: urlMap[activeTab] })
          }}>去计算</Button>
        </View>
      ) : (
        <ScrollView scrollY className="history-content">
          <View className="history-list">
            {activeTab === 'irr' && irrList.map(r => (
              <View key={r.id} className="history-card" onClick={() => openHistoryDetail('irr', r)}>
                <View className="history-card-header">
                  <View className="history-card-left">
                    <Text className="history-card-date">{formatDate(r.createdAt)}</Text>
                    <Text className="history-card-meta">{irrModeLabelMap[r.mode] || '简易模式'} · {r.periods}期</Text>
                  </View>
                  <Text className="history-card-status" style={{ color: statusMap[r.complianceStatus]?.color, background: statusMap[r.complianceStatus]?.bg }}>
                    {statusMap[r.complianceStatus]?.label || '合规'}
                  </Text>
                </View>
                <View className="history-card-body">
                  <View className="history-card-irr">
                    <Text className="irr-value">{r.irr.toFixed(2)}%</Text>
                    <Text className="irr-label">IRR</Text>
                  </View>
                  <View className="history-card-right">
                    <Text className="history-card-principal">本金 ¥{Math.round(r.principal).toLocaleString('zh-CN')}</Text>
                    {r.excessInterest != null && r.excessInterest > 0 && (
                      <Text className="history-card-excess">超额利息 ¥{Math.round(r.excessInterest).toLocaleString('zh-CN')}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}

            {activeTab === 'mortgage' && mortgageList.map(r => (
              <View key={r.id} className="history-card" onClick={() => handleViewMortgageDetail(r)}>
                <View className="history-card-header">
                  <View className="history-card-left">
                    <Text className="history-card-date">{formatDate(r.createdAt)}</Text>
                    <Text className="history-card-meta">
                      {mortgageModeLabelMap[r.mode] || r.mode} · {r.years}年({r.periods}期)
                    </Text>
                  </View>
                  <Text className="history-card-rate">{r.rate}%</Text>
                </View>
                <View className="history-card-body">
                  <View className="history-card-irr">
                    <Text className="irr-value">{Math.round(r.totalInterest).toLocaleString('zh-CN')}</Text>
                    <Text className="irr-label">总利息</Text>
                  </View>
                  <View className="history-card-right">
                    <Text className="history-card-principal">本金 ¥{Math.round(r.principal).toLocaleString('zh-CN')}</Text>
                    {r.monthlyPayment && (
                      <Text className="history-card-meta">月供 ¥{Math.round(r.monthlyPayment).toLocaleString('zh-CN')}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}

            {activeTab === 'auto' && autoList.map(r => (
              <View key={r.id} className="history-card" onClick={() => handleViewAutoDetail(r)}>
                <View className="history-card-header">
                  <View className="history-card-left">
                    <Text className="history-card-date">{formatDate(r.createdAt)}</Text>
                    <Text className="history-card-meta">
                      {autoModeLabelMap[r.mode] || r.mode} · {r.periods}期
                    </Text>
                  </View>
                  {r.irr != null && (
                    <Text className="history-card-rate">{r.irr.toFixed(2)}%</Text>
                  )}
                </View>
                <View className="history-card-body">
                  <View className="history-card-irr">
                    <Text className="irr-value">{Math.round(r.totalPayment).toLocaleString('zh-CN')}</Text>
                    <Text className="irr-label">总支出</Text>
                  </View>
                  <View className="history-card-right">
                    <Text className="history-card-principal">本金 ¥{Math.round(r.principal).toLocaleString('zh-CN')}</Text>
                    {r.monthlyPayment && (
                      <Text className="history-card-meta">月供 ¥{Math.round(r.monthlyPayment).toLocaleString('zh-CN')}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}

            {activeTab === 'prepay' && prepayList.map(r => (
              <View key={r.id} className="history-card prepay-card" onClick={() => openHistoryDetail('prepay', r)}>
                <View className="history-card-header">
                  <View className="history-card-left">
                    <Text className="history-card-date">{formatDate(r.createdAt)}</Text>
                    <Text className="history-card-meta">
                      {prepayModeLabelMap[r.mode] || r.mode} · {prepayTypeLabelMap[r.prepayType] || r.prepayType} · 第{r.paidMonths}期
                    </Text>
                  </View>
                  <Text className="history-card-rate saved">省 ¥{Math.round(r.savedInterest).toLocaleString('zh-CN')}</Text>
                </View>
                <View className="history-card-body">
                  <View className="history-card-irr">
                    <Text className="irr-value saved">{Math.round(r.savedInterest).toLocaleString('zh-CN')}</Text>
                    <Text className="irr-label">节省利息</Text>
                  </View>
                  <View className="history-card-right">
                    <Text className="history-card-principal">本次需还 ¥{Math.round(r.totalPrepay).toLocaleString('zh-CN')}</Text>
                    <Text className="history-card-meta">剩余本金 ¥{Math.round(r.remainingPrincipal).toLocaleString('zh-CN')}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  )
}
