import { useState, useEffect } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import { Popup } from '@nutui/nutui-react-taro'
import './index.less'
import { CalculationParams, CalculationResult } from '../../utils/finance'
import { getHistory, CalcHistoryItem, CompareItem, getCompareList, saveCompareList, addToCompare, removeFromCompare, updateComparePlatformName } from '../../utils/storage'
import CustomTabBar from '../../components/CustomTabBar/custom-tab-bar'

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  compliant: { label: '合规', color: 'var(--color-compliant)', bg: '#ECFDF5' },
  warning: { label: '偏高', color: 'var(--color-warning)', bg: '#FFFBEB' },
  excessive: { label: '超额', color: 'var(--color-excessive)', bg: '#FEF2F2' },
}

function formatDate(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ComparePage() {
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

  useEffect(() => {
    loadData()
  }, [])

  useDidShow(() => {
    loadData()
  })

  const showToast = (msg: string) => {
    Taro.showToast({ title: msg, icon: 'none', duration: 2000 })
  }

  const openSelectModal = (fromHistoryOnly = false) => {
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
    const newList = removeFromCompare(id)
    setCompareList(newList)
    showToast('已移除')
  }

  const handleClear = () => {
    saveCompareList([])
    setCompareList([])
    showToast('已清空所有对比')
  }

  const handleEditName = (id: string) => {
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
    { label: '本金', get: (v: CompareItem) => '¥' + v.params.principal.toLocaleString() },
    { label: '总还款', get: (v: CompareItem) => '¥' + v.result.totalPayment.toLocaleString() },
    { label: '总利息', get: (v: CompareItem) => '¥' + v.result.totalInterest.toLocaleString() },
    { label: '期数', get: (v: CompareItem) => v.result.periods + '期' },
    { label: '超额利息', get: (v: CompareItem) => v.result.excessInterest > 0 ? '¥' + v.result.excessInterest.toLocaleString() : '-', warn: true },
  ]

  const renderCompareAnalysis = () => {
    if (compareList.length < 2) return null

    const sorted = [...compareList].sort((a, b) => a.result.irr - b.result.irr)
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]

    const riskCards = sorted.map((r, i) => {
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
        risks.push({ icon: '🚫', text: `超额利息 ¥${excess.toLocaleString()}，已超过法定上限 4 倍 LPR`, severe: true })
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
      reasons.push(`⚠️ 应避免选择 ${worstName}（超额利息 ¥${worst.result.excessInterest.toLocaleString()}）`)
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
                    利率低 {Math.abs(c.irrDiff).toFixed(2)}%，同等本金下总利息少 ¥{Math.abs(c.interestDiff).toLocaleString()}
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
    <View className="compare-page">
      <View className="compare-header">
        <Text className="back-btn" onClick={() => Taro.navigateBack({ fail: () => Taro.switchTab({ url: '/pages/index' }) })}>‹</Text>
        <Text className="compare-title">贷款对比</Text>
        <Text className="compare-count">{compareList.length} 笔</Text>
      </View>

      <ScrollView scrollY className="compare-content">
        {compareList.length === 0 ? (
          <View className="empty-state">
            <Text className="empty-icon">📊</Text>
            <Text className="empty-text">暂无对比记录</Text>
            <Text className="empty-hint">选择历史记录或当前计算结果进行对比</Text>
            <View className="empty-actions">
              {currentResult && (
                <Button className="empty-btn primary" onClick={() => openSelectModal(false)}>
                  📊 加入当前结果对比
                </Button>
              )}
              {history.length >= 2 && (
                <Button className="empty-btn secondary" onClick={() => openSelectModal(true)}>
                  🔄 仅历史记录之间对比
                </Button>
              )}
              {!currentResult && history.length < 2 && (
                <Button className="empty-btn primary" onClick={() => Taro.navigateTo({ url: '/pages/index' })}>
                  去计算
                </Button>
              )}
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
                        本金 ¥{r.params.principal.toLocaleString()} · {r.result.periods}期 · IRR {r.result.irr.toFixed(2)}%
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
                        <View className="compare-row"><Text className="compare-label">总借款本金</Text><Text className="compare-value">¥{totalPrincipal.toLocaleString()}</Text></View>
                        <View className="compare-row"><Text className="compare-label">总还款额</Text><Text className="compare-value">¥{totalPayment.toLocaleString()}</Text></View>
                        <View className="compare-row"><Text className="compare-label">总利息</Text><Text className="compare-value">¥{totalInterest.toLocaleString()}</Text></View>
                        <View className="compare-row">
                          <Text className="compare-label">总超额利息</Text>
                          <Text className="compare-value" style={{
                            color: totalExcess > 0 ? 'var(--color-excessive)' : 'var(--color-compliant)',
                            fontWeight: 700,
                          }}>
                            ¥{totalExcess.toLocaleString()}
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
                <Text className="select-desc">IRR {currentResult.irr.toFixed(2)}% · 本金 ¥{currentParams.principal.toLocaleString()} · {currentResult.periods}期</Text>
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
                        <Text className="select-desc">本金 ¥{r.params.principal.toLocaleString()} · {r.result.periods}期 · IRR {r.result.irr.toFixed(2)}% · {st.label}</Text>
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

      <CustomTabBar />
    </View>
  )
}
