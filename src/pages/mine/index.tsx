import { View, Text } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { Cell, CellGroup, Button, Dialog, Input, Toast } from '@nutui/nutui-react-taro';
import { getToken, getUserInfo as getStorageUserInfo, UserInfo, getHistory, removeHistoryItem, clearHistory, CalcHistoryItem, clearLoginInfo, setUserInfo } from '../../utils/storage';
import { updateNickname } from '../../services/api';
import { ThemeName, themes, applyTheme, saveTheme, getTheme, themeDisplayNames } from '../../utils/theme';
import CustomTabBar from '../../components/CustomTabBar/custom-tab-bar';
import './index.less';

const menuItems = [
  { icon: '📊', title: '理财计算', url: '/pages/index' },
  { icon: '📜', title: '计算历史', url: '', action: 'history' },
  { icon: '🎨', title: '主题切换', url: '', action: 'theme' },
  { icon: '🖼️', title: '新建图片信息', url: '' },
  { icon: '👤', title: '个人中心', url: '/pages/profile' },
  { icon: '💬', title: '联系客服', url: '' },
  { icon: 'ℹ️', title: '关于我们', url: '' },
  { icon: '🔒', title: '隐私政策', url: '' },
  { icon: '📝', title: '用户协议', url: '/pages/agreement' },
];

export default function Mine() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string>('');
  const [historyList, setHistoryList] = useState<CalcHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('coral-pink');

  useEffect(() => {
    const token = getToken();
    const info = getStorageUserInfo();
    if (token && info) {
      setIsLoggedIn(true);
      setUserInfo(info);
    }
    setCurrentTheme(getTheme());
  }, []);

  const loadHistory = () => {
    const history = getHistory();
    setHistoryList(history);
    setShowHistory(true);
  };

  const handleDeleteHistory = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetId) {
      removeHistoryItem(deleteTargetId);
      setHistoryList(getHistory());
    }
    setShowDeleteDialog(false);
    Taro.showToast({ title: '已删除', icon: 'success' });
  };

  const handleClearAll = () => {
    setShowClearDialog(true);
  };

  const handleConfirmClear = () => {
    clearHistory();
    setHistoryList([]);
    setShowHistory(false);
    setShowClearDialog(false);
    Taro.showToast({ title: '已清空', icon: 'success' });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleLogin = () => {
    Taro.navigateTo({ url: '/pages/login' });
  };

  const handleMenuClick = (item: typeof menuItems[0]) => {
    if (item.action === 'history') {
      loadHistory();
      return;
    }
    if (item.action === 'theme') {
      setShowThemeDialog(true);
      return;
    }
    if (!item.url) {
      Toast.show('', { content: '功能开发中', duration: 2000 });
      return;
    }
    Taro.navigateTo({ url: item.url });
  };

  const handleThemeChange = (themeName: ThemeName) => {
    applyTheme(themeName);
    saveTheme(themeName);
    setCurrentTheme(themeName);
    Taro.showToast({ title: '主题已切换', icon: 'success', duration: 2000 });
    setShowThemeDialog(false);
  };

  const handleOpenVIP = () => {
    Toast.show('', { content: '会员功能开发中', duration: 2000 });
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = () => {
    clearLoginInfo();
    setIsLoggedIn(false);
    setUserInfo(null);
    Taro.showToast({ title: '已退出登录', icon: 'success', duration: 2000 });
    setShowLogoutDialog(false);
  };

  const handleOpenEdit = () => {
    if (userInfo) {
      setEditNickname(userInfo.nickname || '');
      setEditDesc(userInfo.phone || '');
      setShowEditDialog(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editNickname.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none', duration: 2000 });
      return;
    }

    try {
      await updateNickname({ nickname: editNickname.trim() });
      const updatedInfo = { ...userInfo, nickname: editNickname.trim() };
      setUserInfo(updatedInfo);
      setUserInfo(updatedInfo);
      Taro.showToast({ title: '修改成功', icon: 'success', duration: 2000 });
      setShowEditDialog(false);
    } catch (error: any) {
      Taro.showToast({ title: error.message || '修改失败', icon: 'none', duration: 2000 });
    }
  };

  return (
    <View className="mine-container">
      <View className="mine-header">
        <View className="user-section" onClick={isLoggedIn ? handleOpenEdit : handleLogin}>
          {isLoggedIn ? (
            <Text className="avatar-text">{userInfo?.nickname?.charAt(0) || 'U'}</Text>
          ) : (
            <Text className="avatar-icon">👤</Text>
          )}
          <View className="user-info">
            <Text className="user-name">{isLoggedIn ? userInfo?.nickname : '点我登录'}</Text>
            <Text className="user-desc">{isLoggedIn ? (userInfo?.phone || '普通会员') : '登录后享受更多功能'}</Text>
          </View>
          {isLoggedIn && (
            <Text className="edit-icon">✏️</Text>
          )}
        </View>
      </View>

      <View className="vip-banner" onClick={handleOpenVIP}>
        <View className="vip-content">
          <Text className="vip-icon">👑</Text>
          <Text className="vip-text">开通会员，尊享特权</Text>
          <View className="vip-btn">
            <Text className="vip-btn-text">立即开通</Text>
            <Text className="vip-arrow">›</Text>
          </View>
        </View>
      </View>

      <View className="menu-card">
        <CellGroup border={false}>
          {menuItems.map((item, index) => (
            <Cell
              key={index}
              title={
                <View className="menu-cell-title">
                  <Text className="menu-icon">{item.icon}</Text>
                  <Text className="menu-title">{item.title}</Text>
                </View>
              }
              extra={<Text className="menu-arrow">›</Text>}
              onClick={() => handleMenuClick(item)}
              className="menu-cell"
            />
          ))}
        </CellGroup>
      </View>

      {showHistory && (
        <View className="history-card">
          <View className="history-header">
            <Text className="history-title">计算历史</Text>
            <Button type="default" size="small" onClick={handleClearAll} className="clear-btn">
              清空
            </Button>
          </View>
          {historyList.length === 0 ? (
            <View className="history-empty">
              <Text className="history-empty-text">暂无计算记录</Text>
            </View>
          ) : (
            <CellGroup border={false} className="history-list">
              {historyList.map((item) => (
                <Cell key={item.id} className="history-item">
                  <View className="history-content">
                    <View className="history-main">
                      <Text className="history-principal">本金 ¥{(item.params.principal || 0).toFixed(0)}</Text>
                      <Text className="history-date">{formatDate(item.timestamp)}</Text>
                    </View>
                    <View className="history-result">
                      <Text className={`history-irr ${(item.result?.irr || 0) > 24 ? 'irr-high' : ''}`}>
                        IRR {((item.result?.irr || 0) * 100).toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                  <View className="history-actions">
                    <Button type="default" size="mini" onClick={() => handleDeleteHistory(item.id)}>
                      删除
                    </Button>
                  </View>
                </Cell>
              ))}
            </CellGroup>
          )}
        </View>
      )}

      {isLoggedIn && (
        <View className="logout-card">
          <Button className="logout-btn" type="danger" size="large" onClick={handleLogout}>
            退出登录
          </Button>
        </View>
      )}

      <CustomTabBar />

      <Dialog
        visible={showLogoutDialog}
        title="提示"
        confirmText="确定"
        cancelText="取消"
        onConfirm={() => {
          handleLogoutConfirm();
          setShowLogoutDialog(false);
        }}
        onCancel={() => setShowLogoutDialog(false)}
      >
        确定要退出登录吗？
      </Dialog>

      <Dialog
        visible={showDeleteDialog}
        title="确认删除"
        confirmText="确定"
        cancelText="取消"
        onConfirm={() => {
          handleConfirmDelete();
          setShowDeleteDialog(false);
        }}
        onCancel={() => setShowDeleteDialog(false)}
      >
        确定要删除这条记录吗？
      </Dialog>

      <Dialog
        visible={showClearDialog}
        title="确认清空"
        confirmText="确定"
        cancelText="取消"
        onConfirm={() => {
          handleConfirmClear();
          setShowClearDialog(false);
        }}
        onCancel={() => setShowClearDialog(false)}
      >
        确定要清空所有历史记录吗？此操作不可恢复。
      </Dialog>

      <Dialog
        visible={showEditDialog}
        title="编辑资料"
        confirmText="保存"
        cancelText="取消"
        onConfirm={handleSaveEdit}
        onCancel={() => setShowEditDialog(false)}
      >
        <View className="edit-form">
          <View className="edit-item">
            <Text className="edit-label">昵称</Text>
            <Input
              value={editNickname}
              onChange={(value) => setEditNickname(value)}
              placeholder="请输入昵称"
              className="edit-input"
            />
          </View>
          <View className="edit-item">
            <Text className="edit-label">手机号</Text>
            <Input
              value={editDesc}
              onChange={(value) => setEditDesc(value)}
              placeholder="请输入手机号"
              className="edit-input"
              disabled
            />
          </View>
        </View>
      </Dialog>

      <Dialog
        visible={showThemeDialog}
        title="主题切换"
        cancelText="关闭"
        onCancel={() => setShowThemeDialog(false)}
      >
        <View className="theme-list">
          {(Object.keys(themes) as ThemeName[]).map((themeName) => {
            const theme = themes[themeName];
            const isSelected = currentTheme === themeName;
            return (
              <View
                key={themeName}
                className={`theme-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleThemeChange(themeName)}
              >
                <View className="theme-preview">
                  <View
                    className="theme-color"
                    style={{ backgroundColor: theme.brandPrimary }}
                  />
                  <View
                    className="theme-color-light"
                    style={{ backgroundColor: theme.brandPrimaryLight }}
                  />
                  <View
                    className="theme-color-pale"
                    style={{ backgroundColor: theme.brandPrimaryPale }}
                  />
                </View>
                <View className="theme-info">
                  <Text className="theme-name">{themeDisplayNames[themeName]}</Text>
                  <Text className="theme-desc">
                    {themeName === 'finance-blue' && '专业金融风格，推荐使用'}
                    {themeName === 'dark-green' && '沉稳墨绿风格'}
                    {themeName === 'deep-space' && '深空灰配金色点缀'}
                    {themeName === 'vibrant-orange' && '年轻行动导向，活力满满'}
                    {themeName === 'vibrant-purple' && '潮流科技感，辨识度高'}
                    {themeName === 'coral-pink' && '温暖亲和力，降低心理防备'}
                    {themeName === 'cyan' && '清新科技感，冷静但不冰冷'}
                  </Text>
                </View>
                {isSelected && <Text className="theme-check">✓</Text>}
              </View>
            );
          })}
        </View>
      </Dialog>
    </View>
  );
}
