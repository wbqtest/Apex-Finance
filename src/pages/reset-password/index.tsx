import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Input, Button } from '@nutui/nutui-react-taro';
import { resetPassword } from '../../services/api';
import './index.less';

export default function ResetPassword() {
  const [userId, setUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useDidShow(() => {
    // 跨端兼容：统一通过 Taro 路由参数获取 userId
    // H5 环境也可通过页面 query 拿到参数，不再依赖 window.location / URLSearchParams
    try {
      const pages = Taro.getCurrentPages();
      if (pages.length > 0) {
        const currentPage = pages[pages.length - 1];
        const options = (currentPage as any)?.options || {};
        console.log('[ResetPassword] page options:', options);
        if (options.userId) {
          setUserId(parseInt(options.userId, 10));
          return;
        }
      }
    } catch (e) {
      console.error('获取页面参数失败:', e);
    }

    // H5 兜底：部分场景下路由参数挂在 router 上
    try {
      const router = Taro.getCurrentInstance();
      const params = (router as any)?.router?.params || {};
      if (params.userId) {
        setUserId(parseInt(params.userId, 10));
      }
    } catch (e) {
      // ignore
    }
  });

  const handleReset = async () => {
    if (!newPassword) {
      Taro.showToast({ title: '请输入新密码', icon: 'none', duration: 2000 });
      return;
    }

    if (newPassword.length < 6) {
      Taro.showToast({ title: '密码至少6位', icon: 'none', duration: 2000 });
      return;
    }

    if (newPassword !== confirmPassword) {
      Taro.showToast({ title: '两次密码输入不一致', icon: 'none', duration: 2000 });
      return;
    }

    if (!userId) {
      Taro.showToast({ title: '缺少用户信息', icon: 'none', duration: 2000 });
      return;
    }

    console.log('[ResetPassword] handleReset - userId:', userId);

    setLoading(true);
    try {
      await resetPassword({ userId, newPassword });
      Taro.showToast({ title: '密码重置成功', icon: 'none', duration: 2000 });
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages/login' });
      }, 1500);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    Taro.redirectTo({ url: '/pages/login' });
  };

  return (
    <View className="reset-password-container">
      <View className="bg-gradient" />

      <View className="reset-card">
        <View className="card-header">
          <Text className="back-btn" onClick={goBack}>‹</Text>
          <View className="header-content">
            <Text className="title">重置密码</Text>
            <Text className="subtitle">设置新的登录密码</Text>
          </View>
          <View className="header-placeholder" />
        </View>

        <View className="reset-form">
          <View className="form-group">
            <Text className="label">新密码</Text>
            <View className="input-wrapper">
              <Text className="input-icon">🔒</Text>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="请输入新密码（至少6位）"
                value={newPassword}
                onChange={(value) => setNewPassword(value)}
                className="reset-input"
              />
              <Text className="toggle-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '👁️' : '🙈'}</Text>
            </View>
          </View>

          <View className="form-group">
            <Text className="label">确认密码</Text>
            <View className="input-wrapper">
              <Text className="input-icon">🔑</Text>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="请再次输入新密码"
                value={confirmPassword}
                onChange={(value) => setConfirmPassword(value)}
                className="reset-input"
              />
              <Text className="toggle-password" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? '👁️' : '🙈'}</Text>
            </View>
          </View>

          <Button
            type="primary"
            size="large"
            loading={loading}
            disabled={loading}
            onClick={handleReset}
            className="reset-btn"
          >
            {loading ? '重置中...' : '确认重置'}
          </Button>

          <View className="password-tips">
            <Text className="tips-title">💡 密码安全提示</Text>
            <Text className="tips-item">• 建议使用8位以上的复杂密码</Text>
            <Text className="tips-item">• 包含字母、数字和特殊字符</Text>
            <Text className="tips-item">• 不要使用生日、手机号等容易猜测的信息</Text>
          </View>
        </View>
      </View>

      <View className="footer">
        <Text className="copyright">© 2026 Taro多端应用</Text>
      </View>
    </View>
  );
}
