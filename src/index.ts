#!/usr/bin/env node
import { join } from 'path'
import { sendNotification } from './notify'

const args = process.argv.slice(2)
let command = args[0]

// 处理CLI参数
const isCliMode = command === '-c' || command === '--cli'

// 显示帮助信息
function showHelp() {
  console.log(`
🔔 mcp-notify - 桌面通知工具

用法:
  mcp-notify -c <标题> <消息> [选项]

选项:
  -h, --help           显示帮助信息
  -c, --cli            CLI模式
  -i, --icon <路径>    自定义图标文件路径或URL
  -s, --sound <路径>   自定义声音文件路径或URL
  -o, --open <应用名>  点击通知后要打开的应用名称

示例:
  mcp-notify -c "任务完成" "代码编译成功"
  mcp-notify -c "任务完成" "代码编译成功" --open Code
  mcp-notify -c "测试通过" "所有单元测试已通过" --sound C:\\Windows\\Media\\tada.wav
`)
}

// 启动MCP服务器
function startMcpServer() {
  const serverPath = join(__dirname, 'mcp-server.js')
  require(serverPath)
}

// CLI功能
async function runCli(cliArgs: string[]) {
  // 检查是否有足够的参数
  if (cliArgs.length < 1) {
    showHelp()
    process.exit(0)
  }

  // 解析参数
  let title = cliArgs[0]
  let message = cliArgs[1] || ''
  let icon: string | boolean | undefined = undefined
  let sound: string | boolean = true
  let open: string | undefined = undefined

  // 处理选项
  for (let i = 2; i < cliArgs.length; i++) {
    const arg = cliArgs[i]

    if (arg === '--icon' || arg === '-i') {
      const iconValue = cliArgs[i + 1]
      icon = iconValue === 'false' ? false : iconValue
      i++ // 跳过下一个参数
    } else if (arg === '--sound' || arg === '-s') {
      const soundValue = cliArgs[i + 1]
      sound = soundValue === 'false' ? false : soundValue
      i++ // 跳过下一个参数
    } else if (arg === '--open' || arg === '-o') {
      open = cliArgs[i + 1]
      i++ // 跳过下一个参数
    }
  }

  // 发送通知
  try {
    await sendNotification(title, message, {
      icon,
      sound,
      open,
    })
  } catch (err) {
    console.error('发送通知失败:', err)
    process.exit(1)
  }
}

// 主逻辑
if (args.includes('--help') || args.includes('-h')) {
  showHelp()
  process.exit(0)
}

if (isCliMode) {
  // CLI模式，跳过-c或--cli参数
  runCli(args.slice(1))
} else {
  // 默认启动MCP服务器
  startMcpServer()
}