import { useState, useEffect, useCallback, useMemo } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import { Popup, Cell, CellGroup, Tag, Empty, Toast } from '@nutui/nutui-react-taro'
import './index.less'
import { CalculationParams, CalculationResult, formatCurrency, formatRate } from '../../utils/finance'
import { getHistory, CalcHistoryItem, CompareItem, getCompareList, saveCompareList, addToCompare, removeFromCompare, updateComparePlatformName, getToken } from '../../utils/storage'
import CarChart from '../../components/CarChart'
import { REPAYMENT_LABELS, calculateCarLoan, CarLoanInput } from '../../utils/carFinance'
import { getCarSchemes, removeCarScheme, CarScheme, addCarScheme, clearCarSchemes } from '../../utils/carCompare'
import { getMortgageSchemes, removeMortgageScheme, MortgageScheme, addMortgageScheme, clearMortgageSchemes } from '../../utils/mortgageCompare'
import { getPrepaySchemes, removePrepayScheme, PrepayScheme, clearPrepaySchemes, addPrepayScheme } from '../../utils/prepayCompare'
import { calculateMortgage, MortgageInput } from '../../utils/mortgage'
import { fetchMortgageHistory, MortgageHistoryItem, fetchAutoLoanHistory, AutoLoanHistoryItem, fetchPrepayHistory, PrepayHistoryItem } from '../../services/api'

// ---- 标签 ----
type TabType = 'irr' | 'mortgage' | 'auto' | 'prepay'
const TABS: { key: TabType; label: string }[] = [
  { key: 'irr', label: '网贷' },
  { key: 'mortgage', label: '房贷' },
  { key: 'auto', label: '车贷' },
  { key: 'prepay', label: '提前还贷' },
]

const checkLogin = (): boolean => {
  const token = getToken();
  if (!token) {
    Taro.showToast({ title: '请先登录', icon: 'none' });
    Taro.navigateTo({ url: '/pages/login' });
    return false;
  }
  return true;
};

const handleBack = () => {
  const pages = Taro.getCurrentPages();
  if (pages.length > 1) {
    Taro.navigateBack();
  } else {
    Taro.switchTab({ url: '/pages/index' });
  }
};

function formatDate(ts: number | string) {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const showToast = (msg: string) => {
  Taro.showToast({ title: msg, icon: 'none', duration: 2000 })
}

// ============================================================
// 网贷对比（原 compare 页面逻辑）
// ============================================================
const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  compliant: { label: '合规', color: 'var(--color-compliant)', bg: '#ECFDF5' },
  warning: { label: '偏高', color: 'var(--color-warning)', bg: '#FFFBEB' },
  excessive: { label: '超额', color: 'var(--color-excessive)', bg: '#FEF2F2' },
}

function IrrCompare() {
  const [compareList, setCompareList] = useState<CompareItem[]>([])
  const [history, setHistory] = useState<CalcHistoryItem[]>([])
  const [currentResult, setCurrentResult] = useState<CalculationResult | null>(null)
  const [currentParams, setCurrentParams] = useState<CalculationParams | null>(null)
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [includeCurrent, setIncludeCurrent] = useState(false)

  const loadData = () => {
    setCompareList(getCompareList())
    setHistory(getHistory())
    const appliedTemplate = Taro.getStorageSync('appliedTemplate')
    if (appliedTemplate) {
      Taro.removeStorageSync('appliedTemplate')
    }
    try {
      const result = Taro.getStorageSync('compareCurrentResult')
      const params = Taro.getStorageSync('compareCurrentParams')
      if (result) {
        setCurrentResult(result)
        setCurrentParams(params)
        setIncludeCurrent(true)
      }
    } catch (e) { /* ignore */ }
  }

  useEffect(() => { loadData() }, [])

  const openSelectModal = (fromHistoryOnly = false) => {
    if (!checkLogin()) return;
    setSelectedIds([])
    setIncludeCurrent(!fromHistoryOnly && !!currentResult)
    setShowSelectModal(true)
  }

  const toggleCurrent = () => {
    if (!currentResult) return
    setIncludeCurrent(!includeCurrent)
  }

  const toggleHistorySelect = (id: string) => {
    const idx = selectedIds.indexOf(id)
    if (idx >= 0) {
      setSelectedIds(selectedIds.filter(sid => sid !== id))
    } else {
      const maxFromHistory = includeCurrent ? 2 : 3
      if (selectedIds.length >= maxFromHistory) {
        showToast('最多选择 3 笔贷款进行对比')
        return
      }
      setSelectedIds([...selectedIds, id])
    }
  }

  const confirmSelect = () => {
    if (!checkLogin()) return;
    const total = (includeCurrent ? 1 : 0) + selectedIds.length
    if (total < 1) return
    if (total > 3) { showToast('最多选择 3 笔贷款'); return }

    const newItems: CompareItem[] = []
    if (includeCurrent && currentResult && currentParams) {
      newItems.push({
        id: Date.now().toString(),
        timestamp: Date.now(),
        params: { ...currentParams },
        result: { ...currentResult },
        platformName: '当前计算',
      })
    }
    selectedIds.forEach((hid, i) => {
      const hrec = history.find(r => r.id === hid)
      if (hrec) {
        newItems.push({
          id: hid + '_c',
          timestamp: hrec.timestamp,
          params: { ...hrec.params },
          result: { ...hrec.result },
          platformName: '贷款' + (i + 1),
        })
      }
    })

    saveCompareList([])
    newItems.forEach(item => addToCompare(item))
    setCompareList(newItems)
    setShowSelectModal(false)
    showToast('已添加 ' + newItems.length + ' 笔贷款')
  }

  const handleRemove = (id: string) => {
    if (!checkLogin()) return;
    const newList = removeFromCompare(id)
    setCompareList(newList)
    showToast('已移除')
  }

  const handleClear = () => {
    if (!checkLogin()) return;
    saveCompareList([])
    setCompareList([])
    showToast('已清空所有对比')
  }

  const handleEditName = (id: string) => {
    if (!checkLogin()) return;
    const item = compareList.find(l => l.id === id)
    if (!item) return
    Taro.showModal({
      title: '修改名称',
      editable: true,
      placeholderText: '请输入新名称',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const newName = res.content.trim()
          updateComparePlatformName(id, newName)
          setCompareList(getCompareList())
        }
      }
    })
  }

  const tableRows = [
    { label: 'IRR', get: (v: CompareItem) => v.result.irr.toFixed(2) + '%', highlight: true },
    { label: '名义APR', get: (v: CompareItem) => v.result.nominalAPR.toFixed(2) + '%' },
    { label: '合规状态', get: (v: CompareItem) => statusMap[v.result.complianceStatus]?.label || '' },
    { label: '法定上限', get: (v: CompareItem) => v.result.complianceLimit + '%' },
    { label: '本金', get: (v: CompareItem) => '¥' + Math.round(v.params.principal).toLocaleString('zh-CN') },
    { label: '总还款', get: (v: CompareItem) => '¥' + Math.round(v.result.totalPayment).toLocaleString('zh-CN') },
    { label: '总利息', get: (v: CompareItem) => '¥' + Math.round(v.result.totalInterest).toLocaleString('zh-CN') },
    { label: '期数', get: (v: CompareItem) => v.result.periods + '期' },
    { label: '超额利息', get: (v: CompareItem) => v.result.excessInterest > 0 ? '¥' + Math.round(v.result.excessInterest).toLocaleString('zh-CN') : '-', warn: true },
  ]

  const renderCompareAnalysis = () => {
    if (compareList.length < 2) return null

    const sorted = [...compareList].sort((a, b) => a.result.irr - b.result.irr)
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]

    const riskCards = sorted.map((r) => {
      const name = r.platformName || '贷款'
      const irr = r.result.irr
      const cs = r.result.complianceStatus
      const excess = r.result.excessInterest
      const interest = r.result.totalInterest
      const principal = r.params.principal
      const rate = (interest / principal) * 100

      let riskLevel: string, riskColor: string, riskBg: string
      if (cs === 'excessive') { riskLevel = '高风险'; riskColor = 'var(--color-excessive)'; riskBg = '#FEF2F2' }
      else if (cs === 'warning') { riskLevel = '中风险'; riskColor = 'var(--color-warning)'; riskBg = '#FFFBEB' }
      else { riskLevel = '低风险'; riskColor = 'var(--color-compliant)'; riskBg = '#ECFDF5' }

      const risks: { icon: string; text: string; severe: boolean }[] = []
      if (cs === 'excessive') {
        risks.push({ icon: '🚫', text: `超额利息 ¥${Math.round(excess).toLocaleString('zh-CN')}，已超过法定上限 4 倍 LPR`, severe: true })
        risks.push({ icon: '⚖️', text: `年化 IRR ${irr.toFixed(2)}% 远超法定上限 ${r.result.complianceLimit}%，法律风险极高`, severe: true })
      }
      if (cs === 'warning') {
        risks.push({ icon: '⚠️', text: `年化 IRR ${irr.toFixed(2)}% 接近法定上限 ${r.result.complianceLimit}%，需关注`, severe: false })
        risks.push({ icon: '💡', text: '建议优先选择更低利率的产品替代，或尝试与平台协商降息', severe: false })
      }
      if (cs === 'compliant') {
        risks.push({ icon: '✅', text: `年化 IRR ${irr.toFixed(2)}% 在法定上限内，利率合规`, severe: false })
      }
      if (rate > 20) risks.push({ icon: '📈', text: `利息占本金 ${rate.toFixed(1)}%，借款成本偏高`, severe: true })
      else if (rate > 10) risks.push({ icon: '📊', text: `利息占本金 ${rate.toFixed(1)}%，借款成本中等`, severe: false })
      else risks.push({ icon: '💰', text: `利息占本金 ${rate.toFixed(1)}%，借款成本可控`, severe: false })

      return { name, riskLevel, riskColor, riskBg, risks, irr }
    })

    const comparisons = []
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1], b = sorted[i]
      const aName = a.platformName || '贷款', bName = b.platformName || '贷款'
      const irrDiff = b.result.irr - a.result.irr
      const interestDiff = b.result.totalInterest - a.result.totalInterest
      const principalSame = Math.abs(a.params.principal - b.params.principal) < 0.01
      const aRate = (a.result.totalInterest / a.params.principal) * 100
      const bRate = (b.result.totalInterest / b.params.principal) * 100
      comparisons.push({ a, b, aName, bName, irrDiff, interestDiff, principalSame, aRate, bRate })
    }

    const reasons: string[] = []
    if (best.result.irr === sorted[0].result.irr) reasons.push(`利率最低，年化 IRR 仅 ${best.result.irr.toFixed(2)}%`)
    if (best.result.complianceStatus === 'compliant') reasons.push('合规状态最佳，无法律风险')
    if (best.result.excessInterest === 0) reasons.push('无超额利息')
    if (worst.result.irr - best.result.irr > 5) reasons.push(`比最高利率方案低 ${(worst.result.irr - best.result.irr).toFixed(2)}%`)
    const worstName = worst.platformName || '贷款'
    if (worst.result.complianceStatus === 'excessive') {
      reasons.push(`⚠️ 应避免选择 ${worstName}（超额利息 ¥${Math.round(worst.result.excessInterest).toLocaleString('zh-CN')}）`)
    }

    const excessiveCount = compareList.filter(r => r.result.complianceStatus === 'excessive').length
    const warningCount = compareList.filter(r => r.result.complianceStatus === 'warning').length

    return (
      <View className="analysis-card">
        <Text className="card-title">📊 智能分析结论</Text>

        <View className="analysis-section">
          <Text className="analysis-section-title">🔍 逐笔风险诊断</Text>
          {riskCards.map((rc, idx) => (
            <View key={idx} className="risk-card" style={{ borderLeftColor: rc.riskColor }}>
              <View className="risk-card-header">
                <Text className="risk-card-name">{rc.name}</Text>
                <Text className="risk-badge" style={{ color: rc.riskColor, background: rc.riskBg }}>{rc.riskLevel}</Text>
              </View>
              {rc.risks.map((rk, ri) => (
                <View key={ri} className={`risk-item ${rk.severe ? 'severe' : ''}`}>
                  <Text className="risk-icon">{rk.icon}</Text>
                  <Text className="risk-text">{rk.text}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View className="analysis-section">
          <Text className="analysis-section-title">📋 对比分析</Text>
          {comparisons.map((c, idx) => (
            <View key={idx} className="compare-analysis-card">
              {c.principalSame ? (
                <>
                  <View className="compare-analysis-header">
                    <Text className="compare-icon">✅</Text>
                    <Text className="compare-analysis-title">
                      {c.b.result.irr < c.a.result.irr
                        ? `${c.bName} 比 ${c.aName} 更合适`
                        : `${c.aName} 比 ${c.bName} 更合适`}
                    </Text>
                  </View>
                  <Text className="compare-analysis-desc">
                    利率低 {Math.abs(c.irrDiff).toFixed(2)}%，同等本金下总利息少 ¥{Math.round(Math.abs(c.interestDiff)).toLocaleString('zh-CN')}
                  </Text>
                </>
              ) : (
                <>
                  <View className="compare-analysis-header">
                    <Text className="compare-icon">{c.b.result.irr < c.a.result.irr ? '✅' : '⚠️'}</Text>
                    <Text className="compare-analysis-title">
                      {c.b.result.irr < c.a.result.irr ? c.bName : c.aName} (IRR {(c.b.result.irr < c.a.result.irr ? c.b.result.irr : c.a.result.irr).toFixed(2)}%)
                      {' 比 '}
                      {c.b.result.irr < c.a.result.irr ? c.aName : c.bName} (IRR {(c.b.result.irr < c.a.result.irr ? c.a.result.irr : c.b.result.irr).toFixed(2)}%)
                      {' 利率更低'}
                    </Text>
                  </View>
                  <Text className="compare-analysis-desc">
                    IRR 差距 {Math.abs(c.irrDiff).toFixed(2)}%，利息率差距 {Math.abs(c.aRate - c.bRate).toFixed(2)}%
                  </Text>
                </>
              )}
            </View>
          ))}
        </View>

        <View className="analysis-recommendation">
          <Text className="recommendation-title">🏆 推荐选择</Text>
          <Text className="recommendation-name">{best.platformName || '贷款'} (IRR {best.result.irr.toFixed(2)}%)</Text>
          {reasons.map((r, i) => (
            <Text key={i} className="recommendation-reason">{i + 1}. {r}</Text>
          ))}

          {excessiveCount > 0 && (
            <View className="warning-card excessive">
              <Text className="warning-title">🚫 高风险警告</Text>
              <Text className="warning-text">有 {excessiveCount} 笔贷款存在超额利息，利率超过法定上限。</Text>
              <Text className="warning-item">1. 优先还清或转贷这类高息贷款</Text>
              <Text className="warning-item">2. 保留借款合同与还款记录作为证据</Text>
              <Text className="warning-item">3. 可向金融监管部门投诉或咨询律师</Text>
            </View>
          )}
          {warningCount > 0 && excessiveCount === 0 && (
            <View className="warning-card warning">
              <Text className="warning-title">💡 中等风险提示</Text>
              <Text className="warning-text">有 {warningCount} 笔贷款利率偏高。</Text>
              <Text className="warning-item">1. 对比其他平台的利率，寻找更优惠方案</Text>
              <Text className="warning-item">2. 尝试与平台协商降低利率</Text>
              <Text className="warning-item">3. 避免长期持有高息贷款</Text>
            </View>
          )}
          {excessiveCount === 0 && warningCount === 0 && (
            <View className="success-card">
              ✅ 所有贷款均在合规范围内，利率水平合理
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <View className="irr-compare">
      <ScrollView scrollY className="compare-content">
        {compareList.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-icon">📊</Text>
            <Text className="empty-text">暂无对比记录</Text>
            <Text className="empty-hint">从历史记录中选择网贷方案，或先去计算</Text>
            <View className="empty-actions">
              <Button className="empty-btn primary" onClick={() => openSelectModal(true)}>
                📋 从历史记录添加
              </Button>
              <Button className="empty-btn secondary" onClick={() => Taro.navigateTo({ url: '/pages/index' })}>
                💳 去计算网贷
              </Button>
            </View>
          </View>
        ) : (
          <>
            <View className="card">
              <Text className="card-title">贷款列表</Text>
              {compareList.map((r, i) => {
                const st = statusMap[r.result.complianceStatus]
                return (
                  <View key={r.id} className="compare-item-row">
                    <View className="compare-item-info">
                      <View className="compare-item-header">
                        <Text className="compare-item-name" onClick={() => handleEditName(r.id)}>
                          {r.platformName || '贷款' + (i + 1)}
                        </Text>
                        <Text className="compare-item-status" style={{ color: st.color, background: st.bg }}>
                          {st.label}
                        </Text>
                      </View>
                      <Text className="compare-item-desc">
                        本金 ¥{Math.round(r.params.principal).toLocaleString('zh-CN')} · {r.result.periods}期 · IRR {r.result.irr.toFixed(2)}%
                      </Text>
                    </View>
                    <Button className="compare-item-remove" onClick={() => handleRemove(r.id)}>
                      ×
                    </Button>
                  </View>
                )
              })}
            </View>

            {compareList.length >= 2 && (
              <>
                <View className="card">
                  <Text className="card-title">并排对比</Text>
                  <ScrollView scrollX className="compare-table-scroll">
                    <View className="compare-table">
                      <View className="compare-table-header">
                        <Text className="compare-table-th">指标</Text>
                        {compareList.map(r => (
                          <Text key={r.id} className="compare-table-th">{r.platformName || '贷款'}</Text>
                        ))}
                      </View>
                      {tableRows.map((row, ri) => (
                        <View key={ri} className="compare-table-row">
                          <Text className="compare-table-td label">{row.label}</Text>
                          {compareList.map(r => {
                            const val = row.get(r)
                            let color = '#333'
                            let fontWeight = '400'
                            if (row.highlight) {
                              fontWeight = '700'
                              color = 'var(--brand-primary)'
                            }
                            if (row.warn && r.result.excessInterest > 0) {
                              color = 'var(--color-excessive)'
                              fontWeight = '600'
                            }
                            return <Text key={r.id} className="compare-table-td" style={{ color, fontWeight }}>{val}</Text>
                          })}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {renderCompareAnalysis()}

                <View className="card">
                  <Text className="card-title">汇总统计</Text>
                  {(() => {
                    const totalPrincipal = compareList.reduce((s, r) => s + r.params.principal, 0)
                    const totalPayment = compareList.reduce((s, r) => s + r.result.totalPayment, 0)
                    const totalInterest = compareList.reduce((s, r) => s + r.result.totalInterest, 0)
                    const totalExcess = compareList.reduce((s, r) => s + r.result.excessInterest, 0)
                    return (
                      <>
                        <View className="compare-row"><Text className="compare-label">贷款笔数</Text><Text className="compare-value">{compareList.length} 笔</Text></View>
                        <View className="compare-row"><Text className="compare-label">总借款本金</Text><Text className="compare-value">¥{Math.round(totalPrincipal).toLocaleString('zh-CN')}</Text></View>
                        <View className="compare-row"><Text className="compare-label">总还款额</Text><Text className="compare-value">¥{Math.round(totalPayment).toLocaleString('zh-CN')}</Text></View>
                        <View className="compare-row"><Text className="compare-label">总利息</Text><Text className="compare-value">¥{Math.round(totalInterest).toLocaleString('zh-CN')}</Text></View>
                        <View className="compare-row">
                          <Text className="compare-label">总超额利息</Text>
                          <Text className="compare-value" style={{
                            color: totalExcess > 0 ? 'var(--color-excessive)' : 'var(--color-compliant)',
                            fontWeight: 700,
                          }}>
                            ¥{Math.round(totalExcess).toLocaleString('zh-CN')}
                          </Text>
                        </View>
                      </>
                    )
                  })()}
                </View>
              </>
            )}

            <View className="compare-actions">
              <Button className="compare-action-btn add" onClick={() => openSelectModal(false)}>
                + 添加贷款
              </Button>
              <Button className="compare-action-btn clear" onClick={handleClear}>
                清空所有对比
              </Button>
            </View>
          </>
        )}
      </ScrollView>

      <Popup
        visible={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        position="bottom"
        className="compare-select-popup"
      >
        <View className="modal-content">
          <Button className="modal-close" onClick={() => setShowSelectModal(false)}>✕</Button>
          <Text className="modal-title">选择对比贷款</Text>
          <Text className="modal-subtitle">（已选 {((includeCurrent ? 1 : 0) + selectedIds.length)} 笔，最多 3 笔）</Text>

          {currentResult && currentParams && (
            <View className="select-item" onClick={toggleCurrent} style={{
              borderColor: includeCurrent ? 'var(--brand-primary)' : '#eee',
              background: includeCurrent ? '#fff8e7' : '#fff',
            }}>
              <Text className="select-checkbox">{includeCurrent ? '☑' : '☐'}</Text>
              <View className="select-info">
                <Text className="select-name">📌 当前计算结果</Text>
                <Text className="select-desc">IRR {currentResult.irr.toFixed(2)}% · 本金 ¥{Math.round(currentParams.principal).toLocaleString('zh-CN')} · {currentResult.periods}期</Text>
              </View>
            </View>
          )}

          {history.length > 0 && (
            <>
              <View className="select-divider">
                <View className="divider-line" />
                <Text className="divider-text">历史计算记录</Text>
                <View className="divider-line" />
              </View>
              <ScrollView scrollY className="select-history-list">
                {history.map(r => {
                  const isSel = selectedIds.includes(r.id)
                  const st = statusMap[r.result.complianceStatus]
                  return (
                    <View key={r.id} className="select-item" onClick={() => toggleHistorySelect(r.id)} style={{
                      borderColor: isSel ? 'var(--brand-primary)' : '#eee',
                      background: isSel ? '#fff8e7' : '#fff',
                    }}>
                      <Text className="select-checkbox">{isSel ? '☑' : '☐'}</Text>
                      <View className="select-info">
                        <Text className="select-name">{formatDate(r.timestamp)}</Text>
                        <Text className="select-desc">本金 ¥{Math.round(r.params.principal).toLocaleString('zh-CN')} · {r.result.periods}期 · IRR {r.result.irr.toFixed(2)}% · {st.label}</Text>
                      </View>
                    </View>
                  )
                })}
              </ScrollView>
            </>
          )}

          {!currentResult && history.length === 0 && (
            <View className="empty-state">
              <Text className="empty-text">暂无可用数据</Text>
              <Text className="empty-hint">请先在首页完成计算并保存记录</Text>
            </View>
          )}

          <Button className="modal-confirm" onClick={confirmSelect} disabled={((includeCurrent ? 1 : 0) + selectedIds.length) < 1}>
            📊 开始对比分析（{((includeCurrent ? 1 : 0) + selectedIds.length)} 笔贷款）
          </Button>
        </View>
      </Popup>
    </View>
  )
}

// ============================================================
// 房贷对比（与网贷一致的卡片布局，支持从历史记录添加）
// ============================================================
const LOAN_TYPE_LABELS: Record<string, string> = {
  commercial: '商业贷',
  fund: '公积金贷',
  combination: '组合贷',
}

const METHOD_LABELS: Record<string, string> = {
  equalPrincipalInterest: '等额本息',
  equalPrincipal: '等额本金',
}

function MortgageCompare() {
  const [schemes, setSchemes] = useState<MortgageScheme[]>([])
  const [history, setHistory] = useState<MortgageHistoryItem[]>([])
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' })

  const refresh = () => setSchemes(getMortgageSchemes())

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchMortgageHistory(100, 0)
      if (res.data) setHistory(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [])

  const sorted = useMemo(() => [...schemes].sort((a, b) => a.result.totalInterest - b.result.totalInterest), [schemes])
  const bestId = sorted[0]?.id

  const barData = useMemo(() => sorted.map((s) => ({
    name: s.label,
    principal: s.result.totalPrincipal,
    interest: s.result.totalInterest,
  })), [sorted])

  const openSelectModal = () => {
    if (!checkLogin()) return
    setSelectedIds([])
    loadHistory().then(() => setShowSelectModal(true))
  }

  const toggleHistorySelect = (id: number) => {
    const idx = selectedIds.indexOf(id)
    if (idx >= 0) {
      setSelectedIds(selectedIds.filter(sid => sid !== id))
    } else {
      if (selectedIds.length >= 3) {
        showToast('最多选择 3 个方案进行对比')
        return
      }
      setSelectedIds([...selectedIds, id])
    }
  }

  const confirmSelect = () => {
    if (selectedIds.length === 0) return
    const newItems: MortgageScheme[] = []
    selectedIds.forEach((hid) => {
      const hrec = history.find(r => r.id === hid)
      if (hrec && hrec.inputSnapshot) {
        try {
          const d = hrec.inputSnapshot
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
          if (result) {
            const label = `${METHOD_LABELS[input.repayMethod]} · ${LOAN_TYPE_LABELS[input.loanType]}`
            newItems.push({
              id: 'mort_h_' + hid,
              label,
              input,
              result,
              createdAt: new Date(hrec.createdAt).getTime(),
            })
          }
        } catch (e) {
          console.error('parse mortgage history error:', e)
        }
      }
    })

    if (newItems.length > 0) {
      clearMortgageSchemes()
      newItems.forEach(item => addMortgageScheme(item))
      refresh()
      setToast({ show: true, msg: '已添加 ' + newItems.length + ' 个方案' })
    }
    setShowSelectModal(false)
  }

  const handleRemove = (id: string) => {
    removeMortgageScheme(id)
    refresh()
    setToast({ show: true, msg: '已移除' })
  }

  const handleClear = () => {
    clearMortgageSchemes()
    refresh()
    setToast({ show: true, msg: '已清空所有对比' })
  }

  // 对比表格行
  const mortgageRows = [
    { label: '还款方式', get: (s: MortgageScheme) => METHOD_LABELS[s.input.repayMethod] },
    { label: '贷款类型', get: (s: MortgageScheme) => LOAN_TYPE_LABELS[s.input.loanType] },
    { label: '贷款本金', get: (s: MortgageScheme) => '¥' + Math.round(s.result.totalPrincipal).toLocaleString('zh-CN') },
    { label: '年化利率', get: (s: MortgageScheme) => s.input.commercialRate + '%' },
    { label: '月供', get: (s: MortgageScheme) => '¥' + Math.round(s.result.monthlyPayment).toLocaleString('zh-CN') },
    { label: '总还款', get: (s: MortgageScheme) => '¥' + Math.round(s.result.totalPayment).toLocaleString('zh-CN') },
    { label: '总利息', get: (s: MortgageScheme) => '¥' + Math.round(s.result.totalInterest).toLocaleString('zh-CN'), highlight: true },
    { label: '贷款年限', get: (s: MortgageScheme) => s.input.years + '年' },
  ]

  return (
    <View className="irr-compare">
      <ScrollView scrollY className="compare-content">
        {schemes.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-icon">🏠</Text>
            <Text className="empty-text">暂无对比方案</Text>
            <Text className="empty-hint">从历史记录中选择房贷方案，或先去计算</Text>
            <View className="empty-actions">
              <Button className="empty-btn primary" onClick={openSelectModal}>
                📋 从历史记录添加
              </Button>
              <Button className="empty-btn secondary" onClick={() => Taro.navigateTo({ url: '/pages/mortgage' })}>
                🏠 去计算房贷
              </Button>
            </View>
          </View>
        ) : (
          <>
            <View className="card">
              <Text className="card-title">方案列表</Text>
              {sorted.map((s) => (
                <View key={s.id} className="compare-item-row">
                  <View className="compare-item-info">
                    <View className="compare-item-header">
                      <Text className="compare-item-name">
                        {s.label}
                      </Text>
                      {s.id === bestId && (
                        <Text className="compare-item-status" style={{ color: 'var(--color-compliant)', background: '#ECFDF5' }}>
                          最优选
                        </Text>
                      )}
                    </View>
                    <Text className="compare-item-desc">
                      本金 ¥{Math.round(s.result.totalPrincipal).toLocaleString('zh-CN')} · {s.input.years}年 · 月供 ¥{Math.round(s.result.monthlyPayment).toLocaleString('zh-CN')}
                    </Text>
                  </View>
                  <Button className="compare-item-remove" onClick={() => handleRemove(s.id)}>
                    ×
                  </Button>
                </View>
              ))}
            </View>

            {sorted.length >= 2 && (
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

                <View className="card">
                  <Text className="card-title">并排对比</Text>
                  <ScrollView scrollX className="compare-table-scroll">
                    <View className="compare-table">
                      <View className="compare-table-header">
                        <Text className="compare-table-th">指标</Text>
                        {sorted.map(s => (
                          <Text key={s.id} className="compare-table-th">{s.label}</Text>
                        ))}
                      </View>
                      {mortgageRows.map((row, ri) => (
                        <View key={ri} className="compare-table-row">
                          <Text className="compare-table-td label">{row.label}</Text>
                          {sorted.map(s => {
                            const val = row.get(s)
                            return (
                              <Text
                                key={s.id}
                                className="compare-table-td"
                                style={{
                                  color: row.highlight ? 'var(--brand-primary)' : '#333',
                                  fontWeight: row.highlight ? 700 : 400,
                                }}
                              >
                                {val}
                              </Text>
                            )
                          })}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View className="card">
                  <Text className="card-title">汇总统计</Text>
                  <View className="compare-row"><Text className="compare-label">方案数量</Text><Text className="compare-value">{sorted.length} 个</Text></View>
                  <View className="compare-row"><Text className="compare-label">总贷款本金</Text><Text className="compare-value">¥{Math.round(sorted.reduce((s, r) => s + r.result.totalPrincipal, 0)).toLocaleString('zh-CN')}</Text></View>
                  <View className="compare-row"><Text className="compare-label">总还款额</Text><Text className="compare-value">¥{Math.round(sorted.reduce((s, r) => s + r.result.totalPayment, 0)).toLocaleString('zh-CN')}</Text></View>
                  <View className="compare-row"><Text className="compare-label">总利息</Text><Text className="compare-value">¥{Math.round(sorted.reduce((s, r) => s + r.result.totalInterest, 0)).toLocaleString('zh-CN')}</Text></View>
                  <View className="compare-row"><Text className="compare-label">最高月供</Text><Text className="compare-value">¥{Math.round(Math.max(...sorted.map(s => s.result.monthlyPayment))).toLocaleString('zh-CN')}</Text></View>
                  <View className="compare-row"><Text className="compare-label">最低月供</Text><Text className="compare-value">¥{Math.round(Math.min(...sorted.map(s => s.result.monthlyPayment))).toLocaleString('zh-CN')}</Text></View>
                </View>

                {sorted.length >= 2 && (
                  <View className="analysis-card">
                    <Text className="card-title">📊 对比分析</Text>
                    {(() => {
                      const best = sorted[0]
                      const worst = sorted[sorted.length - 1]
                      const interestDiff = worst.result.totalInterest - best.result.totalInterest
                      const monthlyDiff = Math.abs(worst.result.monthlyPayment - best.result.monthlyPayment)
                      return (
                        <>
                          <View className="compare-analysis-card">
                            <View className="compare-analysis-header">
                              <Text className="compare-icon">✅</Text>
                              <Text className="compare-analysis-title">推荐选择「{best.label}」</Text>
                            </View>
                            <Text className="compare-analysis-desc">
                              总利息最低（¥{Math.round(best.result.totalInterest).toLocaleString('zh-CN')}），相比最高方案节省 ¥{Math.round(interestDiff).toLocaleString('zh-CN')}
                            </Text>
                          </View>
                          {interestDiff > 10000 && (
                            <View className="compare-analysis-card">
                              <View className="compare-analysis-header">
                                <Text className="compare-icon">💰</Text>
                                <Text className="compare-analysis-title">利息差异显著</Text>
                              </View>
                              <Text className="compare-analysis-desc">
                                最高与最低方案利息差 ¥{Math.round(interestDiff).toLocaleString('zh-CN')}，月供差 ¥{Math.round(monthlyDiff).toLocaleString('zh-CN')}，建议优先选择低利率方案
                              </Text>
                            </View>
                          )}
                        </>
                      )
                    })()}
                  </View>
                )}
              </>
            )}

            <View className="compare-actions">
              <Button className="compare-action-btn add" onClick={openSelectModal}>
                + 添加方案
              </Button>
              <Button className="compare-action-btn clear" onClick={handleClear}>
                清空所有对比
              </Button>
            </View>
          </>
        )}
      </ScrollView>

      <Popup
        visible={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        position="bottom"
        className="compare-select-popup"
      >
        <View className="modal-content">
          <Button className="modal-close" onClick={() => setShowSelectModal(false)}>✕</Button>
          <Text className="modal-title">从历史记录添加房贷方案</Text>
          <Text className="modal-subtitle">（已选 {selectedIds.length} 个，最多 3 个）</Text>

          {loading ? (
            <View className="empty-state"><Text className="empty-text">加载中...</Text></View>
          ) : history.length > 0 ? (
            <ScrollView scrollY className="select-history-list">
              {history.map(r => {
                const isSel = selectedIds.includes(r.id)
                const d = r.inputSnapshot || {}
                const label = `${METHOD_LABELS[d.repayMethod] || r.mode} · ${LOAN_TYPE_LABELS[d.loanType] || ''}`
                return (
                  <View key={r.id} className="select-item" onClick={() => toggleHistorySelect(r.id)} style={{
                    borderColor: isSel ? 'var(--brand-primary)' : '#eee',
                    background: isSel ? '#fff8e7' : '#fff',
                  }}>
                    <Text className="select-checkbox">{isSel ? '☑' : '☐'}</Text>
                    <View className="select-info">
                      <Text className="select-name">{label}</Text>
                      <Text className="select-desc">
                        {formatDate(r.createdAt)} · 本金 ¥{Math.round(r.principal).toLocaleString('zh-CN')} · {r.years}年 · 月供 ¥{Math.round(r.monthlyPayment || 0).toLocaleString('zh-CN')}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </ScrollView>
          ) : (
            <View className="empty-state">
              <Text className="empty-text">暂无历史记录</Text>
              <Text className="empty-hint">请先去房贷计算器完成计算并保存</Text>
            </View>
          )}

          <Button className="modal-confirm" onClick={confirmSelect} disabled={selectedIds.length < 1}>
            📊 开始对比分析（{selectedIds.length} 个方案）
          </Button>
        </View>
      </Popup>

      <Toast visible={toast.show} content={toast.msg} onClose={() => setToast({ show: false, msg: '' })} />
    </View>
  )
}

// ============================================================
// 车贷对比（与网贷一致的卡片布局，支持从历史记录添加）
// ============================================================
const AUTO_MODE_LABELS: Record<string, string> = {
  EQUAL_PI: '等额本息', EQUAL_P: '等额本金',
  INTEREST_FIRST: '先息后本', BALLOON: '气球贷',
}

function AutoCompare() {
  const [schemes, setSchemes] = useState<CarScheme[]>([])
  const [history, setHistory] = useState<AutoLoanHistoryItem[]>([])
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' })

  const refresh = () => setSchemes(getCarSchemes())

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchAutoLoanHistory(100, 0)
      if (res.data) setHistory(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [])

  const sorted = useMemo(() => [...schemes].sort((a, b) => {
    const ka = a.result.irrConverged ? a.result.irr : Infinity
    const kb = b.result.irrConverged ? b.result.irr : Infinity
    return ka - kb
  }), [schemes])
  const bestId = sorted[0]?.id

  const barData = useMemo(() => sorted.map((s) => ({
    name: s.label,
    principal: s.result.loanAmount,
    interest: s.result.totalInterest,
  })), [sorted])

  const openSelectModal = () => {
    if (!checkLogin()) return
    setSelectedIds([])
    loadHistory().then(() => setShowSelectModal(true))
  }

  const toggleHistorySelect = (id: number) => {
    const idx = selectedIds.indexOf(id)
    if (idx >= 0) {
      setSelectedIds(selectedIds.filter(sid => sid !== id))
    } else {
      if (selectedIds.length >= 3) {
        showToast('最多选择 3 个方案进行对比')
        return
      }
      setSelectedIds([...selectedIds, id])
    }
  }

  const confirmSelect = () => {
    if (selectedIds.length === 0) return
    const newItems: CarScheme[] = []
    selectedIds.forEach((hid) => {
      const hrec = history.find(r => r.id === hid)
      if (hrec && hrec.inputSnapshot) {
        try {
          const d = hrec.inputSnapshot
          const input: CarLoanInput = {
            loanAmount: d.loanAmount ?? hrec.principal ?? 0,
            loanTerm: d.term ?? d.loanTerm ?? hrec.periods ?? 36,
            repaymentType: d.method ?? d.repaymentType ?? 'EQUAL_PI',
            annualRate: d.rate ?? d.annualRate ?? hrec.rate ?? 6,
            downPayment: d.downPayment ?? hrec.downPayment ?? 0,
            fees: d.fees ?? hrec.fees ?? [],
            prepaymentPeriod: d.prepaymentPeriod,
          }
          const result = calculateCarLoan(input)
          if (result) {
            const label = REPAYMENT_LABELS[input.repaymentType] || input.repaymentType
            newItems.push({
              id: 'auto_h_' + hid,
              label,
              input,
              result,
              createdAt: new Date(hrec.createdAt).getTime(),
            })
          }
        } catch (e) {
          console.error('parse auto history error:', e)
        }
      }
    })

    if (newItems.length > 0) {
      clearCarSchemes()
      newItems.forEach(item => addCarScheme(item))
      refresh()
      setToast({ show: true, msg: '已添加 ' + newItems.length + ' 个方案' })
    }
    setShowSelectModal(false)
  }

  const handleRemove = (id: string) => {
    removeCarScheme(id)
    refresh()
    setToast({ show: true, msg: '已移除' })
  }

  const handleClear = () => {
    clearCarSchemes()
    refresh()
    setToast({ show: true, msg: '已清空所有对比' })
  }

  // 对比表格行
  const autoRows = [
    { label: '还款方式', get: (s: CarScheme) => AUTO_MODE_LABELS[s.result.repaymentType] || s.result.repaymentType },
    { label: '贷款本金', get: (s: CarScheme) => '¥' + Math.round(s.result.loanAmount).toLocaleString('zh-CN') },
    { label: '年化利率', get: (s: CarScheme) => s.result.annualRate + '%' },
    { label: '月供', get: (s: CarScheme) => '¥' + Math.round(s.result.monthlyPayment).toLocaleString('zh-CN') },
    { label: 'IRR', get: (s: CarScheme) => s.result.irrConverged ? s.result.irr.toFixed(2) + '%' : '—', highlight: true },
    { label: '总支出', get: (s: CarScheme) => '¥' + Math.round(s.result.totalPayment).toLocaleString('zh-CN') },
    { label: '总利息', get: (s: CarScheme) => '¥' + Math.round(s.result.totalInterest).toLocaleString('zh-CN') },
    { label: '总费用', get: (s: CarScheme) => '¥' + Math.round(s.result.totalFee).toLocaleString('zh-CN') },
    { label: '贷款期限', get: (s: CarScheme) => s.result.loanTerm + '期' },
  ]

  return (
    <View className="irr-compare">
      <ScrollView scrollY className="compare-content">
        {schemes.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-icon">🚗</Text>
            <Text className="empty-text">暂无对比方案</Text>
            <Text className="empty-hint">从历史记录中选择车贷方案，或先去计算</Text>
            <View className="empty-actions">
              <Button className="empty-btn primary" onClick={openSelectModal}>
                📋 从历史记录添加
              </Button>
              <Button className="empty-btn secondary" onClick={() => Taro.navigateTo({ url: '/pages/auto' })}>
                🚗 去计算车贷
              </Button>
            </View>
          </View>
        ) : (
          <>
            <View className="card">
              <Text className="card-title">方案列表</Text>
              {sorted.map((s) => (
                <View key={s.id} className="compare-item-row">
                  <View className="compare-item-info">
                    <View className="compare-item-header">
                      <Text className="compare-item-name">
                        {s.label}
                      </Text>
                      {s.id === bestId && (
                        <Text className="compare-item-status" style={{ color: 'var(--color-compliant)', background: '#ECFDF5' }}>
                          最优选
                        </Text>
                      )}
                    </View>
                    <Text className="compare-item-desc">
                      本金 ¥{Math.round(s.result.loanAmount).toLocaleString('zh-CN')} · {s.result.loanTerm}期 · IRR {s.result.irrConverged ? s.result.irr.toFixed(2) + '%' : '—'}
                    </Text>
                  </View>
                  <Button className="compare-item-remove" onClick={() => handleRemove(s.id)}>
                    ×
                  </Button>
                </View>
              ))}
            </View>

            {sorted.length >= 2 && (
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

                <View className="card">
                  <Text className="card-title">并排对比</Text>
                  <ScrollView scrollX className="compare-table-scroll">
                    <View className="compare-table">
                      <View className="compare-table-header">
                        <Text className="compare-table-th">指标</Text>
                        {sorted.map(s => (
                          <Text key={s.id} className="compare-table-th">{s.label}</Text>
                        ))}
                      </View>
                      {autoRows.map((row, ri) => (
                        <View key={ri} className="compare-table-row">
                          <Text className="compare-table-td label">{row.label}</Text>
                          {sorted.map(s => {
                            const val = row.get(s)
                            return (
                              <Text
                                key={s.id}
                                className="compare-table-td"
                                style={{
                                  color: row.highlight ? 'var(--brand-primary)' : '#333',
                                  fontWeight: row.highlight ? 700 : 400,
                                }}
                              >
                                {val}
                              </Text>
                            )
                          })}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View className="card">
                  <Text className="card-title">汇总统计</Text>
                  <View className="compare-row"><Text className="compare-label">方案数量</Text><Text className="compare-value">{sorted.length} 个</Text></View>
                  <View className="compare-row"><Text className="compare-label">总贷款本金</Text><Text className="compare-value">¥{Math.round(sorted.reduce((s, r) => s + r.result.loanAmount, 0)).toLocaleString('zh-CN')}</Text></View>
                  <View className="compare-row"><Text className="compare-label">总支出</Text><Text className="compare-value">¥{Math.round(sorted.reduce((s, r) => s + r.result.totalPayment, 0)).toLocaleString('zh-CN')}</Text></View>
                  <View className="compare-row"><Text className="compare-label">总利息</Text><Text className="compare-value">¥{Math.round(sorted.reduce((s, r) => s + r.result.totalInterest, 0)).toLocaleString('zh-CN')}</Text></View>
                  <View className="compare-row"><Text className="compare-label">总费用</Text><Text className="compare-value">¥{Math.round(sorted.reduce((s, r) => s + r.result.totalFee, 0)).toLocaleString('zh-CN')}</Text></View>
                  <View className="compare-row"><Text className="compare-label">最低IRR</Text><Text className="compare-value">{sorted.filter(s => s.result.irrConverged).length > 0 ? Math.min(...sorted.filter(s => s.result.irrConverged).map(s => s.result.irr)).toFixed(2) + '%' : '—'}</Text></View>
                </View>

                {sorted.length >= 2 && (
                  <View className="analysis-card">
                    <Text className="card-title">📊 对比分析</Text>
                    {(() => {
                      const best = sorted[0]
                      const worst = sorted[sorted.length - 1]
                      const costDiff = worst.result.totalCost - best.result.totalCost
                      return (
                        <>
                          <View className="compare-analysis-card">
                            <View className="compare-analysis-header">
                              <Text className="compare-icon">✅</Text>
                              <Text className="compare-analysis-title">推荐选择「{best.label}」</Text>
                            </View>
                            <Text className="compare-analysis-desc">
                              总成本最低（¥{Math.round(best.result.totalPayment).toLocaleString('zh-CN')}），相比最高方案节省 ¥{Math.round(costDiff).toLocaleString('zh-CN')}
                            </Text>
                          </View>
                          {best.result.irrConverged && sorted.filter(s => s.result.irrConverged).length >= 2 && (
                            <View className="compare-analysis-card">
                              <View className="compare-analysis-header">
                                <Text className="compare-icon">📈</Text>
                                <Text className="compare-analysis-title">IRR 对比</Text>
                              </View>
                              <Text className="compare-analysis-desc">
                                最低 IRR {best.result.irr.toFixed(2)}%，最高 IRR {Math.max(...sorted.filter(s => s.result.irrConverged).map(s => s.result.irr)).toFixed(2)}%
                              </Text>
                            </View>
                          )}
                        </>
                      )
                    })()}
                  </View>
                )}
              </>
            )}

            <View className="compare-actions">
              <Button className="compare-action-btn add" onClick={openSelectModal}>
                + 添加方案
              </Button>
              <Button className="compare-action-btn clear" onClick={handleClear}>
                清空所有对比
              </Button>
            </View>
          </>
        )}
      </ScrollView>

      <Popup
        visible={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        position="bottom"
        className="compare-select-popup"
      >
        <View className="modal-content">
          <Button className="modal-close" onClick={() => setShowSelectModal(false)}>✕</Button>
          <Text className="modal-title">从历史记录添加车贷方案</Text>
          <Text className="modal-subtitle">（已选 {selectedIds.length} 个，最多 3 个）</Text>

          {loading ? (
            <View className="empty-state"><Text className="empty-text">加载中...</Text></View>
          ) : history.length > 0 ? (
            <ScrollView scrollY className="select-history-list">
              {history.map(r => {
                const isSel = selectedIds.includes(r.id)
                const d = r.inputSnapshot || {}
                const label = AUTO_MODE_LABELS[d.method || d.repaymentType] || r.mode
                return (
                  <View key={r.id} className="select-item" onClick={() => toggleHistorySelect(r.id)} style={{
                    borderColor: isSel ? 'var(--brand-primary)' : '#eee',
                    background: isSel ? '#fff8e7' : '#fff',
                  }}>
                    <Text className="select-checkbox">{isSel ? '☑' : '☐'}</Text>
                    <View className="select-info">
                      <Text className="select-name">{label}</Text>
                      <Text className="select-desc">
                        {formatDate(r.createdAt)} · 本金 ¥{Math.round(r.principal).toLocaleString('zh-CN')} · {r.periods}期 · IRR {r.irr != null ? r.irr.toFixed(2) + '%' : '—'}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </ScrollView>
          ) : (
            <View className="empty-state">
              <Text className="empty-text">暂无历史记录</Text>
              <Text className="empty-hint">请先去车贷计算器完成计算并保存</Text>
            </View>
          )}

          <Button className="modal-confirm" onClick={confirmSelect} disabled={selectedIds.length < 1}>
            📊 开始对比分析（{selectedIds.length} 个方案）
          </Button>
        </View>
      </Popup>

      <Toast visible={toast.show} content={toast.msg} onClose={() => setToast({ show: false, msg: '' })} />
    </View>
  )
}

// ============================================================
// 提前还贷对比
// ============================================================
function PrepayCompare() {
  const [schemes, setSchemes] = useState<PrepayScheme[]>([])
  const [toast, setToast] = useState({ show: false, msg: '' })
  const [history, setHistory] = useState<PrepayHistoryItem[]>([])
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    setSchemes(getPrepaySchemes())
  }, [])

  useEffect(() => { refresh() }, [])

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchPrepayHistory(100, 0)
      if (res.data) setHistory(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  const handleRemove = (id: string) => {
    removePrepayScheme(id)
    refresh()
    setToast({ show: true, msg: '已删除' })
  }

  const handleClear = () => {
    clearPrepaySchemes()
    refresh()
    setToast({ show: true, msg: '已清空所有对比' })
  }

  const openSelectModal = () => {
    if (!checkLogin()) return
    setSelectedIds([])
    loadHistory().then(() => setShowSelectModal(true))
  }

  const toggleHistorySelect = (id: number) => {
    const idx = selectedIds.indexOf(id)
    if (idx >= 0) {
      setSelectedIds(selectedIds.filter(sid => sid !== id))
    } else {
      if (selectedIds.length >= 3) {
        showToast('最多选择 3 个方案进行对比')
        return
      }
      setSelectedIds([...selectedIds, id])
    }
  }

  const confirmSelect = () => {
    if (selectedIds.length === 0) return
    const newItems: PrepayScheme[] = []
    selectedIds.forEach((hid) => {
      const hrec = history.find(r => r.id === hid)
      if (hrec) {
        try {
          const d = hrec.inputSnapshot || {}
          newItems.push({
            id: 'prepay_h_' + hid,
            label: `${d.repaymentType === 'EQUAL_PI' ? '等额本息' : '等额本金'} · ${hrec.prepayType === 'FULL' ? '全部提前还' : '部分提前还'} · ¥${Math.round(hrec.totalPrepay || d.partialAmount || hrec.principal).toLocaleString('zh-CN')}`,
            input: {
              loanAmount: d.loanAmount ?? hrec.principal ?? 0,
              loanYears: d.loanYears ?? hrec.years ?? 20,
              annualRate: d.annualRate ?? hrec.rate ?? 4.2,
              repaymentType: d.repaymentType ?? 'EQUAL_PI',
              firstPaymentDate: d.firstPaymentDate ?? '2026-01-01',
              prepaymentDate: d.prepaymentDate ?? '2026-07-01',
              penaltyType: d.penaltyType ?? 'NONE',
              penaltyValue: d.penaltyValue ?? 0,
              prepayType: hrec.prepayType ?? d.prepayType ?? 'PARTIAL',
              partialAmount: d.partialAmount ?? hrec.partialAmount ?? 0,
            },
            result: {
              loanAmount: hrec.principal ?? 0,
              loanTerm: hrec.periods ?? (hrec.years ? hrec.years * 12 : 240),
              monthlyPayment: hrec.monthlyPayment ?? 0,
              totalInterest: hrec.totalInterest ?? 0,
              totalPayment: hrec.totalPayment ?? ((hrec.totalInterest ?? 0) + (hrec.principal ?? 0)),
              paidMonths: hrec.paidMonths ?? 0,
              paidInterest: hrec.paidInterest ?? 0,
              paidPrincipal: hrec.paidPrincipal ?? 0,
              remainingPrincipal: hrec.remainingPrincipal ?? 0,
              remainingInterest: hrec.remainingInterest ?? 0,
              penalty: hrec.penalty ?? 0,
              totalPrepay: hrec.totalPrepay ?? 0,
              savedInterest: hrec.savedInterest ?? 0,
              saveRatio: hrec.saveRatio ?? 0,
              prepayMonth: hrec.prepayMonth ?? 0,
              schedules: [],
            },
            createdAt: new Date(hrec.createdAt).getTime(),
          })
        } catch (e) {
          console.error('parse prepay history error:', e)
        }
      }
    })

    if (newItems.length > 0) {
      clearPrepaySchemes()
      newItems.forEach(item => addPrepayScheme(item))
      refresh()
      setToast({ show: true, msg: '已添加 ' + newItems.length + ' 个方案' })
    }
    setShowSelectModal(false)
  }

  const sorted = useMemo(() => {
    return [...schemes].sort((a, b) => a.result.savedInterest - b.result.savedInterest).reverse()
  }, [schemes])

  const bestId = sorted.length > 0 ? sorted[0].id : ''

  const barData = useMemo(() => {
    return sorted.map(s => ({
      name: s.label,
      principal: s.result.remainingPrincipal,
      interest: s.result.remainingInterest,
    }))
  }, [sorted])

  const prepayRows = [
    { label: '还款方式', get: (s: PrepayScheme) => s.input.repaymentType === 'EQUAL_PI' ? '等额本息' : '等额本金' },
    { label: '贷款本金', get: (s: PrepayScheme) => '¥' + Math.round(s.input.loanAmount).toLocaleString('zh-CN') },
    { label: '年利率', get: (s: PrepayScheme) => s.input.annualRate + '%' },
    { label: '贷款年限', get: (s: PrepayScheme) => s.input.loanYears + '年' },
    { label: '月供', get: (s: PrepayScheme) => '¥' + Math.round(s.result.monthlyPayment).toLocaleString('zh-CN') },
    { label: '原计划总利息', get: (s: PrepayScheme) => '¥' + Math.round(s.result.totalInterest).toLocaleString('zh-CN') },
    { label: '已还月数', get: (s: PrepayScheme) => s.result.paidMonths + '期' },
    { label: '剩余本金', get: (s: PrepayScheme) => '¥' + Math.round(s.result.remainingPrincipal).toLocaleString('zh-CN') },
    { label: '违约金', get: (s: PrepayScheme) => '¥' + Math.round(s.result.penalty).toLocaleString('zh-CN') },
    { label: '本次需还', get: (s: PrepayScheme) => '¥' + Math.round(s.result.totalPrepay).toLocaleString('zh-CN'), highlight: true },
    { label: '节省利息', get: (s: PrepayScheme) => '¥' + Math.round(s.result.savedInterest).toLocaleString('zh-CN') },
    { label: '节省比例', get: (s: PrepayScheme) => s.result.saveRatio.toFixed(1) + '%' },
  ]

  return (
    <View className="irr-compare">
      <ScrollView scrollY className="compare-content">
        {schemes.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-icon">💰</Text>
            <Text className="empty-text">暂无提前还贷方案</Text>
            <Text className="empty-hint">从历史记录中选择方案，或先去计算</Text>
            <View className="empty-actions">
              <Button className="empty-btn primary" onClick={openSelectModal}>
                📋 从历史记录添加
              </Button>
              <Button className="empty-btn secondary" onClick={() => Taro.navigateTo({ url: '/pages/prepay' })}>
                🔄 去计算提前还贷
              </Button>
            </View>
          </View>
        ) : (
          <>
            <View className="card">
              <Text className="card-title">方案列表</Text>
              {sorted.map((s) => (
                <View key={s.id} className="compare-item-row">
                  <View className="compare-item-info">
                    <View className="compare-item-header">
                      <Text className="compare-item-name">
                        {s.label}
                      </Text>
                      {s.id === bestId && (
                        <Text className="compare-item-status" style={{ color: 'var(--color-compliant)', background: '#ECFDF5' }}>
                          最省利息
                        </Text>
                      )}
                    </View>
                    <Text className="compare-item-desc">
                      本金 ¥{Math.round(s.input.loanAmount).toLocaleString('zh-CN')} · {s.input.loanYears}年 · 节省 ¥{Math.round(s.result.savedInterest).toLocaleString('zh-CN')}
                    </Text>
                  </View>
                  <Button className="compare-item-remove" onClick={() => handleRemove(s.id)}>
                    ×
                  </Button>
                </View>
              ))}
            </View>

            {sorted.length >= 2 && (
              <>
                <View className="chart-card">
                  <Text className="chart-title">各方案剩余本金与利息</Text>
                  <CarChart
                    kind="bar"
                    data={barData}
                    nameField="name"
                    seriesField={['principal', 'interest']}
                    seriesNames={['剩余本金', '剩余利息']}
                  />
                </View>

                <View className="card">
                  <Text className="card-title">并排对比</Text>
                  <ScrollView scrollX className="compare-table-scroll">
                    <View className="compare-table">
                      <View className="compare-table-header">
                        <Text className="compare-table-th">指标</Text>
                        {sorted.map(s => (
                          <Text key={s.id} className="compare-table-th">{s.label}</Text>
                        ))}
                      </View>
                      {prepayRows.map((row, ri) => (
                        <View key={ri} className="compare-table-row">
                          <Text className="compare-table-td label">{row.label}</Text>
                          {sorted.map(s => {
                            const val = row.get(s)
                            return (
                              <Text
                                key={s.id}
                                className="compare-table-td"
                                style={{
                                  color: row.highlight ? 'var(--brand-primary)' : '#333',
                                  fontWeight: row.highlight ? 700 : 400,
                                }}
                              >
                                {val}
                              </Text>
                            )
                          })}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View className="analysis-card">
                  <Text className="card-title">📊 对比分析</Text>
                  {(() => {
                    const best = sorted[0]
                    const worst = sorted[sorted.length - 1]
                    const saveDiff = best.result.savedInterest - worst.result.savedInterest
                    return (
                      <>
                        <View className="compare-analysis-card">
                          <View className="compare-analysis-header">
                            <Text className="compare-icon">✅</Text>
                            <Text className="compare-analysis-title">推荐选择「{best.label}」</Text>
                          </View>
                          <Text className="compare-analysis-desc">
                            节省利息最多（¥{Math.round(best.result.savedInterest).toLocaleString('zh-CN')}），相比最少方案多省 ¥{Math.round(saveDiff).toLocaleString('zh-CN')}
                          </Text>
                        </View>
                      </>
                    )
                  })()}
                </View>
              </>
            )}

            <View className="compare-actions">
              <Button className="compare-action-btn add" onClick={openSelectModal}>
                + 添加方案
              </Button>
              <Button className="compare-action-btn clear" onClick={handleClear}>
                清空所有对比
              </Button>
            </View>
          </>
        )}
      </ScrollView>

      <Popup
        visible={showSelectModal}
        onClose={() => setShowSelectModal(false)}
        position="bottom"
        className="compare-select-popup"
      >
        <View className="modal-content">
          <Button className="modal-close" onClick={() => setShowSelectModal(false)}>✕</Button>
          <Text className="modal-title">从历史记录添加提前还贷方案</Text>
          <Text className="modal-subtitle">（已选 {selectedIds.length} 个，最多 3 个）</Text>

          {loading ? (
            <View className="empty-state"><Text className="empty-text">加载中...</Text></View>
          ) : history.length > 0 ? (
            <ScrollView scrollY className="select-history-list">
              {history.map(r => {
                const isSel = selectedIds.includes(r.id)
                const d = r.inputSnapshot || {}
                const label = `${d.repaymentType === 'EQUAL_PI' ? '等额本息' : '等额本金'} · ${d.prepayType === 'FULL' ? '全部提前还' : '部分提前还'}`
                return (
                  <View key={r.id} className="select-item" onClick={() => toggleHistorySelect(r.id)} style={{
                    borderColor: isSel ? 'var(--brand-primary)' : '#eee',
                    background: isSel ? '#fff8e7' : '#fff',
                  }}>
                    <Text className="select-checkbox">{isSel ? '☑' : '☐'}</Text>
                    <View className="select-info">
                      <Text className="select-name">{label}</Text>
                      <Text className="select-desc">
                        {formatDate(r.createdAt)} · 本金 ¥{Math.round(r.principal).toLocaleString('zh-CN')} · {r.years}年 · 节省 ¥{Math.round(r.savedInterest).toLocaleString('zh-CN')}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </ScrollView>
          ) : (
            <View className="empty-state">
              <Text className="empty-text">暂无历史记录</Text>
              <Text className="empty-hint">请先去提前还贷计算器完成计算并保存</Text>
            </View>
          )}

          <Button className="modal-confirm" onClick={confirmSelect} disabled={selectedIds.length < 1}>
            📊 开始对比分析（{selectedIds.length} 个方案）
          </Button>
        </View>
      </Popup>

      <Toast visible={toast.show} content={toast.msg} onClose={() => setToast({ show: false, msg: '' })} />
    </View>
  )
}

// ============================================================
// 主页面
// ============================================================
export default function ComparePage() {
  const getInitialTab = (): TabType => {
    try {
      const pages = Taro.getCurrentPages()
      const cur = pages[pages.length - 1]
      const params = (cur as any)?.$taroParams || {}
      const tab = params.tab
      if (tab && TABS.some(t => t.key === tab)) {
        return tab as TabType
      }
    } catch { /* ignore */ }
    return 'irr'
  }

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab())

  useEffect(() => {
    Taro.hideTabBar({})
  }, [])

  useDidShow(() => {
    const pages = Taro.getCurrentPages()
    const cur = pages[pages.length - 1]
    const params = (cur as any)?.$taroParams || {}
    const tab = params.tab
    if (tab && TABS.some(t => t.key === tab)) {
      setActiveTab(tab as TabType)
    }
  })

  return (
    <View className="compare-page">
      <View className="compare-header">
        <Text className="back-btn" onClick={handleBack}>‹</Text>
        <Text className="compare-title">贷款对比</Text>
        <View className="compare-count-placeholder" />
      </View>

      <View className="compare-tabs">
        {TABS.map(tab => (
          <View
            key={tab.key}
            className={`compare-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text className="tab-label">{tab.label}</Text>
          </View>
        ))}
      </View>

      {activeTab === 'irr' && <IrrCompare />}
      {activeTab === 'auto' && <AutoCompare />}
      {activeTab === 'mortgage' && <MortgageCompare />}
      {activeTab === 'prepay' && <PrepayCompare />}
    </View>
  )
}
