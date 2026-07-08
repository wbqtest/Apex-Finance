import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Button, Cell, CellGroup, Dialog } from '@nutui/nutui-react-taro';
import { getLatestLPR, formatLPRDate, LPR_HISTORY } from '../../data/lpr';
import { clearAllLocalData } from '../../utils/storage';
import CustomTabBar from '../../components/CustomTabBar/custom-tab-bar';
import './index.less';

export default function Settings() {
  const [currentLPR, setCurrentLPR] = useState(getLatestLPR());
  const [customLPR, setCustomLPR] = useState('');
  const [showLPRHistory, setShowLPRHistory] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const handleUpdateLPR = () => {
    const value = parseFloat(customLPR);

    if (isNaN(value) || value <= 0 || value > 50) {
      Taro.showToast({ title: '请输入有效的LPR值(0-50)', icon: 'none', duration: 2000 });
      return;
    }

    setCurrentLPR({
      date: currentLPR.date,
      value: value,
    });

    setCustomLPR('');
    Taro.showToast({ title: 'LPR已更新', icon: 'success', duration: 2000 });
  };

  const handleResetLPR = () => {
    setCurrentLPR(getLatestLPR());
    Taro.showToast({ title: '已恢复默认LPR', icon: 'success', duration: 2000 });
  };

  const handleClearData = () => {
    setShowClearDialog(true);
  };

  const handleConfirmClear = () => {
    clearAllLocalData();
    setShowClearDialog(false);
    Taro.showToast({ title: '数据已清除', icon: 'success' });
  };

  return (
    <View className="settings-container">
      <View className="settings-header">
        <Text className="settings-title">设置</Text>
      </View>

      <View className="lpr-card">
        <View className="lpr-current">
          <Text className="lpr-label">当前LPR</Text>
          <Text className="lpr-value">{currentLPR.value}%</Text>
          <Text className="lpr-date">{formatLPRDate(currentLPR.date)}</Text>
        </View>

        <View className="lpr-update">
          <Text className="update-label">手动修改LPR</Text>
          <View className="update-input-wrapper">
            <Input
              type="digit"
              value={customLPR}
              placeholder="输入LPR值(如3.10)"
              onChange={(value) => setCustomLPR(value)}
              className="update-input"
            />
            <Text className="update-suffix">%</Text>
          </View>
          <View className="update-buttons">
            <Button size="small" className="confirm-btn" onClick={handleUpdateLPR}>
              确认修改
            </Button>
            <Button size="small" className="reset-btn" onClick={handleResetLPR}>
              恢复默认
            </Button>
          </View>
        </View>
      </View>

      <View className="history-card">
        <Button onClick={() => setShowLPRHistory(!showLPRHistory)} className="history-toggle">
          {showLPRHistory ? '收起历史' : '查看LPR历史'}
        </Button>

        {showLPRHistory && (
          <View className="lpr-history">
            {LPR_HISTORY.slice(0, 12).map((record) => (
              <Cell
                key={record.date}
                title={<Text className="history-date">{formatLPRDate(record.date)}</Text>}
                extra={<Text className="history-value">{record.value}%</Text>}
                border={false}
              />
            ))}
          </View>
        )}
      </View>

      <View className="about-card">
        <Cell title="版本号" extra="v1.0.0" border={false} />
        <Cell title="数据更新时间" extra={formatLPRDate(currentLPR.date)} border={false} />
        <Cell
          title="用户协议"
          extra={<Text className="menu-arrow">›</Text>}
          border={false}
          onClick={() => Taro.navigateTo({ url: '/pages/agreement' })}
        />
      </View>

      <View className="data-card">
        <Button size="large" className="clear-btn" onClick={handleClearData}>
          🗑️ 清除所有本地数据
        </Button>
        <Text className="data-hint">清除后将删除历史记录和草稿，此操作不可恢复</Text>
      </View>

      <View className="disclaimer-card">
        <Text className="disclaimer-title">免责声明</Text>
        <Text className="disclaimer-text">
          本工具仅供参考，不构成法律意见。利率上限标准因地区和案件具体情况存在差异，具体以司法机关认定为准。
        </Text>
        <Text className="disclaimer-text">
          LPR数据来源于全国银行间同业拆借中心，本工具内置的历史数据仅供参考，如需最新准确数据请访问官方渠道查询。
        </Text>
      </View>

      <CustomTabBar />

      <Dialog
        visible={showClearDialog}
        title="确认清除"
        confirmText="确定清除"
        cancelText="取消"
        onConfirm={() => {
          handleConfirmClear();
          setShowClearDialog(false);
        }}
        onCancel={() => setShowClearDialog(false)}
      >
        确定要清除所有本地数据吗？此操作将删除历史记录和草稿，且不可恢复。
      </Dialog>
    </View>
  );
}
