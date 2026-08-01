import Taro from '@tarojs/taro'

export type ThemeName = 'finance-blue' | 'dark-green' | 'deep-space' | 'vibrant-orange' | 'vibrant-purple' | 'coral-pink' | 'cyan'

export interface ThemeConfig {
  brandPrimary: string
  brandPrimaryDark: string
  brandPrimaryLight: string
  brandPrimaryPale: string
  brandPrimaryMuted: string
  brandAccent?: string
  brandAccentLight?: string
  textPrimary: string
  textSecondary: string
  textOnPrimary: string
  borderColor: string
  borderFocus: string
  tabActive: string
  tabInactive: string
  colorPositive: string
  colorNegative: string
}

export const themes: Record<ThemeName, ThemeConfig> = {
  'finance-blue': {
    brandPrimary: '#1A3A5C',
    brandPrimaryDark: '#0F2A44',
    brandPrimaryLight: '#E8EEF4',
    brandPrimaryPale: '#F5F8FA',
    brandPrimaryMuted: '#CBD5E1',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B7280',
    textOnPrimary: '#FFFFFF',
    borderColor: '#DCE3EB',
    borderFocus: '#1A3A5C',
    tabActive: '#1A3A5C',
    tabInactive: '#9CA3AF',
    colorPositive: '#059669',
    colorNegative: '#DC2626',
  },
  'dark-green': {
    brandPrimary: '#005746',
    brandPrimaryDark: '#004033',
    brandPrimaryLight: '#E8F0ED',
    brandPrimaryPale: '#F5F9F7',
    brandPrimaryMuted: '#C4D5D0',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B7280',
    textOnPrimary: '#FFFFFF',
    borderColor: '#D4E0DB',
    borderFocus: '#005746',
    tabActive: '#005746',
    tabInactive: '#9CA3AF',
    colorPositive: '#0A7C3E',
    colorNegative: '#DC2626',
  },
  'deep-space': {
    brandPrimary: '#1F2937',
    brandPrimaryDark: '#111827',
    brandPrimaryLight: '#F3F4F6',
    brandPrimaryPale: '#FAFAFA',
    brandPrimaryMuted: '#D1D5DB',
    brandAccent: '#D4A017',
    brandAccentLight: '#FDF6E3',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textOnPrimary: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderFocus: '#1F2937',
    tabActive: '#1F2937',
    tabInactive: '#9CA3AF',
    colorPositive: '#059669',
    colorNegative: '#DC2626',
  },
  'vibrant-orange': {
    brandPrimary: '#E85D3A',
    brandPrimaryDark: '#CC4A2A',
    brandPrimaryLight: '#FDF0E8',
    brandPrimaryPale: '#FEF8F5',
    brandPrimaryMuted: '#F0D5CA',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B7280',
    textOnPrimary: '#FFFFFF',
    borderColor: '#F0DFD6',
    borderFocus: '#E85D3A',
    tabActive: '#E85D3A',
    tabInactive: '#9CA3AF',
    colorPositive: '#059669',
    colorNegative: '#DC2626',
  },
  'vibrant-purple': {
    brandPrimary: '#6C3CE1',
    brandPrimaryDark: '#552BC4',
    brandPrimaryLight: '#F0EBFF',
    brandPrimaryPale: '#F8F5FF',
    brandPrimaryMuted: '#DED5F5',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B7280',
    textOnPrimary: '#FFFFFF',
    borderColor: '#E0D9F0',
    borderFocus: '#6C3CE1',
    tabActive: '#6C3CE1',
    tabInactive: '#9CA3AF',
    colorPositive: '#059669',
    colorNegative: '#DC2626',
  },
  'coral-pink': {
    brandPrimary: '#E86272',
    brandPrimaryDark: '#CC4A5A',
    brandPrimaryLight: '#FDF0F2',
    brandPrimaryPale: '#FEF8F9',
    brandPrimaryMuted: '#F0D5D8',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B7280',
    textOnPrimary: '#FFFFFF',
    borderColor: '#F0E0E3',
    borderFocus: '#E86272',
    tabActive: '#E86272',
    tabInactive: '#9CA3AF',
    colorPositive: '#059669',
    colorNegative: '#DC2626',
  },
  'cyan': {
    brandPrimary: '#0E8C8C',
    brandPrimaryDark: '#0A6E6E',
    brandPrimaryLight: '#E8F5F5',
    brandPrimaryPale: '#F5FAFA',
    brandPrimaryMuted: '#C8DDDD',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B7280',
    textOnPrimary: '#FFFFFF',
    borderColor: '#D4E8E8',
    borderFocus: '#0E8C8C',
    tabActive: '#0E8C8C',
    tabInactive: '#9CA3AF',
    colorPositive: '#059669',
    colorNegative: '#DC2626',
  },
}

export const THEME_KEY = 'theme_name'

export const applyTheme = (themeName: ThemeName): void => {
  const theme = themes[themeName]
  if (!theme) return

  // 只在 H5 环境操作 DOM CSS 变量；小程序 / RN 没有 document，改用 JS 常量
  if (typeof document === 'undefined') return

  const root = document.documentElement

  root.style.setProperty('--brand-primary', theme.brandPrimary)
  root.style.setProperty('--brand-primary-dark', theme.brandPrimaryDark)
  root.style.setProperty('--brand-primary-light', theme.brandPrimaryLight)
  root.style.setProperty('--brand-primary-pale', theme.brandPrimaryPale)
  root.style.setProperty('--brand-primary-muted', theme.brandPrimaryMuted)

  if (theme.brandAccent) {
    root.style.setProperty('--brand-accent', theme.brandAccent)
  } else {
    root.style.setProperty('--brand-accent', theme.brandPrimary)
  }

  if (theme.brandAccentLight) {
    root.style.setProperty('--brand-accent-light', theme.brandAccentLight)
  } else {
    root.style.setProperty('--brand-accent-light', theme.brandPrimaryLight)
  }

  root.style.setProperty('--text-primary', theme.textPrimary)
  root.style.setProperty('--text-secondary', theme.textSecondary)
  root.style.setProperty('--text-on-primary', theme.textOnPrimary)
  root.style.setProperty('--border-color', theme.borderColor)
  root.style.setProperty('--border-focus', theme.borderFocus)
  root.style.setProperty('--tab-active', theme.tabActive)
  root.style.setProperty('--tab-inactive', theme.tabInactive)
  root.style.setProperty('--color-positive', theme.colorPositive)
  root.style.setProperty('--color-negative', theme.colorNegative)

  root.style.setProperty('--nutui-color-primary', theme.brandPrimary)
  root.style.setProperty('--nutui-color-primary-stop-1', theme.brandPrimary)
  root.style.setProperty('--nutui-color-primary-stop-2', theme.brandPrimaryDark)
  root.style.setProperty('--nutui-color-primary-disabled-special', theme.brandPrimary)
  root.style.setProperty('--nutui-button-primary-color', theme.textOnPrimary)
  root.style.setProperty('--nutui-button-primary-border-color', theme.brandPrimary)
  root.style.setProperty('--nutui-button-primary-disabled', theme.brandPrimary)
}

export const saveTheme = (themeName: ThemeName): void => {
  try {
    Taro.setStorageSync(THEME_KEY, themeName)
  } catch (error) {
    console.error('保存主题失败:', error)
  }
}

export const getTheme = (): ThemeName => {
  try {
    const saved = Taro.getStorageSync(THEME_KEY)
    if (saved && Object.keys(themes).includes(saved)) {
      return saved as ThemeName
    }
  } catch (error) {
    console.error('获取主题失败:', error)
  }
  return 'coral-pink'
}

export const initTheme = (): void => {
  const themeName = getTheme()
  applyTheme(themeName)
}

export const themeDisplayNames: Record<ThemeName, string> = {
  'finance-blue': '金融蓝',
  'dark-green': '墨绿',
  'deep-space': '深空灰',
  'vibrant-orange': '活力橙',
  'vibrant-purple': '活力紫',
  'coral-pink': '珊瑚粉',
  'cyan': '青色',
}
