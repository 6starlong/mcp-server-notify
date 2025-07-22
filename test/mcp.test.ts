#!/usr/bin/env node
import { spawn } from 'child_process'
import * as path from 'path'

console.log('🔌 MCP服务器测试')
console.log('================')

const serverPath = path.join(__dirname, '../dist/mcp-server.js')
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
})

let testsCompleted = 0
const totalTests = 5

server.stdout.on('data', (data) => {
  const responses = data.toString().trim().split('\n')
  responses.forEach(response => {
    if (response.startsWith('{')) {
      try {
        const parsed = JSON.parse(response)
        if (parsed.result) {
          testsCompleted++
          console.log(`✅ 测试 ${testsCompleted}/${totalTests} 通过`)

          if (testsCompleted === totalTests) {
            console.log('\n🎉 MCP服务器测试完成！')
            server.kill()
          }
        } else if (parsed.error) {
          console.log(`❌ 错误响应: ${parsed.error.message}`)
        }
      } catch (e) {
        // 忽略非JSON响应
      }
    }
  })
})

server.stderr.on('data', (data) => {
  if (data.toString().includes('MCP Notify Server 启动')) {
    console.log('🚀 MCP服务器启动成功')
    runTests()
  }
})

function runTests() {
  // 测试1: 初始化
  setTimeout(() => {
    console.log('📋 测试初始化...')
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'mcp-test', version: '1.0.0' }
      }
    }) + '\n')
  }, 500)

  // 测试2: 列出工具
  setTimeout(() => {
    console.log('🔧 测试工具列表...')
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    }) + '\n')
  }, 1500)

  // 测试3: 调用通知工具
  setTimeout(() => {
    console.log('🔔 测试通知发送...')
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'send_notification',
        arguments: {
          title: '🧪 MCP测试',
          message: 'MCP服务器测试成功！'
        }
      }
    }) + '\n')
  }, 2500)

  // 测试4: 测试禁用图标和声音
  setTimeout(() => {
    console.log('🚫 测试禁用图标和声音...')
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'send_notification',
        arguments: {
          title: '🚫 禁用测试',
          message: '禁用图标和声音的通知',
          icon: false,
          sound: false
        }
      }
    }) + '\n')
  }, 3500)

  // 测试5: 测试本地声音文件和网络图标
  setTimeout(() => {
    console.log('🔊 测试自定义图标声音...')
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'send_notification',
        arguments: {
          title: '🔊 本地声音测试',
          message: '使用本地声音文件的通知',
          icon: 'https://avatars.githubusercontent.com/u/45755401',
          sound: 'C:\\Windows\\Media\\tada.wav'
        }
      }
    }) + '\n')
  }, 4500)
}

// 超时保护
setTimeout(() => {
  if (testsCompleted < totalTests) {
    console.log('⏰ 测试超时')
    server.kill()
  }
}, 10000)