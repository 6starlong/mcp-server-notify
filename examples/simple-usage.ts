import { sendNotification } from '../src/index'

// 简单示例
async function runExample() {
  try {
    console.log('发送通知...')
    await sendNotification('示例通知', '这是一个发送的通知的示例')
    console.log('通知已成功发送！')
  } catch (error) {
    console.error('发送通知时出错:', error)
  }
}

// 运行示例
runExample()