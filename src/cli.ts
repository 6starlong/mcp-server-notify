#!/usr/bin/env node
import { sendNotification } from './notify'

// 解析命令行参数
const args = process.argv.slice(2)

// 显示帮助信息
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`
系统通知工具

用法:
  notify-cli <标题> <消息> [选项]
  
选项:
  --help, -h          显示帮助信息
  --icon, -i <路径>   自定义图标文件路径或URL, false 禁用或者默认
  --sound, -s <路径>  自定义声音文件路径或URL, false 禁用或者默认
  --open, -o <应用名> 指定点击通知后要打开的应用名称, 默认当前应用
  
示例:
  notify-cli "标题" "消息内容"
  notify-cli "任务完成" "代码编译成功" --open Code
  notify-cli "测试通过" "所有单元测试已通过" --sound C:\\Windows\\Media\\tada.wav
  `)
  process.exit(0)
}

// 解析参数
let title = args[0]
let message = args[1] || ''
let icon: string | undefined = undefined
let sound: string | boolean = true
let open: string | undefined = undefined

// 处理选项
for (let i = 2; i < args.length; i++) {
  const arg = args[i]

  if (arg === '--icon' || arg === '-i') {
    icon = args[i + 1]
    i++ // 跳过下一个参数
  } else if (arg === '--sound' || arg === '-s') {
    sound = args[i + 1]
    i++ // 跳过下一个参数
  } else if (arg === '--open' || arg === '-o') {
    open = args[i + 1]
    i++ // 跳过下一个参数
  }
}

// 发送通知
sendNotification(title, message, {
  icon,
  sound,
  open,
}).catch(err => {
  console.error('发送通知失败:', err)
  process.exit(1)
})