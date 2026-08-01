import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Button } from '@nutui/nutui-react-taro';
import { login } from '../../services/api';
import NavBar from '../../components/NavBar';
import './index.less';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none', duration: 2000 });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none', duration: 2000 });
      return;
    }

    setLoading(true);
    try {
      await login({ phone, password });
      Taro.showToast({ title: '登录成功', icon: 'none', duration: 2000 });
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/mine' });
      }, 1500);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => {
    Taro.navigateTo({ url: '/pages/register' });
  };

  const goToForgotPassword = () => {
    Taro.navigateTo({ url: '/pages/forgot-password' });
  };

  return (
    <View className="login-container">
      <NavBar title="" />
      <View className="bg-gradient" />

      <View className="login-card">
        <View className="card-header">
          <View className="logo">
            <Text className="logo-icon">T</Text>
          </View>
          <Text className="title">欢迎回来</Text>
          <Text className="subtitle">登录您的账号</Text>
        </View>

        <View className="login-form">
          <View className="form-group">
            <View className="input-wrapper">
              <Text className="input-icon">📱</Text>
              <Input
                type="number"
                placeholder="手机号"
                value={phone}
                onChange={(value) => setPhone(value)}
                maxlength={11}
                className="login-input"
              />
            </View>
          </View>

          <View className="form-group">
            <View className="input-wrapper">
              <Text className="input-icon">🔒</Text>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="密码"
                value={password}
                onChange={(value) => setPassword(value)}
                className="login-input"
              />
              <Text className="toggle-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '👁️' : '🙈'}</Text>
            </View>
          </View>

          <Button
            type="primary"
            size="large"
            loading={loading}
            disabled={loading}
            onClick={handleLogin}
            className="login-btn"
          >
            {loading ? '登录中...' : '登 录'}
          </Button>

          <View className="forgot-password-link">
            <Text className="forgot-link" onClick={goToForgotPassword}>忘记密码？</Text>
          </View>
        </View>

        <View className="divider">
          <View className="divider-line" />
          <Text className="divider-text">其他方式</Text>
          <View className="divider-line" />
        </View>

        <View className="social-buttons">
          <View className="social-btn">
            <Text className="social-icon">💬</Text>
          </View>
          <View className="social-btn">
            <Text className="social-icon">🐧</Text>
          </View>
          <View className="social-btn">
            <Text className="social-icon">📧</Text>
          </View>
        </View>

        <View className="register-area">
          <Text className="register-text">还没有账号？</Text>
          <Text className="register-link" onClick={goToRegister}>立即注册</Text>
        </View>
      </View>

      <View className="footer">
        <Text className="copyright">© 2026 Taro多端应用</Text>
      </View>
    </View>
  );
}
