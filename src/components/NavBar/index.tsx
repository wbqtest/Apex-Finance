import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { isInApp } from '../../utils/platform'
import './index.less'

interface NavBarProps {
  title: string
}

export default function NavBar({ title }: NavBarProps) {
  const inApp = isInApp()

  const handleBack = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack()
    } else {
      Taro.switchTab({ url: '/pages/mine' })
    }
  }

  // 在微信/钉钉等 App 中打开时，隐藏整个 NavBar（App 自带返回和标题）
  if (inApp) {
    return null
  }

  return (
    <View className="navbar">
      <Text className="navbar-back" onClick={handleBack}>‹</Text>
      <Text className="navbar-title">{title}</Text>
      <View className="navbar-placeholder" />
    </View>
  )
}
