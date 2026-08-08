// 智能家居 WebSocket 客户端 - 单例模式
// H5 环境使用浏览器原生 WebSocket，RN 环境使用 Taro.connectSocket
import Taro from '@tarojs/taro'
import { IS_H5 } from './platform'

// 命令类型
export type WsCmd = 'status_query' | 'control'

// 服务端推送的消息类型
export type WsMessageType = 'status_update' | 'control_result' | 'pong'

// 通用消息结构（客户端发送）
export interface WsMessage {
  cmd: WsCmd
  deviceId?: string
  payload?: any
}

// 设备状态推送
export interface StatusUpdatePayload {
  deviceId: string
  deviceType: 'aircon' | 'fan' | 'light'
  deviceName?: string
  room?: string
  status: number // 0离线 1在线
  currentState?: any
}

// 控制结果推送
export interface ControlResultPayload {
  deviceId: string
  action: string
  value?: any
  success: boolean
  message?: string
  currentState?: any
}

type StatusUpdateCallback = (data: StatusUpdatePayload | StatusUpdatePayload[]) => void
type ControlResultCallback = (data: ControlResultPayload) => void
type ConnectionChangeCallback = (connected: boolean) => void

const RECONNECT_INTERVAL = 3000 // 断线重连间隔 3 秒
const HEARTBEAT_INTERVAL = 30000 // 心跳间隔 30 秒
const MAX_RECONNECT_ATTEMPTS = 20 // 最大重连次数

/**
 * 智能家居 WebSocket 管理类（单例）
 *
 * 用法：
 *   import { smartHomeWs } from '@/utils/smartHomeWs'
 *   smartHomeWs.connect()
 *   smartHomeWs.onStatusUpdate(data => { ... })
 *   smartHomeWs.sendControl('aircon_01', 'set_power', true)
 *   smartHomeWs.queryStatus()
 */
class SmartHomeWebSocket {
  private ws: WebSocket | Taro.SocketTask | null = null
  private url: string = ''
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private isManualClose = false
  private reconnectAttempts = 0
  private connected = false

  private statusUpdateCallbacks = new Set<StatusUpdateCallback>()
  private controlResultCallbacks = new Set<ControlResultCallback>()
  private connectionChangeCallbacks = new Set<ConnectionChangeCallback>()

  /** 当前连接状态 */
  get isConnected(): boolean {
    return this.connected
  }

  /** 获取 WebSocket 地址：ws://当前域名:3001 */
  private buildUrl(): string {
    if (IS_H5 && typeof window !== 'undefined' && window.location) {
      const host = window.location.hostname || 'localhost'
      return `ws://${host}:3001`
    }
    // RN 或其它环境回退到本地
    return 'ws://localhost:3001'
  }

  /** 建立连接 */
  connect(): void {
    if (this.ws && this.connected) return
    this.isManualClose = false
    this.url = this.buildUrl()

    try {
      if (IS_H5 && typeof WebSocket !== 'undefined') {
        // H5：浏览器原生 WebSocket
        const ws = new WebSocket(this.url)
        ws.onopen = this.handleOpen
        ws.onmessage = this.handleH5Message
        ws.onclose = this.handleClose
        ws.onerror = this.handleError
        this.ws = ws
      } else {
        // RN / 其它：Taro.connectSocket
        const task = Taro.connectSocket({ url: this.url, fail: () => {} })
        task.onOpen(this.handleOpen)
        task.onMessage((res: { data: string }) => this.handleMessage(res.data))
        task.onClose(this.handleClose)
        task.onError(this.handleError)
        this.ws = task
      }
    } catch (e) {
      console.error('[SmartHomeWs] 连接失败:', e)
      this.scheduleReconnect()
    }
  }

  /** 主动关闭连接（不再自动重连） */
  disconnect(): void {
    this.isManualClose = true
    this.clearReconnect()
    this.clearHeartbeat()
    try {
      if (this.ws) {
        if (IS_H5 && this.ws instanceof WebSocket) {
          this.ws.close()
        } else {
          ;(this.ws as Taro.SocketTask).close({})
        }
      }
    } catch (e) {
      console.error('[SmartHomeWs] 关闭失败:', e)
    }
    this.ws = null
    this.setConnected(false)
  }

  // ============ 回调注册 ============

  /** 监听设备状态推送 */
  onStatusUpdate(cb: StatusUpdateCallback): () => void {
    this.statusUpdateCallbacks.add(cb)
    return () => this.statusUpdateCallbacks.delete(cb)
  }

  /** 监听控制结果推送 */
  onControlResult(cb: ControlResultCallback): () => void {
    this.controlResultCallbacks.add(cb)
    return () => this.controlResultCallbacks.delete(cb)
  }

  /** 监听连接状态变化 */
  onConnectionChange(cb: ConnectionChangeCallback): () => void {
    this.connectionChangeCallbacks.add(cb)
    // 注册时立即回传一次当前状态
    cb(this.connected)
    return () => this.connectionChangeCallbacks.delete(cb)
  }

  // ============ 主动操作 ============

  /** 查询所有设备状态 */
  queryStatus(): void {
    this.send({ cmd: 'status_query' })
  }

  /**
   * 发送设备控制指令
   * @param deviceId 设备ID
   * @param action 动作名（如 set_power / set_temperature / set_mode ...）
   * @param value 动作值
   */
  sendControl(deviceId: string, action: string, value?: any): void {
    this.send({
      cmd: 'control',
      deviceId,
      payload: { action, value },
    })
  }

  /** 发送原始消息（连接未建立时丢弃） */
  private send(msg: WsMessage): void {
    if (!this.ws || !this.connected) {
      console.warn('[SmartHomeWs] 未连接，消息已丢弃:', msg)
      return
    }
    const data = JSON.stringify(msg)
    try {
      if (IS_H5 && this.ws instanceof WebSocket) {
        ;(this.ws as WebSocket).send(data)
      } else {
        ;(this.ws as Taro.SocketTask).send({ data })
      }
    } catch (e) {
      console.error('[SmartHomeWs] 发送失败:', e)
    }
  }

  // ============ 内部事件处理 ============

  private handleOpen = (): void => {
    console.log('[SmartHomeWs] 已连接:', this.url)
    this.reconnectAttempts = 0
    this.setConnected(true)
    this.startHeartbeat()
  }

  private handleH5Message = (event: MessageEvent): void => {
    this.handleMessage(event.data)
  }

  private handleMessage = (raw: string): void => {
    if (!raw) return
    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      // 非JSON，可能是 pong 文本
      return
    }
    const type: WsMessageType = parsed.type
    if (type === 'pong') return
    if (type === 'status_update') {
      this.statusUpdateCallbacks.forEach((cb) => cb(parsed.data as StatusUpdatePayload | StatusUpdatePayload[]))
    } else if (type === 'control_result') {
      this.controlResultCallbacks.forEach((cb) => cb(parsed.data as ControlResultPayload))
    }
  }

  private handleClose = (): void => {
    console.log('[SmartHomeWs] 连接关闭')
    this.ws = null
    this.setConnected(false)
    this.clearHeartbeat()
    if (!this.isManualClose) {
      this.scheduleReconnect()
    }
  }

  private handleError = (err?: any): void => {
    console.error('[SmartHomeWs] 连接错误:', err)
    // 错误后通常会触发 close，无需额外处理
  }

  // ============ 心跳与重连 ============

  private startHeartbeat(): void {
    this.clearHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      // 仅发送 ping 文本保活，避免重复查询设备状态
      if (this.ws && this.connected) {
        try {
          if (IS_H5 && this.ws instanceof WebSocket) {
            ;(this.ws as WebSocket).send('ping')
          } else {
            ;(this.ws as Taro.SocketTask).send({ data: 'ping' })
          }
        } catch {
          // ignore
        }
      }
    }, HEARTBEAT_INTERVAL)
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.isManualClose) return
    this.clearReconnect()
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[SmartHomeWs] 已达最大重连次数，停止重连')
      return
    }
    this.reconnectAttempts += 1
    this.reconnectTimer = setTimeout(() => {
      console.log(`[SmartHomeWs] 第 ${this.reconnectAttempts} 次重连...`)
      this.connect()
    }, RECONNECT_INTERVAL)
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private setConnected(value: boolean): void {
    const changed = this.connected !== value
    this.connected = value
    if (changed) {
      this.connectionChangeCallbacks.forEach((cb) => cb(value))
    }
  }
}

// 导出单例
export const smartHomeWs = new SmartHomeWebSocket()
export default smartHomeWs
