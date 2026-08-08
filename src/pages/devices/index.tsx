import { View, Text, ScrollView, Input, Slider } from '@tarojs/components'
import { useState, useEffect, useCallback, useRef } from 'react'
import Taro from '@tarojs/taro'
import { Button } from '@nutui/nutui-react-taro'
import NavBar from '../../components/NavBar'
import Modal from '../../components/Modal/modal'
import { smartHomeWs } from '../../utils/smartHomeWs'
import { getDevices, controlDeviceHttp, createDevice, updateDevice, deleteDevice, sendVoiceCommand, getSchedules, deleteSchedule } from '../../services/api'
import { IS_H5 } from '../../utils/platform'
import './index.less'

// ============ 类型定义 ============
type AirconMode = 'cool' | 'heat' | 'fan' | 'dry' | 'auto'
type FanSpeed = 'low' | 'medium' | 'high' | 'auto'
type FanOnlySpeed = 'low' | 'medium' | 'high'
type FanMode = 'normal' | 'natural' | 'sleep'
type LightScene = 'reading' | 'night' | 'movie' | 'warm'

interface AirconState {
  power: boolean
  mode: AirconMode
  temperature: number
  fanSpeed: FanSpeed
  swing: boolean
  timer: number | null
}

interface FanState {
  power: boolean
  fanSpeed: FanOnlySpeed
  oscillate: boolean
  mode: FanMode
  timer: number | null
}

interface LightState {
  status: 'on' | 'off'
  brightness: number // 1-100
  color_temp: number // 2700K-6500K
  color: string // RGB hex
}

interface DeviceState {
  deviceId: string
  deviceType: 'aircon' | 'fan' | 'light'
  deviceName: string
  room: string
  status: number // 0离线 1在线
  currentState: AirconState | FanState | LightState | any
}

// ============ 常量 ============
const AIRCON_MODES: { value: AirconMode; label: string; icon: string }[] = [
  { value: 'cool', label: '制冷', icon: '❄️' },
  { value: 'heat', label: '制热', icon: '🔥' },
  { value: 'fan', label: '送风', icon: '💨' },
  { value: 'dry', label: '除湿', icon: '💧' },
  { value: 'auto', label: '自动', icon: '⚙️' },
]

const AIRCON_SPEEDS: { value: FanSpeed; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'auto', label: '自动' },
]

const FAN_SPEEDS: { value: FanOnlySpeed; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
]

const FAN_MODES: { value: FanMode; label: string }[] = [
  { value: 'normal', label: '正常' },
  { value: 'natural', label: '自然风' },
  { value: 'sleep', label: '睡眠风' },
]

const TIMER_OPTIONS = [1, 2, 4]
const TEMP_MIN = 16
const TEMP_MAX = 30

const LIGHT_SCENES: { value: LightScene; label: string; icon: string; brightness: number; color_temp: number }[] = [
  { value: 'warm', label: '温馨', icon: '🏠', brightness: 60, color_temp: 3000 },
  { value: 'reading', label: '阅读', icon: '📖', brightness: 90, color_temp: 5000 },
  { value: 'night', label: '夜灯', icon: '🌙', brightness: 15, color_temp: 2700 },
  { value: 'movie', label: '观影', icon: '🎬', brightness: 25, color_temp: 3500 },
]

const COLOR_TEMP_MIN = 2700
const COLOR_TEMP_MAX = 6500

const MODE_LABEL: Record<AirconMode, string> = {
  cool: '制冷', heat: '制热', fan: '送风', dry: '除湿', auto: '自动',
}
const SPEED_LABEL: Record<string, string> = {
  low: '低', medium: '中', high: '高', auto: '自动',
}
const FAN_MODE_LABEL: Record<FanMode, string> = {
  normal: '正常', natural: '自然风', sleep: '睡眠风',
}

// 默认演示设备（API 不可用时回退使用）
const MOCK_DEVICES: DeviceState[] = [
  {
    deviceId: 'aircon_01',
    deviceType: 'aircon',
    deviceName: '客厅空调',
    room: '客厅',
    status: 1,
    currentState: {
      power: false,
      mode: 'cool',
      temperature: 26,
      fanSpeed: 'auto',
      swing: false,
      timer: null,
    },
  },
  {
    deviceId: 'fan_01',
    deviceType: 'fan',
    deviceName: '卧室风扇',
    room: '卧室',
    status: 1,
    currentState: {
      power: false,
      fanSpeed: 'medium',
      oscillate: false,
      mode: 'normal',
      timer: null,
    },
  },
  {
    deviceId: 'light_01',
    deviceType: 'light',
    deviceName: '客厅主灯',
    room: '客厅',
    status: 1,
    currentState: {
      status: 'off',
      brightness: 80,
      color_temp: 4000,
      color: '#FFFFFF',
    },
  },
]

// ============ 工具函数 ============
function getDeviceIcon(type: string): string {
  return type === 'aircon' ? '❄️' : type === 'fan' ? '🌀' : '💡'
}

function getDeviceSummary(device: DeviceState): string {
  const s = device.currentState || {}
  if (!device.status) return '离线'
  if (device.deviceType === 'light') {
    if (s.status === 'off') return '关闭'
    const bright = `${s.brightness || 0}%`
    if (s.color && s.color !== '#FFFFFF') return `${bright} · 彩光`
    const temp = s.color_temp || 4000
    return `${bright} · ${temp <= 3000 ? '暖色' : temp >= 5000 ? '冷白' : '自然'}`
  }
  if (!s.power) return '待机'
  if (device.deviceType === 'aircon') {
    return `${MODE_LABEL[s.mode as AirconMode] || ''} ${s.temperature}°C ${SPEED_LABEL[s.fanSpeed] || ''}风`
  }
  return `${SPEED_LABEL[s.fanSpeed] || ''}档 ${FAN_MODE_LABEL[s.mode as FanMode] || ''}`
}

/** 描述定时任务要执行的动作 */
function describeScheduleAction(action: string, value: any): string {
  switch (action) {
    case 'set_power': return value ? '开机' : '关机'
    case 'set_mode': return `切换${MODE_LABEL[value as AirconMode] || value}模式`
    case 'set_temperature': return `设为${value}°C`
    case 'set_fan_speed': return `${SPEED_LABEL[value] || value}风`
    case 'set_swing': return value ? '开启扫风' : '关闭扫风'
    case 'set_oscillate': return value ? '开启摇头' : '关闭摇头'
    case 'set_timer': return value ? `定时${value}小时` : '取消定时'
    case 'turn_on': return '开灯'
    case 'turn_off': return '关灯'
    case 'toggle': return '切换开关'
    case 'set_brightness': return `亮度${value}%`
    case 'set_color_temp': return `色温${value}K`
    case 'set_color': return `颜色${value}`
    case 'set_scene': return `${value}场景`
    default: return action
  }
}

export default function Devices() {
  const [devices, setDevices] = useState<DeviceState[]>([])
  const [connected, setConnected] = useState(false)
  const [loadingDevices, setLoadingDevices] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // 房间筛选：'全部' 或具体房间名
  const [activeRoom, setActiveRoom] = useState('全部')
  const [controlling, setControlling] = useState<Record<string, boolean>>({})
  const [listening, setListening] = useState(false)
  const [voiceProcessing, setVoiceProcessing] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [voiceReply, setVoiceReply] = useState('')
  const [showVoicePanel, setShowVoicePanel] = useState(false)

  // 定时任务列表
  const [schedules, setSchedules] = useState<any[]>([])
  const [showSchedules, setShowSchedules] = useState(false)

  // 设备管理弹窗状态
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameTarget, setRenameTarget] = useState<DeviceState | null>(null)
  const [newDeviceType, setNewDeviceType] = useState<'aircon' | 'fan' | 'light'>('aircon')
  const [newDeviceName, setNewDeviceName] = useState('')
  const [newDeviceRoom, setNewDeviceRoom] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [renameRoom, setRenameRoom] = useState('')
  const [saving, setSaving] = useState(false)

  // 始终持有最新 devices，供异步回调使用
  const devicesRef = useRef<DeviceState[]>([])
  devicesRef.current = devices

  // ============ 设备状态更新 ============
  const applyOptimistic = useCallback((deviceId: string, action: string, value: any) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.deviceId !== deviceId) return d
        const state: any = { ...(d.currentState || {}) }
        switch (action) {
          case 'set_power': state.power = value; break
          case 'set_mode': state.mode = value; break
          case 'set_temperature': state.temperature = value; break
          case 'set_fan_speed': state.fanSpeed = value; break
          case 'set_swing': state.swing = value; break
          case 'set_oscillate': state.oscillate = value; break
          case 'set_timer': state.timer = value; break
          // 灯光控制
          case 'toggle': state.status = state.status === 'on' ? 'off' : 'on'; break
          case 'turn_on': state.status = 'on'; break
          case 'turn_off': state.status = 'off'; break
          case 'set_brightness': state.brightness = value; break
          case 'set_color_temp': state.color_temp = value; break
          case 'set_color': state.color = value; break
          case 'set_scene': {
            const scene = LIGHT_SCENES.find((s) => s.value === value)
            if (scene) {
              state.brightness = scene.brightness
              state.color_temp = scene.color_temp
              state.color = '#FFFFFF'
            }
            break
          }
          default: state[action] = value
        }
        return { ...d, currentState: state }
      })
    )
  }, [])

  // ============ 控制设备 ============
  const handleControl = useCallback(
    (device: DeviceState, action: string, value: any) => {
      if (!device.status) {
        Taro.showToast({ title: '设备离线', icon: 'none' })
        return
      }
      const key = `${device.deviceId}:${action}`
      // 乐观更新
      applyOptimistic(device.deviceId, action, value)

      setControlling((prev) => ({ ...prev, [key]: true }))

      if (smartHomeWs.isConnected) {
        smartHomeWs.sendControl(device.deviceId, action, value)
      } else {
        // WebSocket 断开，HTTP 兜底
        controlDeviceHttp({ deviceId: device.deviceId, action, value })
          .then((res) => {
            if (res.code === 200 && res.data && res.data.currentState) {
              setDevices((prev) =>
                prev.map((d) =>
                  d.deviceId === device.deviceId
                    ? { ...d, currentState: { ...d.currentState, ...res.data.currentState } }
                    : d
                )
              )
            }
          })
          .catch(() => { })
          .finally(() => {
            setControlling((prev) => {
              const next = { ...prev }
              delete next[key]
              return next
            })
          })
      }

      // 安全超时：5 秒后强制移除 loading（防止 control_result 丢失）
      setTimeout(() => {
        setControlling((prev) => {
          if (!prev[key]) return prev
          const next = { ...prev }
          delete next[key]
          return next
        })
      }, 5000)
    },
    [applyOptimistic]
  )

  // ============ 加载设备列表 ============
  const loadDevices = useCallback(async () => {
    setLoadingDevices(true)
    try {
      const res = await getDevices()
      if (res.code === 200 && res.data && res.data.length) {
        setDevices(res.data)
      } else {
        setDevices(MOCK_DEVICES)
      }
    } catch {
      setDevices(MOCK_DEVICES)
    } finally {
      setLoadingDevices(false)
    }
  }, [])

  // ============ 刷新 ============
  const handleRefresh = useCallback(() => {
    if (smartHomeWs.isConnected) {
      smartHomeWs.queryStatus()
    }
    loadDevices()
    Taro.showToast({ title: '正在刷新状态', icon: 'none', duration: 1200 })
  }, [loadDevices])

  // ============ 一键全关 ============
  const handleAllOff = useCallback(() => {
    const targets = devicesRef.current.filter((d) => d.status && d.currentState?.power)
    if (targets.length === 0) {
      Taro.showToast({ title: '没有运行中的设备', icon: 'none' })
      return
    }
    targets.forEach((d) => handleControl(d, 'set_power', false))
    Taro.showToast({ title: '已发送全关指令', icon: 'success', duration: 1200 })
  }, [handleControl])

  // ============ 新增设备 ============
  const handleAddDevice = useCallback(async () => {
    if (!newDeviceName.trim()) {
      Taro.showToast({ title: '请输入设备名称', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      const res = await createDevice({
        deviceType: newDeviceType,
        deviceName: newDeviceName.trim(),
        room: newDeviceRoom.trim() || '客厅',
      })
      if (res.code === 200 && res.data) {
        setDevices((prev) => [...prev, res.data])
        Taro.showToast({ title: '添加成功', icon: 'success' })
        setShowAddModal(false)
        setNewDeviceName('')
        setNewDeviceRoom('')
      } else {
        Taro.showToast({ title: res.message || '添加失败', icon: 'none' })
      }
    } catch {
      Taro.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }, [newDeviceType, newDeviceName, newDeviceRoom])

  // ============ 重命名设备 ============
  const handleRenameDevice = useCallback(async () => {
    if (!renameTarget) return
    if (!renameValue.trim()) {
      Taro.showToast({ title: '请输入名称', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      const res = await updateDevice(renameTarget.deviceId, {
        deviceName: renameValue.trim(),
        room: renameRoom.trim() || renameTarget.room,
      })
      if (res.code === 200) {
        setDevices((prev) =>
          prev.map((d) =>
            d.deviceId === renameTarget.deviceId
              ? { ...d, deviceName: renameValue.trim(), room: renameRoom.trim() || d.room }
              : d
          )
        )
        Taro.showToast({ title: '修改成功', icon: 'success' })
        setShowRenameModal(false)
        setRenameTarget(null)
      } else {
        Taro.showToast({ title: res.message || '修改失败', icon: 'none' })
      }
    } catch {
      Taro.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }, [renameTarget, renameValue, renameRoom])

  // ============ 删除设备 ============
  const handleDeleteDevice = useCallback((device: DeviceState) => {
    Taro.showModal({
      title: '删除设备',
      content: `确定要删除"${device.deviceName}"吗？此操作不可恢复。`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await deleteDevice(device.deviceId)
          setDevices((prev) => prev.filter((d) => d.deviceId !== device.deviceId))
          if (expandedId === device.deviceId) setExpandedId(null)
          Taro.showToast({ title: '已删除', icon: 'success' })
        } catch {
          Taro.showToast({ title: '删除失败', icon: 'none' })
        }
      },
    })
  }, [expandedId])

  // ============ 语音控制（仅 H5） ============
  const recognitionRef = useRef<any>(null)

  /** 发送文本到后端 AI 解析并执行设备控制 */
  const sendToBackend = useCallback(async (text: string) => {
    if (!text.trim()) return
    setVoiceProcessing(true)
    setVoiceReply('')
    try {
      const res = await sendVoiceCommand({ text: text.trim() })
      if (res.code === 200 && res.data) {
        setVoiceReply(res.data.reply || '指令已执行')
        // 对每条立即控制指令做乐观更新
        if (res.data.commands?.length > 0) {
          res.data.commands.forEach((cmd) => {
            if (cmd.success) {
              applyOptimistic(cmd.deviceId, cmd.action, cmd.value)
            }
          })
        }
        // 定时任务创建后刷新列表
        if (res.data.schedules?.length > 0) {
          loadSchedules()
          const sCount = res.data.schedules.filter((s) => s.success).length
          Taro.showToast({
            title: `${sCount}/${res.data.schedules.length} 个定时任务已创建`,
            icon: sCount === res.data.schedules.length ? 'success' : 'none',
            duration: 2000,
          })
        } else if (res.data.commands?.length > 0) {
          const successCount = res.data.commands.filter((c) => c.success).length
          Taro.showToast({
            title: `${successCount}/${res.data.commands.length} 个指令已执行`,
            icon: successCount === res.data.commands.length ? 'success' : 'none',
            duration: 2000,
          })
        }
      } else {
        setVoiceReply(res.message || '解析失败，请重试')
        Taro.showToast({ title: res.message || '解析失败', icon: 'none' })
      }
    } catch {
      setVoiceReply('网络错误，请检查后端服务是否启动')
      Taro.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      setVoiceProcessing(false)
    }
  }, [applyOptimistic])

  /** 加载定时任务列表 */
  const loadSchedules = useCallback(async () => {
    try {
      const res = await getSchedules()
      if (res.code === 200 && res.data) {
        setSchedules(res.data)
      }
    } catch {
      // 忽略
    }
  }, [])

  /** 删除定时任务 */
  const handleDeleteSchedule = useCallback((id: number) => {
    Taro.showModal({
      title: '删除定时任务',
      content: '确定要删除这个定时任务吗？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await deleteSchedule(id)
          setSchedules((prev) => prev.filter((s) => s.id !== id))
          Taro.showToast({ title: '已删除', icon: 'success' })
        } catch {
          Taro.showToast({ title: '删除失败', icon: 'none' })
        }
      },
    })
  }, [])

  /** 本地规则匹配（降级方案，后端不可用时使用） */
  const localParse = useCallback((text: string) => {
    const list = devicesRef.current
    const aircon = list.find((d) => d.deviceType === 'aircon')
    const fan = list.find((d) => d.deviceType === 'fan')
    const light = list.find((d) => d.deviceType === 'light')

    if (light) {
      if (/开.*灯|灯.*开|把灯打开/.test(text)) { handleControl(light, 'turn_on', null); return true }
      if (/关.*灯|灯.*关|把灯关了/.test(text)) { handleControl(light, 'turn_off', null); return true }
      const brightnessMatch = text.match(/(\d{1,3})\s*%/) || text.match(/亮度.*?(\d{1,3})/)
      if (brightnessMatch) { handleControl(light, 'set_brightness', Math.max(1, Math.min(100, parseInt(brightnessMatch[1], 10)))); return true }
      if (/调暗|暗一点|变暗/.test(text)) { handleControl(light, 'set_brightness', Math.max(1, (light.currentState?.brightness || 80) - 20)); return true }
      if (/调亮|亮一点|变亮/.test(text)) { handleControl(light, 'set_brightness', Math.min(100, (light.currentState?.brightness || 80) + 20)); return true }
      if (/暖色|暖光/.test(text)) { handleControl(light, 'set_color_temp', 3000); return true }
      if (/冷色|冷白|白光/.test(text)) { handleControl(light, 'set_color_temp', 5500); return true }
      if (/阅读模式/.test(text)) { handleControl(light, 'set_scene', 'reading'); return true }
      if (/夜灯|夜间|睡前/.test(text)) { handleControl(light, 'set_scene', 'night'); return true }
      if (/观影|电影/.test(text)) { handleControl(light, 'set_scene', 'movie'); return true }
      if (/温馨|回家/.test(text)) { handleControl(light, 'set_scene', 'warm'); return true }
    }
    if (aircon) {
      if (/开.*空调|空调.*开/.test(text)) { handleControl(aircon, 'set_power', true); return true }
      if (/关.*空调|空调.*关/.test(text)) { handleControl(aircon, 'set_power', false); return true }
      const m = text.match(/(\d{1,2})\s*度/)
      if (m) { handleControl(aircon, 'set_temperature', Math.max(TEMP_MIN, Math.min(TEMP_MAX, parseInt(m[1], 10)))); return true }
    }
    if (fan) {
      if (/开.*风扇|风扇.*开/.test(text)) { handleControl(fan, 'set_power', true); return true }
      if (/关.*风扇|风扇.*关/.test(text)) { handleControl(fan, 'set_power', false); return true }
    }
    return false
  }, [handleControl])

  /** 发送语音/文本指令（优先调用后端 AI，失败降级本地匹配） */
  const handleVoiceCommand = useCallback(async (text: string) => {
    setVoiceText(text)
    // 先尝试后端 AI 解析
    try {
      await sendToBackend(text)
    } catch {
      // 降级到本地规则
      const matched = localParse(text)
      setVoiceReply(matched ? '已执行（本地模式）' : '未识别到有效指令')
      if (!matched) Taro.showToast({ title: '未识别到有效指令', icon: 'none' })
    }
  }, [sendToBackend, localParse])

  const toggleVoice = useCallback(() => {
    if (!IS_H5) {
      Taro.showToast({ title: '语音控制仅支持H5', icon: 'none' })
      return
    }
    const SR =
      (typeof window !== 'undefined' && (window as any).SpeechRecognition) ||
      (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition)
    if (!SR) {
      Taro.showToast({ title: '当前浏览器不支持语音', icon: 'none' })
      // 不支持语音时打开手动输入面板
      setShowVoicePanel(true)
      return
    }
    if (listening) {
      try { recognitionRef.current && recognitionRef.current.stop() } catch { }
      setListening(false)
      return
    }
    setShowVoicePanel(true)
    setVoiceText('')
    setVoiceReply('')
    const rec = new SR()
    rec.lang = 'zh-CN'
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onresult = (e: any) => {
      let interim = ''
      let final = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript
        } else {
          interim += e.results[i][0].transcript
        }
      }
      if (final) {
        setVoiceText(final)
        setListening(false)
        handleVoiceCommand(final)
      } else if (interim) {
        setVoiceText(interim)
      }
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }, [listening, handleVoiceCommand])

  /** 手动发送文本指令 */
  const handleSendText = useCallback(() => {
    if (!voiceText.trim()) return
    handleVoiceCommand(voiceText.trim())
  }, [voiceText, handleVoiceCommand])

  // ============ 生命周期：注册 WS 回调 ============
  useEffect(() => {
    // 连接状态变化
    const offConn = smartHomeWs.onConnectionChange((c) => {
      setConnected(c)
      if (c) {
        // 连接成功后查询实时状态
        smartHomeWs.queryStatus()
      } else {
        Taro.showToast({ title: '设备服务已断开', icon: 'none', duration: 1500 })
      }
    })

    // 设备状态推送
    const offStatus = smartHomeWs.onStatusUpdate((data) => {
      const arr = Array.isArray(data) ? data : [data]
      setDevices((prev) => {
        const next = [...prev]
        arr.forEach((s) => {
          const idx = next.findIndex((d) => d.deviceId === s.deviceId)
          if (idx >= 0) {
            next[idx] = {
              ...next[idx],
              ...s,
              currentState: { ...next[idx].currentState, ...(s.currentState || {}) },
            }
          } else {
            next.push(s as DeviceState)
          }
        })
        return next
      })
    })

    // 控制结果推送
    const offResult = smartHomeWs.onControlResult((result) => {
      // 移除该设备所有 loading
      setControlling((prev) => {
        const next: Record<string, boolean> = {}
        Object.keys(prev).forEach((k) => {
          if (!k.startsWith(`${result.deviceId}:`)) next[k] = prev[k]
        })
        return next
      })
      if (result.success && result.currentState) {
        setDevices((prev) =>
          prev.map((d) =>
            d.deviceId === result.deviceId
              ? { ...d, currentState: { ...d.currentState, ...result.currentState } }
              : d
          )
        )
      } else if (!result.success) {
        Taro.showToast({ title: result.message || '控制失败', icon: 'none' })
      }
    })

    // 建立 WS 连接
    smartHomeWs.connect()

    // 首次拉取设备列表
    loadDevices()
    // 首次拉取定时任务
    loadSchedules()

    return () => {
      offConn()
      offStatus()
      offResult()
      // 不主动断开 WS（单例保持长连）
    }
  }, [loadDevices, loadSchedules])

  // ============ 派生数据 ============
  const onlineCount = devices.filter((d) => d.status === 1).length
  const rooms = Array.from(new Set(devices.map((d) => d.room).filter(Boolean)))
  // 房间筛选 Tab 数据：首项为"全部"
  const roomTabs = ['全部', ...rooms]
  // 运行中设备数（空调/风扇看 power，灯光看 status === 'on'）
  const runningCount = devices.filter(
    (d) => d.status === 1 && (d.currentState?.power || d.currentState?.status === 'on')
  ).length
  // 按当前选中房间过滤设备列表
  const filteredDevices = activeRoom === '全部' ? devices : devices.filter((d) => d.room === activeRoom)

  // ============ 渲染：自定义开关 ============
  const renderToggle = (on: boolean, onChange: (v: boolean) => void, disabled = false) => (
    <View
      className={`sh-toggle ${on ? 'on' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && onChange(!on)}
    >
      <View className={`sh-toggle-thumb ${on ? 'on' : ''}`} />
    </View>
  )

  // ============ 渲染：空调控制面板 ============
  const renderAirconPanel = (device: DeviceState) => {
    const s: AirconState = device.currentState || {}
    const isLoading = (action: string) => !!controlling[`${device.deviceId}:${action}`]
    const disabled = !device.status
    const powerLoading = isLoading('set_power')

    return (
      <View className='sh-panel'>
        {/* 开关机大按钮 */}
        <View className='sh-power-row'>
          <View
            className={`sh-power-btn ${s.power ? 'on' : ''} ${disabled ? 'disabled' : ''} ${powerLoading ? 'sending' : ''}`}
            onClick={() => handleControl(device, 'set_power', !s.power)}
          >
            <Text className='sh-power-icon'>⏻</Text>
            <Text className='sh-power-label'>{powerLoading ? '发送中' : s.power ? '运行中' : '已关机'}</Text>
          </View>
          <View className='sh-power-status'>
            <Text className='sh-power-temp'>{s.temperature}°C</Text>
            <Text className='sh-power-mode'>{MODE_LABEL[s.mode]} · {SPEED_LABEL[s.fanSpeed]}风</Text>
          </View>
        </View>

        {/* 模式选择 */}
        <View className='sh-section'>
          <Text className='sh-section-title'>模式</Text>
          <View className='sh-tabs'>
            {AIRCON_MODES.map((m) => (
              <View
                key={m.value}
                className={`sh-tab ${s.mode === m.value ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => s.mode !== m.value && handleControl(device, 'set_mode', m.value)}
              >
                <Text className='sh-tab-icon'>{m.icon}</Text>
                <Text className='sh-tab-label'>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 温度调节 */}
        <View className='sh-section'>
          <Text className='sh-section-title'>温度</Text>
          <View className='sh-temp-row'>
            <View
              className={`sh-step-btn ${s.temperature <= TEMP_MIN || disabled ? 'disabled' : ''} ${isLoading('set_temperature') ? 'loading' : ''}`}
              onClick={() => s.temperature > TEMP_MIN && handleControl(device, 'set_temperature', s.temperature - 1)}
            >
              <Text className='sh-step-symbol'>−</Text>
            </View>
            <View className='sh-temp-value'>
              <Text className='sh-temp-num'>{s.temperature}</Text>
              <Text className='sh-temp-unit'>°C</Text>
            </View>
            <View
              className={`sh-step-btn ${s.temperature >= TEMP_MAX || disabled ? 'disabled' : ''} ${isLoading('set_temperature') ? 'loading' : ''}`}
              onClick={() => s.temperature < TEMP_MAX && handleControl(device, 'set_temperature', s.temperature + 1)}
            >
              <Text className='sh-step-symbol'>+</Text>
            </View>
          </View>
        </View>

        {/* 风速调节 */}
        <View className='sh-section'>
          <Text className='sh-section-title'>风速</Text>
          <View className='sh-option-row'>
            {AIRCON_SPEEDS.map((sp) => (
              <View
                key={sp.value}
                className={`sh-option ${s.fanSpeed === sp.value ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => s.fanSpeed !== sp.value && handleControl(device, 'set_fan_speed', sp.value)}
              >
                <Text className='sh-option-label'>{sp.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 摆风 + 定时 */}
        <View className='sh-section sh-row-section'>
          <View className='sh-inline-item'>
            <Text className='sh-section-title'>摆风</Text>
            {renderToggle(!!s.swing, (v) => handleControl(device, 'set_swing', v), disabled)}
          </View>
          <View className='sh-inline-item'>
            <Text className='sh-section-title'>定时关机</Text>
            <View className='sh-timer-row'>
              {TIMER_OPTIONS.map((h) => (
                <View
                  key={h}
                  className={`sh-timer-btn ${s.timer === h ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                  onClick={() => handleControl(device, 'set_timer', s.timer === h ? null : h)}
                >
                  <Text className='sh-timer-label'>{s.timer === h ? '✓' : `${h}H`}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    )
  }

  // ============ 渲染：风扇控制面板 ============
  const renderFanPanel = (device: DeviceState) => {
    const s: FanState = device.currentState || {}
    const isLoading = (action: string) => !!controlling[`${device.deviceId}:${action}`]
    const disabled = !device.status
    const powerLoading = isLoading('set_power')

    return (
      <View className='sh-panel'>
        {/* 开关机大按钮 */}
        <View className='sh-power-row'>
          <View
            className={`sh-power-btn ${s.power ? 'on' : ''} ${disabled ? 'disabled' : ''} ${powerLoading ? 'sending' : ''}`}
            onClick={() => handleControl(device, 'set_power', !s.power)}
          >
            <Text className='sh-power-icon'>⏻</Text>
            <Text className='sh-power-label'>{powerLoading ? '发送中' : s.power ? '运行中' : '已关机'}</Text>
          </View>
          <View className='sh-power-status'>
            <Text className='sh-power-temp'>{SPEED_LABEL[s.fanSpeed]}档</Text>
            <Text className='sh-power-mode'>{FAN_MODE_LABEL[s.mode]}{s.oscillate ? ' · 摇头' : ''}</Text>
          </View>
        </View>

        {/* 风速调节 */}
        <View className='sh-section'>
          <Text className='sh-section-title'>风速</Text>
          <View className='sh-option-row'>
            {FAN_SPEEDS.map((sp) => (
              <View
                key={sp.value}
                className={`sh-option ${s.fanSpeed === sp.value ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => s.fanSpeed !== sp.value && handleControl(device, 'set_fan_speed', sp.value)}
              >
                <Text className='sh-option-label'>{sp.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 模式切换 */}
        <View className='sh-section'>
          <Text className='sh-section-title'>模式</Text>
          <View className='sh-option-row sh-option-row-3'>
            {FAN_MODES.map((m) => (
              <View
                key={m.value}
                className={`sh-option ${s.mode === m.value ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => s.mode !== m.value && handleControl(device, 'set_mode', m.value)}
              >
                <Text className='sh-option-label'>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 摇头 + 定时 */}
        <View className='sh-section sh-row-section'>
          <View className='sh-inline-item'>
            <Text className='sh-section-title'>摇头</Text>
            {renderToggle(!!s.oscillate, (v) => handleControl(device, 'set_oscillate', v), disabled)}
          </View>
          <View className='sh-inline-item'>
            <Text className='sh-section-title'>定时关机</Text>
            <View className='sh-timer-row'>
              {TIMER_OPTIONS.map((h) => (
                <View
                  key={h}
                  className={`sh-timer-btn ${s.timer === h ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                  onClick={() => handleControl(device, 'set_timer', s.timer === h ? null : h)}
                >
                  <Text className='sh-timer-label'>{s.timer === h ? '✓' : `${h}H`}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    )
  }

  // ============ 渲染：灯光控制面板 ============
  const renderLightPanel = (device: DeviceState) => {
    const s: LightState = device.currentState || {}
    const isLoading = (action: string) => !!controlling[`${device.deviceId}:${action}`]
    const disabled = !device.status
    const isOn = s.status === 'on'
    const powerLoading = isLoading('turn_on') || isLoading('turn_off') || isLoading('toggle')

    return (
      <View className='sh-panel'>
        {/* 开关大按钮 */}
        <View className='sh-power-row sh-light-power-row'>
          <View
            className={`sh-light-power-btn ${isOn ? 'on' : ''} ${disabled ? 'disabled' : ''} ${powerLoading ? 'sending' : ''}`}
            onClick={() => handleControl(device, 'toggle', null)}
          >
            <Text className='sh-light-power-icon'>{isOn ? '💡' : '🌑'}</Text>
            <Text className='sh-light-power-label'>{powerLoading ? '发送中' : isOn ? '已开启' : '已关闭'}</Text>
          </View>
          <View className='sh-power-status'>
            <Text className='sh-light-brightness-num'>{s.brightness || 0}%</Text>
            <Text className='sh-power-mode'>
              {(s.color_temp || 4000) <= 3000 ? '暖色' : (s.color_temp || 4000) >= 5000 ? '冷白' : '自然光'}
              {s.color && s.color !== '#FFFFFF' ? ' · 彩光' : ''}
            </Text>
          </View>
        </View>

        {/* 亮度调节 */}
        <View className='sh-section'>
          <View className='sh-section-header'>
            <Text className='sh-section-title'>亮度</Text>
            <Text className='sh-section-value'>{s.brightness || 0}%</Text>
          </View>
          <View className='sh-slider-row'>
            <Slider
              min={1}
              max={100}
              step={1}
              value={s.brightness || 0}
              disabled={disabled || !isOn}
              activeColor='#FFD93D'
              backgroundColor='#E0E0E0'
              blockColor='#F59E0B'
              onChange={(e) => handleControl(device, 'set_brightness', e.detail.value)}
              className={`sh-slider ${(!isOn || disabled) ? 'disabled' : ''}`}
            />
          </View>
        </View>

        {/* 色温调节 */}
        <View className='sh-section'>
          <View className='sh-section-header'>
            <Text className='sh-section-title'>色温</Text>
            <Text className='sh-section-value'>{s.color_temp || 4000}K</Text>
          </View>
          <View className='sh-slider-row'>
            <Slider
              min={COLOR_TEMP_MIN}
              max={COLOR_TEMP_MAX}
              step={100}
              value={s.color_temp || 4000}
              disabled={disabled || !isOn}
              activeColor='#4FC3F7'
              backgroundColor='#FFD93D'
              blockColor='#FFFFFF'
              onChange={(e) => handleControl(device, 'set_color_temp', e.detail.value)}
              className={`sh-slider sh-slider-temp ${(!isOn || disabled) ? 'disabled' : ''}`}
            />
          </View>
          <View className='sh-temp-labels'>
            <Text className='sh-temp-label'>暖黄 2700K</Text>
            <Text className='sh-temp-label'>冷白 6500K</Text>
          </View>
        </View>

        {/* 场景模式 */}
        <View className='sh-section'>
          <Text className='sh-section-title'>场景模式</Text>
          <View className='sh-light-scenes'>
            {LIGHT_SCENES.map((sc) => (
              <View
                key={sc.value}
                className={`sh-light-scene ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && handleControl(device, 'set_scene', sc.value)}
              >
                <Text className='sh-light-scene-icon'>{sc.icon}</Text>
                <Text className='sh-light-scene-label'>{sc.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 颜色选择 */}
        <View className='sh-section'>
          <View className='sh-section-header'>
            <Text className='sh-section-title'>灯光颜色</Text>
            <Text className='sh-section-value'>{s.color || '#FFFFFF'}</Text>
          </View>
          <View className='sh-color-row'>
            {['#FFFFFF', '#FFD93D', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F59E0B'].map((c) => (
              <View
                key={c}
                className={`sh-color-circle ${s.color === c ? 'active' : ''} ${(!isOn || disabled) ? 'disabled' : ''}`}
                style={{ background: c }}
                onClick={() => !disabled && isOn && handleControl(device, 'set_color', c)}
              >
                {s.color === c && <Text className='sh-color-check'>✓</Text>}
              </View>
            ))}
          </View>
        </View>
      </View>
    )
  }

  // ============ 渲染：设备卡片 ============
  const renderDeviceCard = (device: DeviceState) => {
    const expanded = expandedId === device.deviceId
    const s = device.currentState || {}
    const online = device.status === 1
    const isRunning = online && (s.power || s.status === 'on')
    const activeClass = isRunning ? `active-${device.deviceType}` : ''
    return (
      <View key={device.deviceId} className={`sh-card ${!online ? 'offline' : ''} ${activeClass}`}>
        <View className='sh-card-header' onClick={() => setExpandedId(expanded ? null : device.deviceId)}>
          <View className='sh-card-icon-wrap'>
            <Text className='sh-card-icon'>{getDeviceIcon(device.deviceType)}</Text>
          </View>
          <View className='sh-card-info'>
            <Text className='sh-card-name'>{device.deviceName}</Text>
            <Text className='sh-card-summary'>{getDeviceSummary(device)}</Text>
          </View>
          <View className='sh-card-right'>
            <View className={`sh-status-dot ${online ? 'online' : 'offline'}`} />
            {/* 快捷开关按钮：空调/风扇为电源按钮，灯光为灯泡按钮，点击直接开关，不触发展开 */}
            {device.deviceType === 'light' ? (
              <View
                className={`sh-quick-toggle sh-quick-light ${s.status === 'on' ? 'on' : ''} ${!online ? 'disabled' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleControl(device, 'toggle', null) }}
              >
                <Text className='sh-quick-toggle-icon'>{s.status === 'on' ? '💡' : '🌑'}</Text>
              </View>
            ) : (
              <View
                className={`sh-quick-toggle ${s.power ? 'on' : ''} ${!online ? 'disabled' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleControl(device, 'set_power', !s.power) }}
              >
                <Text className='sh-quick-toggle-icon'>⏻</Text>
              </View>
            )}
            <Text className={`sh-card-arrow ${expanded ? 'expanded' : ''}`}>›</Text>
          </View>
        </View>
        {expanded && (
          <>
            <View className='sh-card-body'>
              {device.deviceType === 'aircon'
                ? renderAirconPanel(device)
                : device.deviceType === 'fan'
                  ? renderFanPanel(device)
                  : renderLightPanel(device)}
            </View>
            {/* 管理操作栏 */}
            <View className='sh-card-actions'>
              <View
                className='sh-card-action'
                onClick={(e) => {
                  e.stopPropagation()
                  setRenameTarget(device)
                  setRenameValue(device.deviceName)
                  setRenameRoom(device.room)
                  setShowRenameModal(true)
                }}
              >
                <Text className='sh-card-action-icon'>✏️</Text>
                <Text className='sh-card-action-label'>重命名</Text>
              </View>
              <View
                className='sh-card-action sh-card-action-danger'
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteDevice(device)
                }}
              >
                <Text className='sh-card-action-icon'>🗑</Text>
                <Text className='sh-card-action-label'>删除</Text>
              </View>
            </View>
          </>
        )}
      </View>
    )
  }

  // ============ 主渲染 ============
  return (
    <View className='sh-page'>
      <NavBar title='智能家居' />

      {/* Hero 概览卡片 */}
      <View className='sh-hero'>
        <View className='sh-hero-main'>
          <View className='sh-hero-left'>
            <Text className='sh-hero-title'>我的家</Text>
            <Text className='sh-hero-sub'>
              共 {devices.length} 台 · 在线 {onlineCount} 台
            </Text>
          </View>
          <View className='sh-hero-right'>
            <View className={`sh-conn-dot ${connected ? 'on' : 'off'}`} />
            <Text className={`sh-conn-text ${connected ? 'on' : 'off'}`}>
              {connected ? '已连接' : '已断开'}
            </Text>
            <View className='sh-add-btn' onClick={() => setShowAddModal(true)}>
              <Text className='sh-add-btn-icon'>+</Text>
              <Text className='sh-add-btn-label'>添加</Text>
            </View>
          </View>
        </View>
        {/* 运行中设备快捷统计 */}
        <View className='sh-hero-running'>
          <Text className='sh-hero-running-icon'>⚡</Text>
          <Text className='sh-hero-running-num'>{runningCount}</Text>
          <Text className='sh-hero-running-label'>台设备运行中</Text>
          {/* 定时任务入口 */}
          <View
            className={`sh-schedule-entry ${schedules.length > 0 ? 'has' : ''}`}
            onClick={() => { loadSchedules(); setShowSchedules(true) }}
          >
            <Text className='sh-schedule-entry-icon'>⏰</Text>
            <Text className='sh-schedule-entry-num'>{schedules.filter(s => s.enabled === 1).length}</Text>
            <Text className='sh-schedule-entry-label'>定时任务</Text>
          </View>
        </View>
      </View>

      {/* 房间筛选 Tab（横向滚动） */}
      <View className='sh-room-tabs'>
        <ScrollView scrollX className='sh-room-tabs-scroll'>
          {roomTabs.map((room) => (
            <View
              key={room}
              className={`sh-room-tab ${activeRoom === room ? 'active' : ''}`}
              onClick={() => setActiveRoom(room)}
            >
              <Text className='sh-room-tab-text'>{room}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 设备列表 */}
      <ScrollView scrollY className='sh-list'>
        {loadingDevices && devices.length === 0 ? (
          <View className='sh-empty'>
            <Text className='sh-empty-text'>加载设备中...</Text>
          </View>
        ) : devices.length === 0 ? (
          // 空状态：无任何设备
          <View className='sh-empty sh-empty-home'>
            <Text className='sh-empty-icon'>🏠</Text>
            <Text className='sh-empty-title'>还没有设备</Text>
            <View
              className='sh-empty-add-btn'
              onClick={() => setShowAddModal(true)}
            >
              <Text className='sh-empty-add-text'>+ 添加第一台设备</Text>
            </View>
          </View>
        ) : filteredDevices.length === 0 ? (
          // 当前房间无设备
          <View className='sh-empty'>
            <Text className='sh-empty-text'>{activeRoom} 暂无设备</Text>
          </View>
        ) : (
          filteredDevices.map(renderDeviceCard)
        )}
        <View className='sh-list-bottom' />
      </ScrollView>

      {/* 底部快捷操作（三按钮等宽胶囊） */}
      <View className='sh-footer'>
        <Button
          className='sh-footer-btn sh-footer-off'
          size='large'
          onClick={handleAllOff}
        >
          ⏻ 一键全关
        </Button>
        <Button
          className='sh-footer-btn sh-footer-refresh'
          size='large'
          onClick={handleRefresh}
        >
          ↻ 刷新
        </Button>
        <Button
          className='sh-footer-btn sh-footer-add'
          size='large'
          onClick={() => setShowAddModal(true)}
        >
          + 添加设备
        </Button>
      </View>

      {/* 语音控制浮动按钮 */}
      <View
        className={`sh-voice-fab ${listening ? 'listening' : ''} ${voiceProcessing ? 'processing' : ''}`}
        onClick={toggleVoice}
      >
        <Text className='sh-voice-fab-icon'>
          {voiceProcessing ? '⏳' : listening ? '■' : '🎙'}
        </Text>
      </View>

      {/* 语音控制面板 */}
      {showVoicePanel && (
        <View className='sh-voice-panel'>
          <View className='sh-voice-panel-header'>
            <Text className='sh-voice-panel-title'>语音控制</Text>
            <Text
              className='sh-voice-panel-close'
              onClick={() => {
                setShowVoicePanel(false)
                if (listening) { try { recognitionRef.current?.stop() } catch { } setListening(false) }
              }}
            >✕</Text>
          </View>

          {/* 录音状态指示 */}
          {listening && (
            <View className='sh-voice-recording'>
              <View className='sh-voice-pulse' />
              <Text className='sh-voice-recording-text'>正在聆听... {voiceText || '请说话'}</Text>
            </View>
          )}

          {/* 处理中状态 */}
          {voiceProcessing && (
            <View className='sh-voice-processing'>
              <View className='sh-voice-spinner' />
              <Text className='sh-voice-processing-text'>AI 正在解析指令...</Text>
            </View>
          )}

          {/* 识别结果 / 手动输入 */}
          {!listening && !voiceProcessing && (
            <View className='sh-voice-input-area'>
              <Input
                className='sh-voice-input'
                placeholder='输入或编辑指令，如"打开客厅灯"'
                value={voiceText}
                onInput={(e) => setVoiceText(e.detail.value)}
                onConfirm={handleSendText}
              />
              <View
                className={`sh-voice-send-btn ${!voiceText.trim() ? 'disabled' : ''}`}
                onClick={handleSendText}
              >
                <Text className='sh-voice-send-text'>发送</Text>
              </View>
            </View>
          )}

          {/* AI 回复 */}
          {voiceReply && !voiceProcessing && (
            <View className='sh-voice-reply'>
              <Text className='sh-voice-reply-text'>{voiceReply}</Text>
            </View>
          )}

          {/* 快捷指令 */}
          {!listening && !voiceProcessing && (
            <View className='sh-voice-quick'>
              {['打开空调', '关闭空调', '开灯', '关灯', '阅读模式'].map((q) => (
                <View
                  key={q}
                  className='sh-voice-quick-item'
                  onClick={() => { setVoiceText(q); handleVoiceCommand(q) }}
                >
                  <Text className='sh-voice-quick-text'>{q}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 定时任务列表面板 */}
      {showSchedules && (
        <View className='sh-voice-panel'>
          <View className='sh-voice-panel-header'>
            <Text className='sh-voice-panel-title'>⏰ 定时任务</Text>
            <Text
              className='sh-voice-panel-close'
              onClick={() => setShowSchedules(false)}
            >✕</Text>
          </View>
          {schedules.length === 0 ? (
            <View className='sh-empty'>
              <Text className='sh-empty-text'>暂无定时任务</Text>
              <Text className='sh-empty-sub'>试试说"每天10点打开空调"</Text>
            </View>
          ) : (
            <ScrollView scrollY className='sh-schedule-list'>
              {schedules.map((s) => {
                const dev = devicesRef.current.find(d => d.deviceId === s.deviceId)
                const freqText = s.scheduleType === 'once'
                  ? `${s.executeDate || '指定日期'}`
                  : s.scheduleType === 'daily'
                    ? '每天'
                    : `每周${(s.weekdays || []).map(w => '日一二三四五六'[w]).join('、')}`
                return (
                  <View key={s.id} className={`sh-schedule-item ${s.enabled === 0 ? 'disabled' : ''}`}>
                    <View className='sh-schedule-item-main'>
                      <View className='sh-schedule-item-time'>
                        <Text className='sh-schedule-time-text'>{s.executeTime}</Text>
                        <Text className='sh-schedule-freq-text'>{freqText}</Text>
                      </View>
                      <View className='sh-schedule-item-info'>
                        <Text className='sh-schedule-device'>{dev?.deviceName || s.deviceId}</Text>
                        <Text className='sh-schedule-action'>{describeScheduleAction(s.action, s.value)}</Text>
                      </View>
                    </View>
                    <View
                      className='sh-schedule-delete'
                      onClick={() => handleDeleteSchedule(s.id)}
                    >
                      <Text className='sh-schedule-delete-icon'>🗑</Text>
                    </View>
                  </View>
                )
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* 新增设备模态框 */}
      <Modal
        visible={showAddModal}
        title='添加设备'
        onClose={() => {
          setShowAddModal(false)
          setNewDeviceName('')
          setNewDeviceRoom('')
        }}
        onConfirm={handleAddDevice}
        confirmText={saving ? '添加中...' : '添加'}
      >
        <View className='sh-form'>
          <View className='sh-form-item'>
            <Text className='sh-form-label'>设备类型</Text>
            <View className='sh-type-selector'>
              <View
                className={`sh-type-option ${newDeviceType === 'aircon' ? 'active' : ''}`}
                onClick={() => setNewDeviceType('aircon')}
              >
                <Text className='sh-type-icon'>❄️</Text>
                <Text className='sh-type-label'>空调</Text>
              </View>
              <View
                className={`sh-type-option ${newDeviceType === 'fan' ? 'active' : ''}`}
                onClick={() => setNewDeviceType('fan')}
              >
                <Text className='sh-type-icon'>🌀</Text>
                <Text className='sh-type-label'>风扇</Text>
              </View>
              <View
                className={`sh-type-option ${newDeviceType === 'light' ? 'active' : ''}`}
                onClick={() => setNewDeviceType('light')}
              >
                <Text className='sh-type-icon'>💡</Text>
                <Text className='sh-type-label'>灯光</Text>
              </View>
            </View>
          </View>
          <View className='sh-form-item'>
            <Text className='sh-form-label'>设备名称</Text>
            <Input
              className='sh-form-input'
              placeholder={newDeviceType === 'aircon' ? '如：客厅空调' : newDeviceType === 'fan' ? '如：卧室风扇' : '如：客厅主灯'}
              value={newDeviceName}
              onInput={(e) => setNewDeviceName(e.detail.value)}
              maxlength={20}
            />
          </View>
          <View className='sh-form-item'>
            <Text className='sh-form-label'>房间位置</Text>
            <Input
              className='sh-form-input'
              placeholder='如：客厅、卧室、书房'
              value={newDeviceRoom}
              onInput={(e) => setNewDeviceRoom(e.detail.value)}
              maxlength={10}
            />
          </View>
        </View>
      </Modal>

      {/* 重命名设备模态框 */}
      <Modal
        visible={showRenameModal}
        title='修改设备'
        onClose={() => {
          setShowRenameModal(false)
          setRenameTarget(null)
        }}
        onConfirm={handleRenameDevice}
        confirmText={saving ? '保存中...' : '保存'}
      >
        <View className='sh-form'>
          <View className='sh-form-item'>
            <Text className='sh-form-label'>设备名称</Text>
            <Input
              className='sh-form-input'
              placeholder='设备名称'
              value={renameValue}
              onInput={(e) => setRenameValue(e.detail.value)}
              maxlength={20}
            />
          </View>
          <View className='sh-form-item'>
            <Text className='sh-form-label'>房间位置</Text>
            <Input
              className='sh-form-input'
              placeholder='房间位置'
              value={renameRoom}
              onInput={(e) => setRenameRoom(e.detail.value)}
              maxlength={10}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}
