import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import './index.less'
import { CalculationParams, CalculationResult } from '../../utils/finance'
import { CompareItem, getCompareList } from '../../utils/storage'

interface ReportData {
  params: CalculationParams
  result: CalculationResult
  platformName?: string
  timestamp?: number
}

const statusMap = {
  compliant: { label: '合规', color: 'var(--color-compliant)', bg: '#ECFDF5' },
  warning: { label: '偏高', color: 'var(--color-warning)', bg: '#FFFBEB' },
  excessive: { label: '超额', color: 'var(--color-excessive)', bg: '#FEF2F2' },
}

function formatDate(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ReportPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [compareData, setCompareData] = useState<CompareItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReportData()
  }, [])

  const loadReportData = () => {
    try {
      const paramsStr = Taro.getStorageSync('reportParams')
      const resultStr = Taro.getStorageSync('reportResult')
      const timestamp = Taro.getStorageSync('reportTimestamp')
      const platformName = Taro.getStorageSync('reportPlatformName')

      if (paramsStr && resultStr) {
        setReportData({
          params: JSON.parse(paramsStr),
          result: JSON.parse(resultStr),
          platformName: platformName || '',
          timestamp,
        })
      }

      const compareList = getCompareList()
      if (compareList.length > 0) {
        setCompareData(compareList)
      }
    } catch (e) {
      console.error('Failed to load report data:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    Taro.showToast({ title: '报告已生成', icon: 'success', duration: 2000 })
  }

  const handleSave = () => {
    const report = {
      ...reportData,
      generatedAt: Date.now(),
    }
    try {
      const savedReports = Taro.getStorageSync('savedReports') || []
      savedReports.unshift(report)
      if (savedReports.length > 20) savedReports.pop()
      Taro.setStorageSync('savedReports', savedReports)
      Taro.showToast({ title: '报告已保存', icon: 'success', duration: 2000 })
    } catch (e) {
      Taro.showToast({ title: '保存失败', icon: 'none', duration: 2000 })
    }
  }

  const handleBack = () => {
    const pages = Taro.getCurrentPages();
    if (pages.length > 1) {
      Taro.navigateBack();
    } else {
      Taro.switchTab({ url: '/pages/index' });
    }
  }

  if (loading) {
    return (
      <View className="report-page">
        <View className="report-loading">加载中...</View>
      </View>
    )
  }

  if (!reportData) {
    return (
      <View className="report-page">
        <View className="report-header">
          <Text className="back-btn" onClick={handleBack}>‹</Text>
          <Text className="report-title">分析报告</Text>
          <View className="report-actions-placeholder" />
        </View>

        <View className="empty-state">
          <Text className="empty-icon">📋</Text>
          <Text className="empty-text">暂无报告数据</Text>
          <Button className="empty-btn" onClick={handleBack}>返回首页</Button>
        </View>
      </View>
    )
  }

  const status = statusMap[reportData.result.complianceStatus]
  const params = reportData.params
  const result = reportData.result

  return (
    <View className="report-page">
      <View className="report-header">
        <Text className="back-btn" onClick={handleBack}>‹</Text>
        <Text className="report-title">分析报告</Text>
        <View className="report-actions">
          <Button className="report-btn" onClick={handleSave}>保存</Button>
          <Button className="report-btn" onClick={handleShare}>分享</Button>
        </View>
      </View>

      <ScrollView scrollY className="report-content">
        <View className="report-summary-card">
          <View className="summary-header">
            <Text className="summary-platform">{reportData.platformName || '贷款分析'}</Text>
            <Text className="summary-status" style={{ color: status.color, background: status.bg }}>
              {status.label}
            </Text>
          </View>

          <View className="summary-irr">
            <Text className="summary-irr-value">{result.irr.toFixed(2)}%</Text>
            <Text className="summary-irr-label">实际年化利率 (IRR)</Text>
          </View>

          <View className="summary-bar">
            <View className="bar-track">
              <View className="bar-fill" style={{
                width: `${Math.min(result.irr / result.complianceLimit * 100, 100)}%`,
                background: result.complianceStatus === 'compliant' ? 'var(--color-compliant)' :
                  result.complianceStatus === 'warning' ? 'var(--color-warning)' : 'var(--color-excessive)',
              }} />
            </View>
            <View className="bar-labels">
              <Text className="bar-label">0%</Text>
              <Text className="bar-label limit">{result.complianceLimit}%</Text>
              <Text className="bar-label">上限</Text>
            </View>
          </View>

          <View className="summary-compare">
            <Text className="summary-compare-text">
              {result.complianceStatus === 'compliant'
                ? `低于法定上限 ${(result.complianceLimit - result.irr).toFixed(2)} 个百分点`
                : result.complianceStatus === 'warning'
                  ? `接近法定上限，超出部分 ${result.excessInterest.toFixed(0)} 元`
                  : `超出法定上限 ${(result.irr - result.complianceLimit).toFixed(2)} 个百分点，超额利息 ${result.excessInterest.toFixed(0)} 元`}
            </Text>
          </View>
        </View>

        <View className="report-detail-card">
          <Text className="card-title">详细数据</Text>

          <View className="detail-grid">
            <View className="detail-item">
              <Text className="detail-item-value">¥{Math.round(params.principal).toLocaleString('zh-CN')}</Text>
              <Text className="detail-item-label">借款本金</Text>
            </View>
            <View className="detail-item">
              <Text className="detail-item-value">¥{Math.round(result.totalPayment).toLocaleString('zh-CN')}</Text>
              <Text className="detail-item-label">总还款额</Text>
            </View>
            <View className="detail-item">
              <Text className="detail-item-value">¥{Math.round(result.totalInterest).toLocaleString('zh-CN')}</Text>
              <Text className="detail-item-label">总利息</Text>
            </View>
            <View className="detail-item">
              <Text className="detail-item-value">{result.periods}期</Text>
              <Text className="detail-item-label">还款期数</Text>
            </View>
          </View>

          <View className="detail-row">
            <Text className="detail-label">名义年化利率 (APR)</Text>
            <Text className="detail-value">{result.nominalAPR.toFixed(2)}%</Text>
          </View>
          <View className="detail-row">
            <Text className="detail-label">实际年化利率 (IRR)</Text>
            <Text className="detail-value highlight">{result.irr.toFixed(2)}%</Text>
          </View>
          <View className="detail-row">
            <Text className="detail-label">法定上限</Text>
            <Text className="detail-value">{result.complianceLimit}%</Text>
          </View>
          {result.excessInterest > 0 && (
            <View className="detail-row excess">
              <Text className="detail-label">超额利息</Text>
              <Text className="detail-value" style={{ color: 'var(--color-excessive)' }}>
                ¥{Math.round(result.excessInterest).toLocaleString('zh-CN')}
              </Text>
            </View>
          )}
        </View>

        <View className="report-analysis-card">
          <Text className="card-title">合规分析</Text>

          <View className="analysis-section">
            <Text className="analysis-title">📊 利率合规判定</Text>
            <View className="analysis-content">
              <Text className="analysis-text">
                根据《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》，
                借贷利率不得超过合同成立时一年期LPR的4倍。当前计算结果显示：
              </Text>
              <View className="analysis-list">
                <Text className="analysis-item">• 合同利率：{result.nominalAPR.toFixed(2)}%</Text>
                <Text className="analysis-item">• 实际利率(IRR)：{result.irr.toFixed(2)}%</Text>
                <Text className="analysis-item">• 法定上限：{result.complianceLimit}%</Text>
              </View>
            </View>
          </View>

          <View className="analysis-section">
            <Text className="analysis-title">📝 判定结果</Text>
            <View className="analysis-content result-box" style={{ borderColor: status.color }}>
              <Text className="analysis-result" style={{ color: status.color }}>
                {result.complianceStatus === 'compliant'
                  ? '✅ 利率合规，未超出法定上限'
                  : result.complianceStatus === 'warning'
                    ? '⚠️ 利率偏高，接近法定上限，建议谨慎'
                    : '❌ 利率超额，超出法定上限部分不受法律保护'}
              </Text>
            </View>
          </View>

          <View className="analysis-section">
            <Text className="analysis-title">💡 建议</Text>
            <View className="analysis-content">
              <Text className="analysis-text">
                {result.complianceStatus === 'compliant'
                  ? '该贷款方案利率在合法范围内，可以考虑。建议仔细阅读合同条款，确认还款方式和费用明细。'
                  : result.complianceStatus === 'warning'
                    ? '该贷款方案利率接近法定上限，建议重新评估自身还款能力，并对比其他贷款产品。'
                    : '该贷款方案利率超过法定上限，超出部分利息不受法律保护。建议拒绝该方案，或与出借方协商降低利率。'}
              </Text>
            </View>
          </View>
        </View>

        {compareData.length > 0 && (
          <View className="report-compare-card">
            <Text className="card-title">对比参考</Text>
            <View className="compare-list">
              {compareData.map(item => (
                <View key={item.id} className="compare-mini-card">
                  <Text className="compare-mini-name">{item.platformName || '贷款'}</Text>
                  <Text className="compare-mini-irr">{item.result.irr.toFixed(2)}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="report-footer">
          <Text className="footer-text">报告生成时间：{reportData.timestamp ? formatDate(reportData.timestamp) : new Date().toLocaleString()}</Text>
          <Text className="footer-disclaimer">*本报告仅供参考，实际利率可能因还款方式、手续费等因素有所差异，请以合同条款为准。</Text>
        </View>
      </ScrollView>
    </View>
  )
}
