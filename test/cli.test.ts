#!/usr/bin/env node
import { spawn } from 'child_process'
import * as path from 'path'

console.log('💻 CLI工具测试')
console.log('==============')

const cliPath = path.join(__dirname, '../dist/index.js')

async function testCLI() {
  console.log('🔔 测试基本通知...')
  
  const cli = spawn('node', [cliPath, '-c', '🧪 CLI测试', 'CLI工具测试成功！'], {
    stdio: ['pipe', 'pipe', 'pipe']
  })

  let output = ''
  let errorOutput = ''

  cli.stdout.on('data', (data) => {
    output += data.toString()
  })

  cli.stderr.on('data', (data) => {
    errorOutput += data.toString()
  })

  cli.on('close', (code) => {
    if (code === 0) {
      console.log('✅ CLI基本功能测试通过')
      testCLIHelp()
    } else {
      console.log('❌ CLI基本功能测试失败')
      console.log('错误输出:', errorOutput)
    }
  })
}

async function testCLIHelp() {
  console.log('❓ 测试CLI帮助信息...')
  
  const cli = spawn('node', [cliPath, '--help'], {
    stdio: ['pipe', 'pipe', 'pipe']
  })

  let helpOutput = ''
  
  cli.stdout.on('data', (data) => {
    helpOutput += data.toString()
  })

  cli.on('close', (code) => {
    if (code === 0 && helpOutput.includes('mcp-notify')) {
      console.log('✅ CLI帮助信息测试通过')
      console.log('\n🎉 所有CLI测试完成！')
    } else {
      console.log('❌ CLI帮助信息测试失败')
    }
  })
}

// 开始测试
testCLI()