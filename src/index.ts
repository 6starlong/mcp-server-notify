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
    await sendNotification(
      '通知标题',
      '通知消息内容'
    )
    console.log('已发送通知')
  }

  test().catch(err => console.error('通知发送失败:', err))
}