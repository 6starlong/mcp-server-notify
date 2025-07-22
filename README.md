# mcp-server-notify

一个轻量级的桌面通知工具，支持命令行直接调用和 MCP 协议集成，让 AI 助手能够智能发送系统通知。

## 特性

- 🔔 发送系统桌面原生通知
- 🤖 完整的 MCP 协议支持，可与AI助手无缝集成
- 🎵 自定义声音和图标支持（本地文件或网络URL）
- 📱 跨平台支持（基于 `node-notifier`）
- 🎯 支持点击通知后激活指定应用（Windows）
- ⚡ 轻量级，零配置启动

## 安装

确保安装 [Node.js 20](https://nodejs.org/en/download) 或更高版本

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

配置完成后，您可以通过以下方式触发通知：

```markdown
- "任务完成后通知我"
- "测试全部通过了，庆祝一下"
- "发现安全漏洞，用警告音效和图标通知我"
- "通知我代码审核结果，点击时激活VSCode"
- "帮我设置一个番茄钟，25分钟后提醒我休息"
```

你可以通过在 `rules.md` 中创建自定义规则来避免每次手动输入这些偏好设置。例如，设置默认的通知样式、常用的声音文件路径、或特定项目的通知行为。

#### 注意事项

- **默认设置**：系统使用 [coding.png](https://github.com/6starlong/mcp-server-notify/blob/main/assets/coding.png) 作为默认图标，[done.wav](https://github.com/6starlong/mcp-server-notify/blob/main/assets/done.wav) 作为默认提示音
- **资源管理**：支持本地文件路径和网络URL，网络资源可能有加载延迟，系统会自动降级处理（默认3秒）
- **静音模式**：对于频繁通知，可以指定静音模式避免干扰
- **应用关联**：点击通知可以激活指定的应用程序

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
  icon: './icon.png',      // 图标路径或URL
  sound: './sound.wav',    // 声音文件或false
  open: 'Code',            // 点击通知后要激活的应用名称
  appName: '系统通知'       // 自定义通知应用ID（显示名称）
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
