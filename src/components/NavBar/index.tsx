import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.less'

interface NavBarProps {
  title: string
}

export default function NavBar({ title }: NavBarProps) {
  const handleBack = () => {
    const pages = Taro.getCurrentPages()
    if (pages.length > 1) {
      Taro.navigateBack()
    } else {
      Taro.switchTab({ url: '/pages/mine' })
    }
  }

  return (
    <View className="navbar">
      <Text className="navbar-back" onClick={handleBack}>‹</Text>
      <Text className="navbar-title">{title}</Text>
      <View className="navbar-placeholder" />
    </View>
  )
}
