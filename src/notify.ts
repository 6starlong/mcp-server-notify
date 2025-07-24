import fs from 'fs'
import os from 'os'
import path from 'path'
import https from 'https'
import sound from 'sound-play'
import notifier from 'node-notifier'
import { windowManager, getCallerAppInfo } from './window-manager'

// 存储活动通知的映射
const activeNotifications = new Map<string, { processName: string; pid: number }>()

/**
 * 获取图标路径，支持禁用图标或使用默认图标
 * @param iconPath 图标路径：string（文件路径/URL）、false（禁用）、或者默认
 * @returns {Promise<string>} 返回文件路径
 */
async function getIconPath(iconPath?: string | boolean): Promise<string> {
  // 禁用图标
  if (iconPath === false) {
    return 'none'
  }

  const defaultIcon = path.join(__dirname, '../assets/coding.png')

  // 使用指定的图标路径或URL
  if (typeof iconPath === 'string') {
    // 处理本地文件路径
    if (!iconPath.startsWith('http')) {
      const finalPath = path.isAbsolute(iconPath)
        ? iconPath
        : path.join(__dirname, iconPath)

      if (fs.existsSync(finalPath)) {
        return finalPath
      } else {
        console.warn(`本地图标路径不存在，使用默认图标: ${iconPath}`)
        return defaultIcon
      }
    }

    // 处理网络 URL
    const downloadedPath = await downloadToTemp(iconPath)
    if (!downloadedPath) {
      console.warn(`网络图标下载失败，使用默认图标: ${iconPath}`)
      return defaultIcon
    }

    return downloadedPath
  }

  // 其他情况使用默认图标
  return defaultIcon
}

/**
 * 播放声音，支持禁用声音或使用默认声音
 * @param soundPath 声音路径：string（文件路径/URL）、false（禁用）、或者默认
 * @returns {Promise<void>} 播放声音的 Promise
 */
async function playSound(soundPath?: string | boolean): Promise<void> {
  // 禁用声音
  if (soundPath === false) {
    return
  }

  const defaultSound = path.join(__dirname, '../assets/done.wav')
  let finalPath = soundPath

  // 使用指定的声音路径或URL
  if (typeof soundPath === 'string') {
    // 处理本地文件路径
    if (!soundPath.startsWith('http')) {
      finalPath = path.isAbsolute(soundPath)
        ? soundPath
        : path.join(__dirname, soundPath)

      if (!fs.existsSync(finalPath)) {
        console.warn(`本地声音路径不存在，使用默认声音: ${soundPath}`)
        finalPath = defaultSound
      }
    } else {
      // 处理网络URL
      console.log(`尝试下载声音文件: ${soundPath}`)
      const downloadedPath = await downloadToTemp(soundPath)

      if (!downloadedPath) {
        console.warn(`网络声音下载失败，使用默认声音: ${soundPath}`)
        finalPath = defaultSound
        return
      }

      finalPath = downloadedPath
    }
  } else {
    finalPath = defaultSound
  }

  // 播放本地文件 (原始路径或下载后的临时路径)
  sound.play(finalPath)
}

/**
 * 发送系统通知
 * @param title 通知标题
 * @param message 通知内容
 * @param options 配置选项
 */
export async function sendNotification(
  title: string,
  message: string,
  options?: {
    icon?: string | boolean // 文件路径/URL, 禁用或者默认
    sound?: string | boolean // 文件路径/URL, 禁用或者默认
    open?: string // 点击通知后要激活的应用名称
  }
): Promise<void> {
  const notificationId = `notification_${Date.now()}`
  
  // 获取调用通知的应用（通过进程树查找，仅 Windows 平台有效）
  const targetApp = await getCallerAppInfo()

  // 存储通知信息（仅当获取到有效信息时）
  if (targetApp) {
    activeNotifications.set(notificationId, targetApp)
  }

  // 获取图标路径
  const iconPath = await getIconPath(options?.icon)

  // 播放声音
  await playSound(options?.sound)

  const notifyOptions: any = {
    // Required
    title,
    // Required
    message,
    // String | Boolean. 自定义图标显示
    icon: iconPath,
    // String | Boolean. 自定义声音播放
    sound: false,
    // Number. ID 用于关闭通知。
    id: notificationId,
    // String. 自定义应用 ID - 用于替换 SnoreToast
    appID: undefined,
    // Number. 关闭之前创建的通知。
    remove: undefined,
    // String (path, application, app id).
    install: undefined,
    // 等待回调
    wait: true,
    // 其他选项
    ...options
  }

  // 创建一次性点击事件处理器
  const clickHandler = async (_notifierObject: any, notificationOptions: any) => {
    const clickedId = notificationOptions?.id || notificationId

    // 只处理当前通知的点击事件
    if (clickedId !== notificationId) {
      return
    }

    const storedApp = activeNotifications.get(clickedId)
    const appToOpen = options?.open || storedApp?.processName

    if (appToOpen) {
      try {
        await windowManager(appToOpen)
      } catch (err) {
        console.error('激活窗口失败:', err)
      }
    }

    // 清理通知记录和事件监听器
    activeNotifications.delete(clickedId)
    notifier.removeListener('click', clickHandler)
  }

  // 监听点击事件
  notifier.on('click', clickHandler)

  // 发送通知
  try {
    notifier.notify(notifyOptions)
    console.log('通知发送成功')
  } catch (error) {
    console.error('通知发送失败:', error)
    activeNotifications.delete(notificationId)
    throw error
  }
}

/**
 * 从 URL 下载文件到临时目录，带超时机制。
 * @param url 要下载的文件的 URL
 * @param timeoutMs 超时时间（毫秒），默认3秒
 * @returns {Promise<string | null>} 成功则返回文件的本地路径，否则返回 null
 */
function downloadToTemp(url: string, timeoutMs: number = 3000): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn(`下载超时: ${url}`)
      resolve(null)
    }, timeoutMs)

    try {
      const fileName = path.basename(new URL(url).pathname) || 'download'
      const tempFilePath = path.join(os.tmpdir(), `notify_${Date.now()}_${fileName}`)

      const file = fs.createWriteStream(tempFilePath)

      const request = https.get(url, (response) => {
        if (response.statusCode !== 200) {
          console.error(`下载文件失败: ${url}，状态码: ${response.statusCode}`)
          clearTimeout(timeout)
          resolve(null)
          return
        }
        response.pipe(file)
        file.on('finish', () => {
          file.close(() => {
            clearTimeout(timeout)
            resolve(tempFilePath)
          })
        })
        file.on('error', (err) => {
          console.error(`写入临时文件时出错: ${err.message}`)
          clearTimeout(timeout)
          fs.unlink(tempFilePath, () => resolve(null)) // 清理失败的文件
        })
      }).on('error', (err) => {
        console.error(`下载文件时发生网络错误: ${err.message}`)
        clearTimeout(timeout)
        resolve(null)
      })

      // 设置请求超时
      request.setTimeout(timeoutMs, () => {
        request.destroy()
        console.warn(`请求超时: ${url}`)
        clearTimeout(timeout)
        resolve(null)
      })
    } catch (error) {
      console.error(`提供的 URL 无效: ${url}，错误: ${error}`)
      clearTimeout(timeout)
      resolve(null)
    }
  })
}
