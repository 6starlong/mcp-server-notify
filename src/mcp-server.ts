#!/usr/bin/env node
import { sendNotification } from './notify'
import * as fs from 'fs'
import * as path from 'path'

// MCP协议类型定义
interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: any
}

// 自动读取package.json中的版本号
function getPackageVersion(): string {
  try {
    const packagePath = path.join(__dirname, '../package.json')
    const packageContent = fs.readFileSync(packagePath, 'utf8')
    const packageJson = JSON.parse(packageContent)
    return packageJson.version || '0.0.0'
  } catch (error) {
    console.error('无法读取package.json版本号:', error)
    return '0.0.0'
  }
}

// 服务器配置
const serverInfo = {
  name: 'mcp-server-notify',
  version: getPackageVersion()
}

const capabilities = {
  tools: {}
}

// 日志函数
function log(message: string) {
  console.error(`[MCP-Server-Notify] ${new Date().toISOString()}: ${message}`)
}

// 发送响应
function sendResponse(response: JsonRpcResponse | JsonRpcNotification) {
  const jsonString = JSON.stringify(response)
  process.stdout.write(jsonString + '\n')
  log(`发送响应: ${jsonString}`)
}

// 发送错误响应
function sendError(id: string | number, code: number, message: string, data?: any) {
  sendResponse({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data
    }
  })
}

// 处理初始化请求
async function handleInitialize(request: JsonRpcRequest) {
  log('处理初始化请求')

  const clientInfo = request.params?.clientInfo || {}
  log(`客户端信息: ${JSON.stringify(clientInfo)}`)

  sendResponse({
    jsonrpc: '2.0',
    id: request.id,
    result: {
      protocolVersion: '2024-11-05',
      capabilities,
      serverInfo
    }
  })
}

// 处理工具列表请求
async function handleListTools(request: JsonRpcRequest) {
  log('处理工具列表请求')

  const tools = [
    {
      name: 'send_notification',
      description: '发送系统桌面通知。可用于任务完成提醒、状态更新、重要事件通知等场景。支持自定义图标、声音和应用激活。',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: '通知标题，应该简洁明了地概括通知的主要内容'
          },
          message: {
            type: 'string',
            description: '通知的详细内容，可以包含具体信息和上下文'
          },
          appName: {
            type: 'string',
            description: '点击通知后要激活的应用名称（可选）'
          },
          icon: {
            type: 'string',
            description: '图标路径或URL（可选）'
          },
          sound: {
            type: ['string', 'boolean'],
            description: '声音设置（可选）：声音文件路径或URL，设置为 false 表示静音'
          },
          timeout: {
            type: 'number',
            description: '通知超时时间，单位秒（可选，默认10）'
          }
        },
        required: ['title', 'message']
      }
    }
  ]

  sendResponse({
    jsonrpc: '2.0',
    id: request.id,
    result: {
      tools
    }
  })
}

// 处理工具调用请求
async function handleCallTool(request: JsonRpcRequest) {
  const { name, arguments: args } = request.params || {}

  log(`调用工具: ${name}，参数: ${JSON.stringify(args)}`)

  if (name !== 'send_notification') {
    sendError(request.id, -32602, `未知工具: ${name}`)
    return
  }

  // 验证必需参数
  if (!args?.title || !args?.message) {
    sendError(request.id, -32602, 'Missing required parameters: title and message are required')
    return
  }

  try {
    // 调用通知函数
    await sendNotification(args.title, args.message, {
      appName: args.appName,
      icon: args.icon,
      sound: args.sound,
      timeout: args.timeout,
    })

    log(`通知发送成功: ${args.title}`)

    sendResponse({
      jsonrpc: '2.0',
      id: request.id,
      result: {
        content: [
          {
            type: 'text',
            text: `✅ 通知发送成功\n标题: ${args.title}\n内容: ${args.message}${args.appName ? `\n目标应用: ${args.appName}` : ''}`
          }
        ]
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log(`通知发送失败: ${errorMessage}`)
    sendError(request.id, -32603, `发送通知失败: ${errorMessage}`, {
      title: args.title,
      message: args.message,
      error: errorMessage
    })
  }
}

// 处理消息
async function handleMessage(message: string) {
  try {
    log(`收到消息: ${message}`)
    const request: JsonRpcRequest = JSON.parse(message)

    // 确保所有响应都有正确的 id，没有则不需要响应
    if (request.id === undefined || request.id === null) {
      return
    }

    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      sendError(request.id || 0, -32600, 'Invalid Request: jsonrpc must be "2.0"')
      return
    }

    switch (request.method) {
      case 'initialize':
        await handleInitialize(request)
        break
      case 'tools/list':
        await handleListTools(request)
        break
      case 'tools/call':
        await handleCallTool(request)
        break
      default:
        sendError(request.id, -32601, `Method not found: ${request.method}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log(`处理消息时出错: ${errorMessage}`)
    sendError(0, -32700, 'Parse error', errorMessage)
  }
}

// 设置标准输入输出处理
function setupStdioHandling() {
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (data) => {
    const lines = data.toString().trim().split('\n')
    for (const line of lines) {
      if (line.trim()) {
        handleMessage(line.trim())
      }
    }
  })

  log('MCP Notify Server 启动')
}

// 启动服务器
setupStdioHandling()