# mcp-server-notify

一个轻量级的桌面通知工具，支持命令行直接调用和 MCP 协议集成，让 AI 助手能够智能发送系统通知。

## 特性

- 🔔 发送系统桌面原生通知
- 🎵 自定义声音和图标支持（本地文件或网络URL）
- 🤖 完整的 MCP 协议支持，可与AI助手无缝集成
- 📱 跨平台支持（基于 `node-notifier`）
- 🎯 支持点击通知后激活指定应用（Windows）
- ⚡ 轻量级，零配置启动

## 安装

```bash
npm install -g mcp-server-notify
# 或者
pnpm add -g mcp-server-notify
```

## 使用方法

### 1. MCP服务

#### 在Kiro中配置

创建或编辑 `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "mcp-notify-server": {
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

- "10分钟后提醒我"
- "任务完成后通知我，标题用'构建完成'"
- "帮我设置一个番茄钟，25分钟后通知我休息"

您也可以将提示词作为规则或者记忆添加到对应的配置中，这样就不必每次手动输入了。

### 2. 命令行使用

```bash
# 基本通知
notify-cli "标题" "消息内容"

# 流程通知
notify-cli "任务完成" "代码编译成功" --open Code

# 自动化任务通知
notify-cli "测试通过" "所有单元测试已通过" --sound C:\\Windows\\Media\\tada.wav

# 集成到脚本中
npm run build && notify-cli "构建成功" "可以开始部署了"
```

### 3. 编程接口

```typescript
import { sendNotification } from 'mcp-server-notify'

await sendNotification('标题', '消息', {
  icon: './icon.png',       // 图标路径或URL
  sound: './sound.wav',     // 声音文件或false
  open: 'Code',             // 点击通知后要激活的应用名称
  appName: '系统通知'        // 自定义通知应用ID（显示名称）
})
```

## 开发和测试

```bash
# 构建项目
pnpm run build

# 测试
pnpm test

# 开发模式运行MCP服务器
pnpm run dev:mcp

# 开发模式运行CLI
pnpm run dev:cli
```


## 许可证

MIT License

## 贡献

欢迎提交问题和PR！
