import { useState, useCallback } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import { Popup } from '@nutui/nutui-react-taro'
import './index.less'
import {
  fetchHistory, deleteHistoryRecord, HistoryItem,
  fetchMortgageHistory, deleteMortgageRecord, MortgageHistoryItem,
  fetchAutoLoanHistory, deleteAutoLoanRecord, AutoLoanHistoryItem,
} from '../../services/api'
import { getToken } from '../../utils/storage'

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

const showToast = (msg: string) => {
  Taro.showToast({ title: msg, icon: 'none', duration: 2000 })
}

// ---- 标签 ----
type TabType = 'irr' | 'mortgage' | 'auto'
const TABS: { key: TabType; label: string }[] = [
  { key: 'irr', label: '网贷记录' },
  { key: 'mortgage', label: '房贷记录' },
  { key: 'auto', label: '车贷记录' },
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

// ==================== 组件 ====================
export default function HistoryPage() {
  // ---- 公共状态 ----
  const [activeTab, setActiveTab] = useState<TabType>('irr')
  const [loading, setLoading] = useState(false)

  // ---- 网贷 ----
  const [irrList, setIrrList] = useState<HistoryItem[]>([])
  const [irrDetail, setIrrDetail] = useState<HistoryItem | null>(null)

  // ---- 房贷 ----
  const [mortgageList, setMortgageList] = useState<MortgageHistoryItem[]>([])
  const [mortgageDetail, setMortgageDetail] = useState<MortgageHistoryItem | null>(null)

  // ---- 车贷 ----
  const [autoList, setAutoList] = useState<AutoLoanHistoryItem[]>([])
  const [autoDetail, setAutoDetail] = useState<AutoLoanHistoryItem | null>(null)

  // ---- 加载全部 ----
  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [irrRes, mortRes, autoRes] = await Promise.all([
        fetchHistory(100, 0),
        fetchMortgageHistory(100, 0),
        fetchAutoLoanHistory(100, 0),
      ])
      if (irrRes.data) setIrrList(irrRes.data)
      if (mortRes.data) setMortgageList(mortRes.data)
      if (autoRes.data) setAutoList(autoRes.data)
    } catch { /* api.ts 已 toast */ }
    finally { setLoading(false) }
  }, [])

  useDidShow(() => { loadAll() })

  // ---- 当前列表 ----
  const currentList = activeTab === 'irr' ? irrList : activeTab === 'mortgage' ? mortgageList : autoList

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
            setIrrDetail(null)
          } else if (activeTab === 'mortgage') {
            await deleteMortgageRecord(id)
            setMortgageDetail(null)
          } else {
            await deleteAutoLoanRecord(id)
            setAutoDetail(null)
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
    Taro.showModal({
      title: '确认清空', content: `确定要清空所有${label}吗？`,
      success: async (res) => {
        if (!res.confirm) return
        Taro.showLoading({ title: '清空中...' })
        try {
          if (activeTab === 'irr') {
            for (const item of irrList) await deleteHistoryRecord(item.id)
            setIrrDetail(null)
          } else if (activeTab === 'mortgage') {
            for (const item of mortgageList) await deleteMortgageRecord(item.id)
            setMortgageDetail(null)
          } else {
            for (const item of autoList) await deleteAutoLoanRecord(item.id)
            setAutoDetail(null)
          }
          Taro.hideLoading()
          loadAll()
          showToast('已清空所有记录')
        } catch { Taro.hideLoading() }
      }
    })
  }

  // ---- 网贷：恢复 / 加入对比 ----
  const handleRestoreIrr = (r: HistoryItem) => {
    if (!checkLogin()) return
    Taro.setStorageSync('appliedTemplate', {
      type: r.mode === 'fixed' ? 'simple' : r.mode === 'custom' ? 'periodic' : 'fee',
      data: {
        principal: r.principal,
        monthlyPayment: r.fixedPayment,  // 首页 simple 模式读取 monthlyPayment
        months: r.periods,               // 首页 simple 模式读取 months
        payments: r.customPayments,      // 首页 periodic 模式读取 payments
        periods: r.periods,
        fees: r.fees || [],
        loanDate: r.loanDate,
        paidPeriods: r.paidPeriods,
      }
    })
    setIrrDetail(null)
    Taro.switchTab({ url: '/pages/index' })
    showToast('记录已恢复')
  }

  const handleCompareIrr = (r: HistoryItem) => {
    if (!checkLogin()) return
    const { saveCompareList, addToCompare } = require('../../utils/storage')
    saveCompareList([])
    const item: any = {
      id: String(r.id) + '_c',
      timestamp: new Date(r.createdAt).getTime(),
      params: { mode: r.mode, principal: r.principal, fixedPayment: r.fixedPayment, customPayments: r.customPayments, periods: r.periods },
      result: { irr: r.irr, complianceStatus: r.complianceStatus, complianceLimit: r.complianceLimit, totalPayment: r.totalPayment, totalInterest: r.totalInterest, excessInterest: r.excessInterest, nominalAPR: r.nominalAPR, periods: r.periods },
      platformName: '贷款1',
    }
    addToCompare(item)
    setIrrDetail(null)
    Taro.navigateTo({ url: '/pages/compare' })
    showToast('已添加至对比')
  }

  // ---- 房贷：查看详情 ----
  const handleViewMortgageDetail = (r: MortgageHistoryItem) => {
    if (r.inputSnapshot) {
      Taro.setStorageSync('MORTGAGE_HISTORY_RESTORE', JSON.stringify(r.inputSnapshot))
    }
    setMortgageDetail(null)
    Taro.navigateTo({ url: '/pages/mortgage' })
  }

  // ============== 渲染 ==============
  const getTabCount = (tab: TabType) => {
    if (tab === 'irr') return irrList.length
    if (tab === 'mortgage') return mortgageList.length
    return autoList.length
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
            const urlMap: Record<TabType, string> = { irr: '/pages/index', mortgage: '/pages/mortgage', auto: '/pages/auto' }
            Taro.navigateTo({ url: urlMap[activeTab] })
          }}>去计算</Button>
        </View>
      ) : (
        <ScrollView scrollY className="history-content">
          <View className="history-list">
            {activeTab === 'irr' && irrList.map(r => (
              <View key={r.id} className="history-card" onClick={() => setIrrDetail(r)}>
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
                    <Text className="history-card-principal">本金 ¥{r.principal.toLocaleString()}</Text>
                    {r.excessInterest != null && r.excessInterest > 0 && (
                      <Text className="history-card-excess">超额利息 ¥{r.excessInterest.toLocaleString()}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}

            {activeTab === 'mortgage' && mortgageList.map(r => (
              <View key={r.id} className="history-card" onClick={() => setMortgageDetail(r)}>
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
                    <Text className="irr-value">{r.totalInterest.toLocaleString()}</Text>
                    <Text className="irr-label">总利息</Text>
                  </View>
                  <View className="history-card-right">
                    <Text className="history-card-principal">本金 ¥{r.principal.toLocaleString()}</Text>
                    {r.monthlyPayment && (
                      <Text className="history-card-meta">月供 ¥{r.monthlyPayment.toLocaleString()}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}

            {activeTab === 'auto' && autoList.map(r => (
              <View key={r.id} className="history-card" onClick={() => setAutoDetail(r)}>
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
                    <Text className="irr-value">{r.totalPayment.toLocaleString()}</Text>
                    <Text className="irr-label">总支出</Text>
                  </View>
                  <View className="history-card-right">
                    <Text className="history-card-principal">本金 ¥{r.principal.toLocaleString()}</Text>
                    {r.monthlyPayment && (
                      <Text className="history-card-meta">月供 ¥{r.monthlyPayment.toLocaleString()}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ====== 网贷详情弹窗 ====== */}
      <Popup visible={!!irrDetail} onClose={() => setIrrDetail(null)} position="bottom" className="history-detail-popup">
        {irrDetail && (
          <View className="detail-content">
            <View className="detail-header-bar">
              <Text className="detail-back-btn" onClick={() => setIrrDetail(null)}>‹</Text>
              <Text className="detail-header-title">记录详情</Text>
              <View className="detail-header-placeholder" />
            </View>
            <View className="detail-section">
              <View className="detail-header">
                <Text className="detail-date">{formatDate(irrDetail.createdAt)}</Text>
                <Text className="detail-status" style={{
                  color: (statusMap[irrDetail.complianceStatus] || statusMap.compliant).color,
                  background: (statusMap[irrDetail.complianceStatus] || statusMap.compliant).bg,
                }}>
                  {(statusMap[irrDetail.complianceStatus] || statusMap.compliant).label}
                </Text>
              </View>
              <View className="detail-irr">
                <Text className="detail-irr-value">{irrDetail.irr.toFixed(2)}%</Text>
                <Text className="detail-irr-label">IRR</Text>
              </View>
              <View className="detail-info">
                <View className="detail-row"><Text className="detail-label">借款本金</Text><Text className="detail-value">¥{irrDetail.principal.toLocaleString()}</Text></View>
                <View className="detail-row"><Text className="detail-label">总还款额</Text><Text className="detail-value">¥{irrDetail.totalPayment.toLocaleString()}</Text></View>
                <View className="detail-row"><Text className="detail-label">总利息</Text><Text className="detail-value">¥{irrDetail.totalInterest.toLocaleString()}</Text></View>
                <View className="detail-row"><Text className="detail-label">总期数</Text><Text className="detail-value">{irrDetail.periods} 期</Text></View>
                <View className="detail-row"><Text className="detail-label">名义APR</Text><Text className="detail-value">{(irrDetail.nominalAPR ?? 0).toFixed(2)}%</Text></View>
                <View className="detail-row"><Text className="detail-label">法定上限</Text><Text className="detail-value">{irrDetail.complianceLimit}%</Text></View>
                {irrDetail.excessInterest != null && irrDetail.excessInterest > 0 && (
                  <View className="detail-row excess">
                    <Text className="detail-label">超额利息</Text>
                    <Text className="detail-value" style={{ color: 'var(--color-excessive)' }}>¥{irrDetail.excessInterest.toLocaleString()}</Text>
                  </View>
                )}
              </View>
            </View>
            <View className="detail-actions">
              <View className="detail-btn" onClick={() => handleRestoreIrr(irrDetail)}>📋 重新载入</View>
              <View className="detail-btn detail-btn-delete" onClick={() => doDelete(irrDetail.id)}>🗑 删除</View>
            </View>
            <View className="detail-btn detail-btn-compare" onClick={() => handleCompareIrr(irrDetail)}>📊 加入对比</View>
          </View>
        )}
      </Popup>

      {/* ====== 房贷详情弹窗 ====== */}
      <Popup visible={!!mortgageDetail} onClose={() => setMortgageDetail(null)} position="bottom" className="history-detail-popup">
        {mortgageDetail && (
          <View className="detail-content">
            <View className="detail-header-bar">
              <Text className="detail-back-btn" onClick={() => setMortgageDetail(null)}>‹</Text>
              <Text className="detail-header-title">房贷记录详情</Text>
              <View className="detail-header-placeholder" />
            </View>
            <View className="detail-section">
              <View className="detail-header">
                <Text className="detail-date">{formatDate(mortgageDetail.createdAt)}</Text>
              </View>
              <View className="detail-info">
                <View className="detail-row"><Text className="detail-label">还款方式</Text><Text className="detail-value">{mortgageModeLabelMap[mortgageDetail.mode] || mortgageDetail.mode}</Text></View>
                <View className="detail-row"><Text className="detail-label">贷款本金</Text><Text className="detail-value">¥{mortgageDetail.principal.toLocaleString()}</Text></View>
                <View className="detail-row"><Text className="detail-label">商贷利率</Text><Text className="detail-value">{mortgageDetail.rate}%</Text></View>
                <View className="detail-row"><Text className="detail-label">贷款年限</Text><Text className="detail-value">{mortgageDetail.years} 年（{mortgageDetail.periods}期）</Text></View>
                {mortgageDetail.monthlyPayment && (
                  <View className="detail-row"><Text className="detail-label">月供</Text><Text className="detail-value">¥{mortgageDetail.monthlyPayment.toLocaleString()}</Text></View>
                )}
                {mortgageDetail.firstMonthPayment && (
                  <View className="detail-row"><Text className="detail-label">首月月供</Text><Text className="detail-value">¥{mortgageDetail.firstMonthPayment.toLocaleString()}</Text></View>
                )}
                {mortgageDetail.lastMonthPayment && (
                  <View className="detail-row"><Text className="detail-label">末月月供</Text><Text className="detail-value">¥{mortgageDetail.lastMonthPayment.toLocaleString()}</Text></View>
                )}
                <View className="detail-row"><Text className="detail-label">总还款额</Text><Text className="detail-value">¥{mortgageDetail.totalPayment.toLocaleString()}</Text></View>
                <View className="detail-row"><Text className="detail-label">总利息</Text><Text className="detail-value">¥{mortgageDetail.totalInterest.toLocaleString()}</Text></View>
                {mortgageDetail.downPaymentRatio && (
                  <View className="detail-row"><Text className="detail-label">首付比例</Text><Text className="detail-value">{mortgageDetail.downPaymentRatio}%</Text></View>
                )}
              </View>
            </View>
            <View className="detail-actions">
              <View className="detail-btn" onClick={() => handleViewMortgageDetail(mortgageDetail)}>🏠 查看详情</View>
              <View className="detail-btn detail-btn-delete" onClick={() => doDelete(mortgageDetail.id)}>🗑 删除</View>
            </View>
          </View>
        )}
      </Popup>

      {/* ====== 车贷详情弹窗 ====== */}
      <Popup visible={!!autoDetail} onClose={() => setAutoDetail(null)} position="bottom" className="history-detail-popup">
        {autoDetail && (
          <View className="detail-content">
            <View className="detail-header-bar">
              <Text className="detail-back-btn" onClick={() => setAutoDetail(null)}>‹</Text>
              <Text className="detail-header-title">车贷记录详情</Text>
              <View className="detail-header-placeholder" />
            </View>
            <View className="detail-section">
              <View className="detail-header">
                <Text className="detail-date">{formatDate(autoDetail.createdAt)}</Text>
              </View>
              <View className="detail-info">
                <View className="detail-row"><Text className="detail-label">还款方式</Text><Text className="detail-value">{autoModeLabelMap[autoDetail.mode] || autoDetail.mode}</Text></View>
                <View className="detail-row"><Text className="detail-label">贷款本金</Text><Text className="detail-value">¥{autoDetail.principal.toLocaleString()}</Text></View>
                {autoDetail.rate != null && (
                  <View className="detail-row"><Text className="detail-label">年化利率</Text><Text className="detail-value">{autoDetail.rate}%</Text></View>
                )}
                <View className="detail-row"><Text className="detail-label">贷款期限</Text><Text className="detail-value">{autoDetail.periods} 期</Text></View>
                {autoDetail.monthlyPayment && (
                  <View className="detail-row"><Text className="detail-label">常规月供</Text><Text className="detail-value">¥{autoDetail.monthlyPayment.toLocaleString()}</Text></View>
                )}
                {autoDetail.irr != null && (
                  <View className="detail-row"><Text className="detail-label">真实年化IRR</Text><Text className="detail-value" style={{ color: 'var(--brand-primary)' }}>{autoDetail.irr.toFixed(2)}%</Text></View>
                )}
                <View className="detail-row"><Text className="detail-label">总支出</Text><Text className="detail-value">¥{autoDetail.totalPayment.toLocaleString()}</Text></View>
                <View className="detail-row"><Text className="detail-label">总利息</Text><Text className="detail-value">¥{autoDetail.totalInterest.toLocaleString()}</Text></View>
                <View className="detail-row"><Text className="detail-label">总费用</Text><Text className="detail-value">¥{autoDetail.totalFee.toLocaleString()}</Text></View>
                {autoDetail.downPayment && (
                  <View className="detail-row"><Text className="detail-label">首付金额</Text><Text className="detail-value">¥{autoDetail.downPayment.toLocaleString()}</Text></View>
                )}
              </View>
            </View>
            <View className="detail-actions">
              <View className="detail-btn" onClick={() => { setAutoDetail(null); Taro.navigateTo({ url: '/pages/auto' }) }}>🚗 去计算</View>
              <View className="detail-btn detail-btn-delete" onClick={() => doDelete(autoDetail.id)}>🗑 删除</View>
            </View>
          </View>
        )}
      </Popup>
    </View>
  )
}
