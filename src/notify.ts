import path from 'path'
import notifier from 'node-notifier'
import { activateWindow, getCallerAppInfo } from './win-utils'

// 存储活动通知的映射
const activeNotifications = new Map<string, { processName: string; pid: number }>()

/**
 * 发送 Windows 系统通知
 * @param title 通知标题
 * @param message 通知内容
 * @param options 配置选项
 */
export async function sendNotification(
  title: string,
  message: string,
  options?: {
    appName?: string // 指定要激活的应用名称
    sound?: boolean | string
    icon?: string
    timeout?: number
    verbose?: boolean // 是否显示详细日志
  }
): Promise<void> {
  const notificationId = `notification_${Date.now()}`
  let targetApp: { processName: string; pid: number } | null = null
  const verbose = options?.verbose || false

  // 获取目标应用
  targetApp = await getCallerAppInfo(verbose)

  // 存储通知信息
  if (targetApp) {
    activeNotifications.set(notificationId, targetApp)
  }

  return new Promise((resolve, reject) => {
    const notifyOptions = {
      title,
      message,
      icon: options?.icon || path.join(__dirname, '../assets/icon.png'),
      sound: options?.sound || true,
      wait: true,
      timeout: options?.timeout || 10000,
      id: notificationId
    }

    // 监听点击事件
    notifier.on('click', async (_notifierObject: any, notificationOptions: any) => {
      const clickedId = notificationOptions?.id || notificationId
      const storedApp = activeNotifications.get(clickedId)

      if (storedApp) {
        await activateWindow(storedApp.processName, verbose)
      }

      activeNotifications.delete(clickedId)
    })

    // 监听超时事件
    notifier.on('timeout', (_notifierObject: any, notificationOptions: any) => {
      const timeoutId = notificationOptions?.id || notificationId
      activeNotifications.delete(timeoutId)
    })

    // 发送通知
    notifier.notify(notifyOptions, (err: Error | null) => {
      if (err) {
        console.error('通知发送失败:', err)
        activeNotifications.delete(notificationId)
        reject(err)
      } else {
        resolve()
      }
    })
  })
}