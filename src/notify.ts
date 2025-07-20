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
 * 获取图标的本地路径，自动处理网络 URL 和本地文件。
 * @param iconPathOrUrl 图标的 URL 或本地路径
 * @returns {Promise<string>} 最终的本地图标文件路径
 */
async function getIconPath(iconPathOrUrl?: string): Promise<string> {
  const defaultIcon = path.join(__dirname, '../assets/icon.png')
  if (!iconPathOrUrl) return defaultIcon

  // 处理网络 URL
  if (iconPathOrUrl.startsWith('http')) {
    const downloadedPath = await downloadToTemp(iconPathOrUrl)
    return downloadedPath || defaultIcon
  }

  // 处理本地文件路径
  if (fs.existsSync(iconPathOrUrl)) {
    return iconPathOrUrl
  } else {
    console.warn(`本地图标路径不存在: ${iconPathOrUrl}，将使用默认图标。`)
    return defaultIcon
  }
}

/**
 * 播放声音，自动处理网络 URL 和本地文件。
 * @param soundPathOrUrl 声音的 URL 或本地路径
 * @returns {Promise<void>} 播放声音的 Promise
 */
async function playSound(soundPathOrUrl: string): Promise<void> {
  let finalPath = soundPathOrUrl

  if (soundPathOrUrl.startsWith('http')) {
    const downloadedPath = await downloadToTemp(soundPathOrUrl)
    console.log(downloadedPath)
    if (!downloadedPath) {
      console.error(`无法下载声音文件: ${soundPathOrUrl}`)
      return // 下载失败则不播放
    }
    finalPath = downloadedPath
  }

  // 播放本地文件 (原始路径或下载后的临时路径)
  sound.play(finalPath).catch(err => console.error(`播放声音失败: ${finalPath}，错误: ${err}`))
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
  }
): Promise<void> {
  const notificationId = `notification_${Date.now()}`
  let targetApp: { processName: string; pid: number } | null = null
  // 获取目标应用
  targetApp = await getCallerAppInfo()

  // 存储通知信息
  if (targetApp) {
    activeNotifications.set(notificationId, targetApp)
  }

  // 获取图标路径，如果是网络地址则先下载
  const iconPath = await getIconPath(options?.icon as string)

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
      appName: '',
      title,
      message,
      icon: iconPath,
      sound: false, // 禁用系统声音，我们自己控制声音播放
      wait: true,
      timeout: options?.timeout || 10,
      id: notificationId
    }

    // 监听点击事件
    notifier.on('click', async (_notifierObject: any, notificationOptions: any) => {
      const clickedId = notificationOptions?.id || notificationId
      const storedApp = activeNotifications.get(clickedId)
      const appName = options?.appName || storedApp?.processName
      console.log('Open App:', appName)

      if (appName) {
        await activateWindow(appName)
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

/**
 * 从 URL 下载文件到临时目录。
 * @param url 要下载的文件的 URL
 * @returns {Promise<string | null>} 成功则返回文件的本地路径，否则返回 null
 */
function downloadToTemp(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const fileName = path.basename(new URL(url).pathname) || 'download'
      const tempFilePath = path.join(os.tmpdir(), `notify_${Date.now()}_${fileName}`)

      const file = fs.createWriteStream(tempFilePath)

      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          console.error(`下载文件失败: ${url}，状态码: ${response.statusCode}`)
          resolve(null)
          return
        }
        response.pipe(file)
        file.on('finish', () => file.close(() => resolve(tempFilePath)))
        file.on('error', (err) => {
          console.error(`写入临时文件时出错: ${err.message}`)
          fs.unlink(tempFilePath, () => resolve(null)) // 清理失败的文件
        })
      }).on('error', (err) => {
        console.error(`下载文件时发生网络错误: ${err.message}`)
        resolve(null)
      })
    } catch (error) {
      console.error(`提供的 URL 无效: ${url}，错误: ${error}`)
      resolve(null)
    }
  })
}