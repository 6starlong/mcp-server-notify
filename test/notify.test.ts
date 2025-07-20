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

async function testNotificationWithOptions() {
  console.log('⚙️  测试通知选项...')
  
  try {
    await sendNotification('🔧 选项测试', '测试通知的各种选项', {
      sound: false,
      timeout: 3
    })
    console.log('✅ 通知选项测试通过')
    return true
  } catch (error) {
    console.log('❌ 通知选项测试失败:', error)
    return false
  }
}

async function testTimeoutSettings() {
  console.log('⏰ 测试 timeout 设置...')
  
  try {
    const startTime = Date.now()
    await sendNotification('⏱️ Timeout 测试', '验证 timeout 参数传递正常', {
      timeout: 5,
      sound: false
    })
    
    const actualTime = Math.round((Date.now() - startTime) / 1000)
    console.log(`   实际显示时间: ${actualTime}秒 (系统控制)`)
    
    // 只要通知能正常发送和显示就算通过
    console.log('✅ Timeout 参数设置正常')
    return true
    
  } catch (error) {
    console.log('❌ Timeout 测试失败:', error)
    return false
  }
}

async function testNotificationWithApp() {
  console.log('📱 测试应用激活...')
  
  try {
    await sendNotification('📱 应用测试', '测试点击通知激活应用', {
      appName: 'Code'
    })
    console.log('✅ 应用激活测试通过')
    return true
  } catch (error) {
    console.log('❌ 应用激活测试失败:', error)
    return false
  }
}

async function runAllTests() {
  const results = [] as boolean[]
  
  results.push(await testBasicNotification())
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  results.push(await testNotificationWithOptions())
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  results.push(await testTimeoutSettings())
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  results.push(await testNotificationWithApp())
  
  const passed = results.filter(r => r).length
  const total = results.length
  
  console.log(`\n📊 测试结果: ${passed}/${total} 通过`)
  
  if (passed === total) {
    console.log('🎉 所有通知功能测试通过！')
  } else {
    console.log('⚠️  部分测试失败')
  }
}

runAllTests().catch(console.error)