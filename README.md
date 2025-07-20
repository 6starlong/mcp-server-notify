# mcp-notify-server

一个简单轻量的用于 Agent 任务完成后发送系统桌面原生通知的 Model Context Protocol (MCP) 服务。

## 特性

- 🔔 发送系统桌面原生通知
- 🎯 支持点击通知后激活指定应用（Windows）
- 🎵 自定义声音和图标支持（本地文件或网络URL）
- 🤖 完整的 MCP 协议支持，可与AI助手无缝集成
- 📱 跨平台支持（基于 `node-notifier`）
- ⚡ 轻量级，零配置启动

## 安装

```bash
npm install -g mcp-notify-server
# 或者
pnpm add -g mcp-notify-server
```

## 使用方法

### 1. 命令行使用

```bash
# 基本通知
notify-cli "标题" "消息内容"

# 带应用激活
notify-cli "任务完成" "代码编译成功" --app Code

# 自定义图标和声音
notify-cli "提醒" "会议开始" --icon ./icon.png --sound ./alert.wav
```

### 2. MCP服务器模式

#### 在Kiro中配置

创建或编辑 `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "notify": {
      "command": "notify-server",
      "args": [],
      "disabled": false,
      "autoApprove": ["send_notification"]
    }
  }
}
```

#### 使用示例

配置完成后，你可以直接对AI助手说：

- "请发送一个通知，标题是'任务完成'，内容是'代码编译成功'"
- "发送通知提醒我开会，并激活微信应用"
- "任务完成后通知我，标题用'构建完成'"

### 3. 编程接口

```typescript
import { sendNotification } from 'mcp-notify-server'

await sendNotification('标题', '消息', {
  appName: 'Code',           // 要激活的应用
  icon: './icon.png',        // 图标路径或URL
  sound: './sound.wav',      // 声音文件或false
  timeout: 5000,             // 超时时间(毫秒)
  verbose: true              // 详细日志
})
```

## 开发和测试

```bash
# 构建项目
pnpm run build

# 快速测试
pnpm test

# 完整测试
pnpm test:full

# 开发模式运行MCP服务器
pnpm run dev:mcp

# 开发模式运行CLI
pnpm run dev:cli

# 启动MCP服务器
pnpm run start:mcp
```


## 许可证

MIT License

## 贡献

欢迎提交问题和PR！
