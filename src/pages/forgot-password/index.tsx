import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Input, Button } from '@nutui/nutui-react-taro';
import { sendResetEmail, verifyEmailCode, getSecurityQuestion, verifySecurityAnswer } from '../../services/api';
import './index.less';

type ResetMode = 'email' | 'security';

export default function ForgotPassword() {
  const [resetMode, setResetMode] = useState<ResetMode>('email');
  const [email, setEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [phone, setPhone] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendEmail = async () => {
    if (!email) {
      Taro.showToast({ title: '请输入邮箱', icon: 'none', duration: 2000 });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Taro.showToast({ title: '请输入正确的邮箱格式', icon: 'none', duration: 2000 });
      return;
    }

    setLoading(true);
    try {
      await sendResetEmail({ email });
      Taro.showToast({ title: '验证码已发送，请查收邮件', icon: 'none', duration: 2000 });
      setStep(2);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verifyCode) {
      Taro.showToast({ title: '请输入验证码', icon: 'none', duration: 2000 });
      return;
    }

    if (verifyCode.length !== 6) {
      Taro.showToast({ title: '请输入6位验证码', icon: 'none', duration: 2000 });
      return;
    }

    setLoading(true);
    try {
      const result = await verifyEmailCode({ email, code: verifyCode });
      const userId = result.data?.userId;
      console.log('[ForgotPassword] 验证成功，跳转重置密码页，userId:', userId);
      Taro.redirectTo({ url: `/pages/reset-password?userId=${userId}` });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleGetQuestion = async () => {
    if (!phone) {
      Taro.showToast({ title: '请输入手机号', icon: 'none', duration: 2000 });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none', duration: 2000 });
      return;
    }

    setLoading(true);
    try {
      const result = await getSecurityQuestion({ phone });
      setSecurityQuestion(result.data?.securityQuestion || '');
      setStep(2);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAnswer = async () => {
    if (!securityAnswer) {
      Taro.showToast({ title: '请输入安全问题答案', icon: 'none', duration: 2000 });
      return;
    }

    setLoading(true);
    try {
      const result = await verifySecurityAnswer({ phone, answer: securityAnswer });
      const userId = result.data?.userId;
      console.log('[ForgotPassword] 安全问题验证成功，跳转重置密码页，userId:', userId);
      Taro.redirectTo({ url: `/pages/reset-password?userId=${userId}` });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    Taro.navigateBack({
      fail: () => {
        Taro.redirectTo({ url: '/pages/login' });
      }
    });
  };

  const SECURITY_QUESTIONS = [
    '您的出生地是哪里？',
    '您的小学名称是什么？',
    '您的第一辆车是什么品牌？',
    '您的母亲的姓氏是什么？',
    '您最喜欢的电影是什么？',
    '自定义问题',
  ];

  return (
    <View className="forgot-password-container">
      <View className="bg-gradient" />

      <View className="forgot-card">
        <View className="card-header">
          <Text className="back-btn" onClick={goBack}>‹</Text>
          <View className="header-content">
            <Text className="title">找回密码</Text>
            <Text className="subtitle">选择找回方式</Text>
          </View>
          <View className="header-placeholder" />
        </View>

        {step === 1 && (
          <View className="mode-select">
            <View
              className={`mode-card ${resetMode === 'email' ? 'active' : ''}`}
              onClick={() => setResetMode('email')}
            >
              <Text className="mode-icon">📧</Text>
              <Text className="mode-title">邮箱找回</Text>
              <Text className="mode-desc">通过注册邮箱接收重置链接</Text>
            </View>
            <View
              className={`mode-card ${resetMode === 'security' ? 'active' : ''}`}
              onClick={() => setResetMode('security')}
            >
              <Text className="mode-icon">🔒</Text>
              <Text className="mode-title">安全问题</Text>
              <Text className="mode-desc">通过注册时设置的安全问题验证</Text>
            </View>
          </View>
        )}

        <View className="forgot-form">
          {resetMode === 'email' && step === 1 && (
            <>
              <View className="form-group">
                <View className="input-wrapper">
                  <Text className="input-icon">📧</Text>
                  <Input
                    type="text"
                    placeholder="请输入注册邮箱"
                    value={email}
                    onChange={(value) => setEmail(value)}
                    className="forgot-input"
                  />
                </View>
              </View>
              <Button
                type="primary"
                size="large"
                loading={loading}
                disabled={loading}
                onClick={handleSendEmail}
                className="forgot-btn"
              >
                {loading ? '发送中...' : '发送验证码'}
              </Button>
            </>
          )}

          {resetMode === 'email' && step === 2 && (
            <>
              <View className="form-group">
                <View className="input-wrapper">
                  <Text className="input-icon">🔢</Text>
                  <Input
                    type="number"
                    placeholder="请输入验证码"
                    value={verifyCode}
                    onChange={(value) => setVerifyCode(value)}
                    maxlength={6}
                    className="forgot-input"
                  />
                </View>
                <Button
                  type="text"
                  size="small"
                  disabled={countdown > 0}
                  onClick={handleSendEmail}
                  className="resend-btn"
                >
                  {countdown > 0 ? `${countdown}秒后重新发送` : '重新发送'}
                </Button>
              </View>
              <Button
                type="primary"
                size="large"
                loading={loading}
                disabled={loading}
                onClick={handleVerifyCode}
                className="forgot-btn"
              >
                {loading ? '验证中...' : '验证并重置'}
              </Button>
              <Button
                type="default"
                size="small"
                onClick={() => { setStep(1); setVerifyCode(''); setCountdown(0); }}
                className="switch-btn"
              >
                返回重新输入
              </Button>
            </>
          )}

          {resetMode === 'security' && step === 1 && (
            <>
              <View className="form-group">
                <View className="input-wrapper">
                  <Text className="input-icon">📱</Text>
                  <Input
                    type="number"
                    placeholder="请输入注册手机号"
                    value={phone}
                    onChange={(value) => setPhone(value)}
                    maxlength={11}
                    className="forgot-input"
                  />
                </View>
              </View>
              <Button
                type="primary"
                size="large"
                loading={loading}
                disabled={loading}
                onClick={handleGetQuestion}
                className="forgot-btn"
              >
                {loading ? '获取中...' : '获取安全问题'}
              </Button>
            </>
          )}

          {resetMode === 'security' && step === 2 && securityQuestion && (
            <>
              <View className="security-question-box">
                <Text className="question-label">安全问题</Text>
                <Text className="question-text">{securityQuestion}</Text>
              </View>
              <View className="form-group">
                <View className="input-wrapper">
                  <Text className="input-icon">🔑</Text>
                  <Input
                    type="text"
                    placeholder="请输入安全问题答案"
                    value={securityAnswer}
                    onChange={(value) => setSecurityAnswer(value)}
                    className="forgot-input"
                  />
                </View>
              </View>
              <Button
                type="primary"
                size="large"
                loading={loading}
                disabled={loading}
                onClick={handleVerifyAnswer}
                className="forgot-btn"
              >
                {loading ? '验证中...' : '验证并重置'}
              </Button>
              <Button
                type="default"
                size="small"
                onClick={() => { setStep(1); setSecurityAnswer(''); }}
                className="switch-btn"
              >
                返回重新选择
              </Button>
            </>
          )}
        </View>

        <View className="footer-link">
          <Text className="link-text">遇到问题？</Text>
          <Text className="contact-link">联系客服</Text>
        </View>
      </View>

      <View className="footer">
        <Text className="copyright">© 2026 Taro多端应用</Text>
      </View>
    </View>
  );
}
