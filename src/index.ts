import { sendNotification } from './notify'
import { activateWindow, getCallerAppInfo, getProcessTree } from './win-utils'

// 导出主要函数
export {
  sendNotification,
  activateWindow,
  getCallerAppInfo,
  getProcessTree
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  async function test() {
    console.log('=== 通知测试 ===')
    const args = process.argv.slice(2)

    if (args.length > 1) {
      // 指定应用模式
      const title = args[0]
      const message = args[1]

      await sendNotification(title, message)
      console.log(`已发送通知: ${title} ${message}`)
    } else {
      // 默认测试：智能检测调用者应用
      await sendNotification(
        '通知标题',
        '通知消息内容'
      )
      console.log('已发送通知')
    }
  }

  test().catch(err => console.error('通知发送失败:', err))
}