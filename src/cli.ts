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
  npx notify-cli <标题> <消息> [选项]
  
选项:
  --help, -h          显示帮助信息
  --app, -a <应用名>  指定要激活的应用名称 (最小化运行中的应用名称)
  --icon, -i <路径>   指定自定义图标路径
  --sound, -s <路径>  指定自定义声音文件路径, false 表示静音
  --timeout, -t <秒>  设置通知超时时间（秒）
  --verbose, -v       显示详细日志
  
示例:
  notify-cli "任务完成" "代码编译成功"
  notify-cli "提醒" "会议开始" --app Code
  notify-cli "下载完成" "文件已保存" --sound true
  notify "会议提醒" "5分钟后开会" --app Teams
  notify "构建完成" "项目构建成功" --sound C:\\Windows\\Media\\tada.wav
  `)
  process.exit(0)
}

// 解析参数
let title = args[0]
let message = args[1] || ''
let appName: string | undefined = undefined
let icon: string | undefined = undefined
let sound: string | boolean = true
let timeout: number | undefined = undefined
let verbose = false

// 处理选项
for (let i = 2; i < args.length; i++) {
  const arg = args[i]

  if (arg === '--app' || arg === '-a') {
    appName = args[i + 1]
    i++ // 跳过下一个参数
  } else if (arg === '--icon' || arg === '-i') {
    icon = args[i + 1]
    i++ // 跳过下一个参数
  } else if (arg === '--sound' || arg === '-s') {
    sound = args[i + 1]
    i++ // 跳过下一个参数
  } else if (arg === '--timeout' || arg === '-t') {
    timeout = parseInt(args[i + 1]) * 1000
    i++ // 跳过下一个参数
  } else if (arg === '--verbose' || arg === '-v') {
    verbose = true
  }
}

// 发送通知
sendNotification(title, message, {
  appName,
  icon,
  sound,
  timeout,
  verbose
}).catch(err => {
  console.error('发送通知失败:', err)
  process.exit(1)
})