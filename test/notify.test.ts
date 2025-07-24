#!/usr/bin/env node
import { sendNotification } from '../src/notify'

console.log('🔔 通知功能测试')
console.log('===============')

async function testBasicNotification() {
  console.log('📨 测试基本通知功能...')

  try {
    await sendNotification('🧪 功能测试', '基本通知功能测试')
    console.log('✅ 基本通知测试通过')
    return true
  } catch (error) {
    console.log('❌ 基本通知测试失败:', error)
    return false
  }
}

async function testDisabledNotification() {
  console.log('🚫 测试禁用状态...')

  try {
    await sendNotification('🚫 禁用测试', '禁用图标和声音的通知', {
      icon: false,
      sound: false
    })
    console.log('✅ 禁用状态测试通过')
    return true
  } catch (error) {
    console.log('❌ 禁用状态测试失败:', error)
    return false
  }
}

async function testCustomOptions() {
  console.log('⚙️  测试自定义选项...')

  try {
    await sendNotification('⚙️ 自定义选项测试', '测试网络图标和本地声音', {
      icon: 'https://avatars.githubusercontent.com/u/45755401',
      sound: 'C:\\Windows\\Media\\tada.wav'
    })
    console.log('✅ 自定义选项测试通过')
    return true
  } catch (error) {
    console.log('❌ 自定义选项测试失败:', error)
    return false
  }
}



async function runAllTests() {
  const results = [] as boolean[]
  const delay = 5000 // 5秒间隔

  console.log('开始执行测试，每个测试间隔 5 秒...\n')

  results.push(await testBasicNotification())
  await new Promise(resolve => setTimeout(resolve, delay))

  results.push(await testDisabledNotification())
  await new Promise(resolve => setTimeout(resolve, delay))

  results.push(await testCustomOptions())

  const passed = results.filter(r => r).length
  const total = results.length

  console.log(`\n📊 测试结果: ${passed}/${total} 通过`)

  if (passed === total) {
    console.log('🎉 所有通知功能测试通过！')
  } else {
    console.log('⚠️  部分测试失败，请检查错误信息')
  }
}

runAllTests().catch(console.error)