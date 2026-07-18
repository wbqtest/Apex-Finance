import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Button, Toast } from '@nutui/nutui-react-taro';
import { register } from '../../services/api';
import NavBar from '../../components/NavBar';
import './index.less';

export default function Register() {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');

  const SECURITY_QUESTIONS = [
    { value: '您的出生地是哪里？', label: '您的出生地是哪里？' },
    { value: '您的小学名称是什么？', label: '您的小学名称是什么？' },
    { value: '您的第一辆车是什么品牌？', label: '您的第一辆车是什么品牌？' },
    { value: '您的母亲的姓氏是什么？', label: '您的母亲的姓氏是什么？' },
    { value: '您最喜欢的电影是什么？', label: '您最喜欢的电影是什么？' },
    { value: 'custom', label: '自定义问题' },
  ];

  const handleRegister = async () => {
    if (!phone || !email || !password || !confirmPassword || !nickname) {
      Toast.show('', { content: '请填写完整信息', duration: 2000 });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Toast.show('', { content: '请输入正确的手机号', duration: 2000 });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Toast.show('', { content: '请输入正确的邮箱地址', duration: 2000 });
      return;
    }

    if (password.length < 6) {
      Toast.show('', { content: '密码至少6位', duration: 2000 });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show('', { content: '两次密码输入不一致', duration: 2000 });
      return;
    }

    const finalQuestion = securityQuestion === 'custom' ? customQuestion : securityQuestion;
    if (finalQuestion && !securityAnswer) {
      Toast.show('', { content: '请填写安全问题答案', duration: 2000 });
      return;
    }

    setLoading(true);
    try {
      await register({ phone, email, password, nickname, securityQuestion: finalQuestion, securityAnswer });
      Toast.show('', { content: '注册成功', duration: 2000 });
      setTimeout(() => {
        Taro.redirectTo({ url: '/pages/login' });
      }, 1500);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    Taro.redirectTo({ url: '/pages/login' });
  };

  return (
    <View className="register-container">
      <NavBar title="" />
      <View className="bg-gradient" />
      <View className="register-card">
        <View className="card-header">
          <View className="logo">
            <Text className="logo-text">T</Text>
          </View>
          <Text className="title">创建账号</Text>
          <Text className="subtitle">注册后即可使用全部功能</Text>
        </View>

        <View className="register-form">
          <View className="form-item">
            <Text className="label">昵称</Text>
            <View className="input-wrapper">
              <Text className="input-icon">👤</Text>
              <Input
                type="text"
                placeholder="请输入昵称"
                value={nickname}
                onChange={(value) => setNickname(value)}
                maxLength={20}
                className="register-input"
              />
            </View>
          </View>

          <View className="form-item">
            <Text className="label">手机号</Text>
            <View className="input-wrapper">
              <Text className="input-icon">📱</Text>
              <Input
                type="number"
                placeholder="请输入手机号"
                value={phone}
                onChange={(value) => setPhone(value)}
                maxLength={11}
                className="register-input"
              />
            </View>
          </View>

          <View className="form-item">
            <Text className="label">邮箱</Text>
            <View className="input-wrapper">
              <Text className="input-icon">✉️</Text>
              <Input
                type="text"
                placeholder="请输入邮箱地址"
                value={email}
                onChange={(value) => setEmail(value)}
                className="register-input"
              />
            </View>
          </View>

          <View className="form-item">
            <Text className="label">密码</Text>
            <View className="input-wrapper">
              <Text className="input-icon">🔒</Text>
              <Input
                type="password"
                placeholder="请输入密码（至少6位）"
                value={password}
                onChange={(value) => setPassword(value)}
                className="register-input"
              />
              <Text className="toggle-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '👁️' : '🙈'}</Text>
            </View>
          </View>

          <View className="form-item">
            <Text className="label">确认密码</Text>
            <View className="input-wrapper">
              <Text className="input-icon">🔑</Text>
              <Input
                type="password"
                placeholder="请再次输入密码"
                value={confirmPassword}
                onChange={(value) => setConfirmPassword(value)}
                className="register-input"
              />
              <Text className="toggle-password" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? '👁️' : '🙈'}</Text>
            </View>
          </View>

          <View className="form-item">
            <Text className="label">安全问题（选填）</Text>
            <View className="question-select">
              {SECURITY_QUESTIONS.map((q) => (
                <View
                  key={q.value}
                  className={`question-option ${securityQuestion === q.value ? 'active' : ''}`}
                  onClick={() => setSecurityQuestion(q.value)}
                >
                  <Text className="option-text">{q.label}</Text>
                </View>
              ))}
            </View>
            {securityQuestion === 'custom' && (
              <View className="input-wrapper">
                <Text className="input-icon">❓</Text>
                <Input
                  type="text"
                  placeholder="请输入自定义安全问题"
                  value={customQuestion}
                  onChange={(value) => setCustomQuestion(value)}
                  className="register-input"
                />
              </View>
            )}
          </View>

          {securityQuestion && securityQuestion !== 'custom' && (
            <View className="form-item">
              <Text className="label">安全问题答案</Text>
              <View className="input-wrapper">
                <Text className="input-icon">🔑</Text>
                <Input
                  type="text"
                  placeholder="请输入安全问题答案"
                  value={securityAnswer}
                  onChange={(value) => setSecurityAnswer(value)}
                  className="register-input"
                />
              </View>
            </View>
          )}

          {securityQuestion === 'custom' && customQuestion && (
            <View className="form-item">
              <Text className="label">安全问题答案</Text>
              <View className="input-wrapper">
                <Text className="input-icon">🔑</Text>
                <Input
                  type="text"
                  placeholder="请输入安全问题答案"
                  value={securityAnswer}
                  onChange={(value) => setSecurityAnswer(value)}
                  className="register-input"
                />
              </View>
            </View>
          )}

          <Button
            type="primary"
            size="large"
            loading={loading}
            disabled={loading}
            onClick={handleRegister}
            className="register-btn"
          >
            {loading ? '注册中...' : '注 册'}
          </Button>

          <View className="login-link">
            <Text>已有账号？</Text>
            <Text className="link" onClick={goToLogin}>立即登录</Text>
          </View>
        </View>
      </View>

      <View className="footer">
        <Text className="copyright">© 2026 Taro多端应用</Text>
      </View>
    </View>
  );
}
