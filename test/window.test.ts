#!/usr/bin/env tsx
/**
 * 窗口管理器测试
 */

import { windowManager, getCallerAppInfo } from '../src/window-manager'

function showUsage() {
  console.log('🪟 窗口管理器测试')
  console.log('===============')
  console.log('')
  console.log('用法:')
  console.log('  tsx test/window.test.ts <目标>           # 测试窗口管理')
  console.log('  tsx test/window.test.ts caller           # 测试调用应用信息')
  console.log('')
  console.log('支持的目标类型:')
  console.log('  应用名:    notepad, chrome, code')
  console.log('  完整路径:  C:\\Program Files\\App\\app.exe')
  console.log('  网址:      https://www.google.com')
  console.log('')
  console.log('示例:')
  console.log('  tsx test/window.test.ts notepad')
  console.log('  tsx test/window.test.ts chrome')
  console.log('  tsx test/window.test.ts https://www.google.com')
}

async function testWindowManager(target: string) {
  console.log(`🎯 测试窗口管理: ${target}`)
  console.log('===============')
  
  try {
    const result = await windowManager(target)
    
    console.log(`\n结果: ${result.success ? '✅ 成功' : '❌ 失败'}`)
    console.log(`操作: ${result.action}`)
    
    if (result.info) {
      console.log('详情:')
      Object.entries(result.info).forEach(([key, value]) => {
        if (value !== undefined) {
          console.log(`  ${key}: ${value}`)
        }
      })
    }
    
    if (result.info?.suggestion) {
      console.log(`\n💡 建议: ${result.info.suggestion}`)
    }
    
  } catch (error) {
    console.log('❌ 测试失败:', error)
  }
}

async function testCallerInfo() {
  console.log('🔍 测试调用应用信息')
  console.log('===============')
  
  try {
    const callerApp = await getCallerAppInfo()
    if (callerApp) {
      console.log(`\n✅ 调用应用: ${callerApp.processName}`)
      console.log(`📋 进程ID: ${callerApp.pid}`)
    } else {
      console.log('\n❌ 未找到调用应用信息')
    }
  } catch (error) {
    console.log('\n❌ 获取调用应用信息失败:', error)
  }
}

// 处理命令行参数
const args = process.argv.slice(2)

if (args.length === 0) {
  showUsage()
} else if (args[0] === 'caller') {
  testCallerInfo().catch(console.error)
} else {
  const target = args[0]
  testWindowManager(target).catch(console.error)
}