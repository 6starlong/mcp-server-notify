import fs from 'fs'
import os from 'os'
import path from 'path'
import https from 'https'
import sound from 'sound-play'
import notifier from 'node-notifier'
import { activateWindow, getCallerAppInfo } from './win-utils'

// 获取当前平台
const platform = os.platform()

// 存储活动通知的映射
const activeNotifications = new Map<string, { processName: string; pid: number }>()

/**
 * 播放声音，支持网络 URL 和本地文件路径
 * @param soundPathOrUrl 声音的 URL 或本地路径
 */
async function playSound(soundPathOrUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 如果是网络链接，则下载后播放
    if (soundPathOrUrl.startsWith('http')) {
      const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.wav`)
      const file = fs.createWriteStream(tempFilePath)

      https.get(soundPathOrUrl, (response) => {
        response.pipe(file)
        file.on('finish', () => {
          file.close(() => resolve())
          sound.play(tempFilePath).catch(err => console.error(`播放失败: ${err}`))
        })
      }).on('error', (err) => {
        reject(new Error(`下载音频时出错: ${err.message}`))
      })
    } else {
      // 如果是本地文件，直接播放
      resolve()
      sound.play(soundPathOrUrl).catch(err => console.error(`播放失败: ${err}`))
    }
  })
}

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
    icon?: string
    sound?: string | boolean
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

  if (options?.sound !== false) {
    // 如果sound是字符串，则使用指定的声音文件，否则使用默认声音
    const soundSource = typeof options?.sound === 'string'
      ? options?.sound
      : path.join(__dirname, '../assets/done.wav')

    // 播放声音
    await playSound(soundSource)
  }

  return new Promise(async (resolve, reject) => {
    const notifyOptions = {
      title,
      message,
      icon: options?.icon || path.join(__dirname, '../assets/icon.png'),
      sound: false, // 禁用系统声音，我们自己控制声音播放
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