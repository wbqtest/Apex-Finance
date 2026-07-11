import { useState, useEffect } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import { Popup } from '@nutui/nutui-react-taro'
import './index.less'
import { getHistory, clearHistory, removeHistoryItem, CalcHistoryItem, CompareItem, saveCompareList, addToCompare, getToken } from '../../utils/storage'

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

const statusMap = {
  compliant: { label: '合规', color: 'var(--color-compliant)', bg: '#ECFDF5' },
  warning: { label: '偏高', color: 'var(--color-warning)', bg: '#FFFBEB' },
  excessive: { label: '超额', color: 'var(--color-excessive)', bg: '#FEF2F2' },
}

function formatDate(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function HistoryPage() {
  const [history, setHistory] = useState<CalcHistoryItem[]>([])
  const [detailRecord, setDetailRecord] = useState<CalcHistoryItem | null>(null)

  const loadHistory = () => {
    setHistory(getHistory())
  }

  useEffect(() => {
    loadHistory()
  }, [])

  useDidShow(() => {
    loadHistory()
  })

  const showToast = (msg: string) => {
    Taro.showToast({ title: msg, icon: 'none', duration: 2000 })
  }

  const handleDelete = (id: string) => {
    if (!checkLogin()) return;
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          removeHistoryItem(id)
          setDetailRecord(null)
          loadHistory()
          showToast('记录已删除')
        }
      }
    })
  }

  const handleRestore = (record: CalcHistoryItem) => {
    if (!checkLogin()) return;
    Taro.setStorageSync('appliedTemplate', {
      type: record.params.mode === 'fixed' ? 'simple' : record.params.mode === 'custom' ? 'periodic' : 'fee',
      data: {
        principal: record.params.principal,
        fixedPayment: record.params.fixedPayment,
        customPayments: record.params.customPayments,
        periods: record.params.periods,
      }
    })
    setDetailRecord(null)
    Taro.navigateTo({ url: '/pages/index' })
    showToast('记录已恢复')
  }

  const handleQuickCompare = (record: CalcHistoryItem) => {
    if (!checkLogin()) return;
    saveCompareList([])
    const item: CompareItem = {
      id: record.id + '_c',
      timestamp: record.timestamp,
      params: { ...record.params },
      result: { ...record.result },
      platformName: '贷款1',
    }
    addToCompare(item)
    setDetailRecord(null)
    Taro.navigateTo({ url: '/pages/compare' })
    showToast('已添加至对比')
  }

  const handleClearAll = () => {
    if (!checkLogin()) return;
    Taro.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          clearHistory()
          loadHistory()
          showToast('已清空所有记录')
        }
      }
    })
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
        <Text className="history-title">计算历史</Text>
        <Text className="history-clear" onClick={handleClearAll}>清空</Text>
      </View>

      <ScrollView scrollY className="history-content">
        <View className="history-list">
          {history.map(record => {
            const status = statusMap[record.result.complianceStatus]
            const modeLabel = record.params.mode === 'fixed' ? '简易模式' : record.params.mode === 'custom' ? '逐期录入' : '费用拆分'

            return (
              <View key={record.id} className="history-card" onClick={() => setDetailRecord(record)}>
                <View className="history-card-header">
                  <View className="history-card-left">
                    <Text className="history-card-date">{formatDate(record.timestamp)}</Text>
                    <Text className="history-card-meta">{modeLabel} · {record.result.periods}期</Text>
                  </View>
                  <Text className="history-card-status" style={{ color: status.color, background: status.bg }}>
                    {status.label}
                  </Text>
                </View>
                <View className="history-card-body">
                  <View className="history-card-irr">
                    <Text className="irr-value">{record.result.irr.toFixed(2)}%</Text>
                    <Text className="irr-label">IRR</Text>
                  </View>
                  <View className="history-card-right">
                    <Text className="history-card-principal">本金 ¥{record.params.principal.toLocaleString()}</Text>
                    {record.result.excessInterest > 0 && (
                      <Text className="history-card-excess">超额利息 ¥{record.result.excessInterest.toLocaleString()}</Text>
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
                <Text className="detail-date">{formatDate(detailRecord.timestamp)}</Text>
                <Text className="detail-status" style={{
                  color: statusMap[detailRecord.result.complianceStatus].color,
                  background: statusMap[detailRecord.result.complianceStatus].bg,
                }}>
                  {statusMap[detailRecord.result.complianceStatus].label}
                </Text>
              </View>

              <View className="detail-irr">
                <Text className="detail-irr-value">{detailRecord.result.irr.toFixed(2)}%</Text>
                <Text className="detail-irr-label">IRR</Text>
              </View>

              <View className="detail-info">
                <View className="detail-row"><Text className="detail-label">借款本金</Text><Text className="detail-value">¥{detailRecord.params.principal.toLocaleString()}</Text></View>
                <View className="detail-row"><Text className="detail-label">总还款额</Text><Text className="detail-value">¥{detailRecord.result.totalPayment.toLocaleString()}</Text></View>
                <View className="detail-row"><Text className="detail-label">总利息</Text><Text className="detail-value">¥{detailRecord.result.totalInterest.toLocaleString()}</Text></View>
                <View className="detail-row"><Text className="detail-label">总期数</Text><Text className="detail-value">{detailRecord.result.periods} 期</Text></View>
                <View className="detail-row"><Text className="detail-label">名义APR</Text><Text className="detail-value">{detailRecord.result.nominalAPR.toFixed(2)}%</Text></View>
                <View className="detail-row"><Text className="detail-label">法定上限</Text><Text className="detail-value">{detailRecord.result.complianceLimit}%</Text></View>
                {detailRecord.result.excessInterest > 0 && (
                  <View className="detail-row excess">
                    <Text className="detail-label">超额利息</Text>
                    <Text className="detail-value" style={{ color: 'var(--color-excessive)' }}>
                      ¥{detailRecord.result.excessInterest.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View className="detail-actions">
              <Button className="detail-btn" onClick={() => handleRestore(detailRecord)}>
                📋 重新载入
              </Button>
              <Button className="detail-btn delete" onClick={() => handleDelete(detailRecord.id)}>
                🗑 删除
              </Button>
            </View>
            <Button className="detail-btn compare" onClick={() => handleQuickCompare(detailRecord)}>
              📊 加入对比
            </Button>
          </View>
        )}
      </Popup>
    </View>
  )
}
