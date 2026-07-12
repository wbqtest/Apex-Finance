import { useState, useCallback } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import { Popup } from '@nutui/nutui-react-taro'
import './index.less'
import { fetchHistory, deleteHistoryRecord, HistoryItem } from '../../services/api'
import { getToken } from '../../utils/storage'

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

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  compliant: { label: '合规', color: 'var(--color-compliant)', bg: '#ECFDF5' },
  warning: { label: '偏高', color: 'var(--color-warning)', bg: '#FFFBEB' },
  excessive: { label: '超额', color: 'var(--color-excessive)', bg: '#FEF2F2' },
}

function formatDate(isoStr: string) {
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const modeLabelMap: Record<string, string> = {
  fixed: '简易模式',
  custom: '逐期录入',
  fee: '费用拆分',
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [detailRecord, setDetailRecord] = useState<HistoryItem | null>(null)
  const [loading, setLoading] = useState(false)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchHistory(100, 0)
      if (res.data) {
        setHistory(res.data)
      }
    } catch {
      // api.ts 已 toast
    } finally {
      setLoading(false)
    }
  }, [])

  useDidShow(() => {
    loadHistory()
  })

  const showToast = (msg: string) => {
    Taro.showToast({ title: msg, icon: 'none', duration: 2000 })
  }

  const handleDelete = async (id: number) => {
    if (!checkLogin()) return
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteHistoryRecord(id)
            setDetailRecord(null)
            loadHistory()
            showToast('记录已删除')
          } catch {
            // api.ts 已 toast
          }
        }
      }
    })
  }

  const handleRestore = (record: HistoryItem) => {
    if (!checkLogin()) return
    Taro.setStorageSync('appliedTemplate', {
      type: record.mode === 'fixed' ? 'simple' : record.mode === 'custom' ? 'periodic' : 'fee',
      data: {
        principal: record.principal,
        fixedPayment: record.fixedPayment,
        customPayments: record.customPayments,
        periods: record.periods,
      }
    })
    setDetailRecord(null)
    Taro.navigateTo({ url: '/pages/index' })
    showToast('记录已恢复')
  }

  const handleQuickCompare = (record: HistoryItem) => {
    if (!checkLogin()) return
    const { saveCompareList, addToCompare } = require('../../utils/storage')
    saveCompareList([])
    const item: any = {
      id: String(record.id) + '_c',
      timestamp: new Date(record.createdAt).getTime(),
      params: {
        mode: record.mode,
        principal: record.principal,
        fixedPayment: record.fixedPayment,
        customPayments: record.customPayments,
        periods: record.periods,
      },
      result: {
        irr: record.irr,
        complianceStatus: record.complianceStatus,
        complianceLimit: record.complianceLimit,
        totalPayment: record.totalPayment,
        totalInterest: record.totalInterest,
        excessInterest: record.excessInterest,
        nominalAPR: record.nominalAPR,
        periods: record.periods,
      },
      platformName: '贷款1',
    }
    addToCompare(item)
    setDetailRecord(null)
    Taro.navigateTo({ url: '/pages/compare' })
    showToast('已添加至对比')
  }

  const handleClearAll = async () => {
    if (!checkLogin()) return
    Taro.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({ title: '清空中...' })
          try {
            // 逐条删除所有记录
            for (const item of history) {
              await deleteHistoryRecord(item.id)
            }
            Taro.hideLoading()
            loadHistory()
            showToast('已清空所有记录')
          } catch {
            Taro.hideLoading()
          }
        }
      }
    })
  }

  if (loading) {
    return (
      <View className="history-page">
        <View className="history-header">
          <Text className="back-btn" onClick={handleBack}>‹</Text>
          <Text className="history-title">计算历史</Text>
          <View className="history-clear-placeholder" />
        </View>
        <View className="empty-state">
          <Text className="empty-text">加载中...</Text>
        </View>
      </View>
    )
  }

  if (history.length === 0) {
    return (
      <View className="history-page">
        <View className="history-header">
          <Text className="back-btn" onClick={handleBack}>‹</Text>
          <Text className="history-title">计算历史</Text>
          <View className="history-clear-placeholder" />
        </View>

        <View className="empty-state">
          <Text className="empty-icon">📋</Text>
          <Text className="empty-text">暂无计算记录</Text>
          <Button className="empty-btn" onClick={() => Taro.navigateTo({ url: '/pages/index' })}>
            去计算
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View className="history-page">
      <View className="history-header">
        <Text className="back-btn" onClick={handleBack}>‹</Text>
        <Text className="history-title">计算历史（{history.length}）</Text>
        <Text className="history-clear" onClick={handleClearAll}>清空</Text>
      </View>

      <ScrollView scrollY className="history-content">
        <View className="history-list">
          {history.map(record => {
            const status = statusMap[record.complianceStatus] || statusMap.compliant
            const modeLabel = modeLabelMap[record.mode] || '简易模式'

            return (
              <View key={record.id} className="history-card" onClick={() => setDetailRecord(record)}>
                <View className="history-card-header">
                  <View className="history-card-left">
                    <Text className="history-card-date">{formatDate(record.createdAt)}</Text>
                    <Text className="history-card-meta">{modeLabel} · {record.periods}期</Text>
                  </View>
                  <Text className="history-card-status" style={{ color: status.color, background: status.bg }}>
                    {status.label}
                  </Text>
                </View>
                <View className="history-card-body">
                  <View className="history-card-irr">
                    <Text className="irr-value">{record.irr.toFixed(2)}%</Text>
                    <Text className="irr-label">IRR</Text>
                  </View>
                  <View className="history-card-right">
                    <Text className="history-card-principal">本金 ¥{record.principal.toLocaleString()}</Text>
                    {record.excessInterest != null && record.excessInterest > 0 && (
                      <Text className="history-card-excess">超额利息 ¥{record.excessInterest.toLocaleString()}</Text>
                    )}
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>

      <Popup
        visible={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        position="bottom"
        className="history-detail-popup"
      >
        {detailRecord && (
          <View className="detail-content">
            <Button className="detail-close" onClick={() => setDetailRecord(null)}>✕</Button>
            <Text className="detail-title">记录详情</Text>

            <View className="detail-section">
              <View className="detail-header">
                <Text className="detail-date">{formatDate(detailRecord.createdAt)}</Text>
                <Text className="detail-status" style={{
                  color: (statusMap[detailRecord.complianceStatus] || statusMap.compliant).color,
                  background: (statusMap[detailRecord.complianceStatus] || statusMap.compliant).bg,
                }}>
                  {(statusMap[detailRecord.complianceStatus] || statusMap.compliant).label}
                </Text>
              </View>

              <View className="detail-irr">
                <Text className="detail-irr-value">{detailRecord.irr.toFixed(2)}%</Text>
                <Text className="detail-irr-label">IRR</Text>
              </View>

              <View className="detail-info">
                <View className="detail-row"><Text className="detail-label">借款本金</Text><Text className="detail-value">¥{detailRecord.principal.toLocaleString()}</Text></View>
                <View className="detail-row"><Text className="detail-label">总还款额</Text><Text className="detail-value">¥{detailRecord.totalPayment.toLocaleString()}</Text></View>
                <View className="detail-row"><Text className="detail-label">总利息</Text><Text className="detail-value">¥{detailRecord.totalInterest.toLocaleString()}</Text></View>
                <View className="detail-row"><Text className="detail-label">总期数</Text><Text className="detail-value">{detailRecord.periods} 期</Text></View>
                <View className="detail-row"><Text className="detail-label">名义APR</Text><Text className="detail-value">{(detailRecord.nominalAPR ?? 0).toFixed(2)}%</Text></View>
                <View className="detail-row"><Text className="detail-label">法定上限</Text><Text className="detail-value">{detailRecord.complianceLimit}%</Text></View>
                {detailRecord.excessInterest != null && detailRecord.excessInterest > 0 && (
                  <View className="detail-row excess">
                    <Text className="detail-label">超额利息</Text>
                    <Text className="detail-value" style={{ color: 'var(--color-excessive)' }}>
                      ¥{detailRecord.excessInterest.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View className="detail-actions">
              <View className="detail-btn" onClick={() => handleRestore(detailRecord)}>
                📋 重新载入
              </View>
              <View className="detail-btn detail-btn-delete" onClick={() => handleDelete(detailRecord.id)}>
                🗑 删除
              </View>
            </View>
            <View className="detail-btn detail-btn-compare" onClick={() => handleQuickCompare(detailRecord)}>
              📊 加入对比
            </View>
          </View>
        )}
      </Popup>
    </View>
  )
}
