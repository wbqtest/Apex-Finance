import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Input, Button, Cell, CellGroup } from '@nutui/nutui-react-taro';
import { SafeDialog } from '../../components/SafeDialog';
import { SafeToast } from '../../components/SafeToast';

import { getUserInfo, updateNickname, changePassword, logout, UserInfo } from '../../services/api';
import { getToken, getUserInfo as getStorageUserInfo, setUserInfo, clearLoginInfo } from '../../utils/storage';
import { GRADIENTS } from '../../data/templates';
import './index.less';

const getGradientByNickname = (nickname: string): string => {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  const colors = GRADIENTS[index];
  return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
};

export default function Profile() {
  const [userInfo, setUserInfoState] = useState<UserInfo | null>(null);
  const [showEditNickname, setShowEditNickname] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const fetchUserInfo = async () => {
    try {
      const info = await getUserInfo();
      setUserInfoState(info);
    } catch (error) {
      console.error('获取用户信息失败', error);
    }
  };

  useDidShow(() => {
    fetchUserInfo();
  });

  const handleBack = () => {
    const pages = Taro.getCurrentPages();
    if (pages.length > 1) {
      Taro.navigateBack();
    } else {
      Taro.switchTab({ url: '/pages/index' });
    }
  };

  const handleEditNickname = async () => {
    if (!newNickname.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none', duration: 2000 });
      return;
    }
    if (newNickname.length > 20) {
      Taro.showToast({ title: '昵称不能超过20个字符', icon: 'none', duration: 2000 });
      return;
    }
    setLoading(true);
    try {
      await updateNickname(newNickname);
      setUserInfoState({ ...userInfo!, nickname: newNickname });
      setShowEditNickname(false);
      setNewNickname('');
      Taro.showToast({ title: '修改成功', icon: 'none', duration: 2000 });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none', duration: 2000 });
      return;
    }
    if (newPassword.length < 6) {
      Taro.showToast({ title: '新密码至少6位', icon: 'none', duration: 2000 });
      return;
    }
    if (newPassword !== confirmPassword) {
      Taro.showToast({ title: '两次密码输入不一致', icon: 'none', duration: 2000 });
      return;
    }
    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setShowChangePassword(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Taro.showToast({ title: '修改成功', icon: 'none', duration: 2000 });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      Taro.showToast({ title: '已退出登录', icon: 'none', duration: 2000 });
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages/login' });
      }, 1500);
    } catch (error: any) {
      clearLoginInfo();
      Taro.redirectTo({ url: '/pages/login' });
    }
    setShowLogoutDialog(false);
  };

  if (!userInfo) {
    return (
      <View className="profile-container">
        <View className="profile-header">
          <Text className="back-btn" onClick={handleBack}>‹</Text>
          <Text className="profile-title">个人中心</Text>
        </View>
        <View className="loading">加载中...</View>
      </View>
    );
  }

  return (
    <View className="profile-container">
      <View className="profile-header">
        <Button type="default" shape="round" size="small" className="back-btn" onClick={handleBack}>
          <Text className="back-icon">‹</Text>
        </Button>
        <Text className="profile-title">个人中心</Text>
      </View>

      <View className="profile-card">
        <Cell className="user-cell">
          <View className="avatar" style={{ background: getGradientByNickname(userInfo.nickname) }}>
            <Text className="avatar-text">{userInfo.nickname.charAt(0)}</Text>
          </View>
          <View className="user-info">
            <Text className="user-name">{userInfo.nickname}</Text>
            <Text className="user-phone">{userInfo.phone}</Text>
          </View>
        </Cell>
      </View>

      <View className="menu-card">
        <CellGroup border={false}>
          <Cell
            title="编辑昵称"
            extra={<Text className="menu-arrow">›</Text>}
            onClick={() => setShowEditNickname(true)}
          />
          <Cell
            title="修改密码"
            extra={<Text className="menu-arrow">›</Text>}
            onClick={() => setShowChangePassword(true)}
          />
          <Cell
            title="用户协议"
            extra={<Text className="menu-arrow">›</Text>}
            onClick={() => Taro.navigateTo({ url: '/pages/agreement' })}
          />
          <Cell
            title="退出登录"
            extra={<Text className="menu-arrow">›</Text>}
            onClick={handleLogout}
          />
        </CellGroup>
      </View>

      <SafeDialog
        visible={showEditNickname}
        title="编辑昵称"
        onClose={() => { setShowEditNickname(false); setNewNickname(''); }}
        confirmText="确定"
        cancelText="取消"
        onConfirm={handleEditNickname}
      >
        <Cell border={false}>
          <Input
            type="text"
            placeholder="请输入新昵称"
            value={newNickname}
            onChange={(value) => setNewNickname(value)}
            maxlength={20}
          />
        </Cell>
      </SafeDialog>

      <SafeDialog
        visible={showChangePassword}
        title="修改密码"
        onClose={() => { setShowChangePassword(false); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); }}
        confirmText="确定"
        cancelText="取消"
        onConfirm={handleChangePassword}
      >
        <View className="password-form">
          <Cell border={false}>
            <Input
              type="password"
              placeholder="旧密码"
              value={oldPassword}
              onChange={(value) => setOldPassword(value)}
            />
          </Cell>
          <Cell border={false}>
            <Input
              type="password"
              placeholder="新密码"
              value={newPassword}
              onChange={(value) => setNewPassword(value)}
            />
          </Cell>
          <Cell border={false}>
            <Input
              type="password"
              placeholder="确认新密码"
              value={confirmPassword}
              onChange={(value) => setConfirmPassword(value)}
            />
          </Cell>
        </View>
      </SafeDialog>

      <SafeDialog
        visible={showLogoutDialog}
        title="提示"
        content="确定要退出登录吗？"
        onClose={() => setShowLogoutDialog(false)}
        confirmText="确定"
        cancelText="取消"
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </View>
  );
}
