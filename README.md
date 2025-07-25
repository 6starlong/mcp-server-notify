# mcp-server-notify

一个轻量级的桌面通知工具，支持 MCP 协议集成和命令行直接调用，让 Agent 能够智能发送系统通知。

## 特性

- 🔔 发送系统桌面原生通知
- 🤖 完整的 MCP 协议支持，轻松集成各类 Agent 工具
- 🎵 可自定义声音和图标（本地文件或URL）
- 📱 跨平台支持（基于 [node-notifier](https://www.npmjs.com/package/node-notifier)）
- 🎯 支持点击通知后激活指定应用、URL或可执行文件。
- ⚡ 极致轻量，开箱即用，无需复杂配置

## 使用方法

### 1. MCP服务

#### 使用 npm

集成到 Cursor、Claude Code 或其他支持 MCP 协议的编辑器和 Agent 工具中：

```json
{
  "mcpServers": {
    "notify": {
      "command": "npx",
      "args": ["-y", "@6starlong/mcp-server-notify"]
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
- "通知我代码审核结果，点击时激活 Code"
- "帮我设置一个番茄钟，25分钟后提醒我休息"
```

你可以通过在 `~/rules/notify.md` 中创建自定义规则来避免每次手动输入这些偏好设置。例如，设置默认的通知样式、常用的声音文件路径、或特定项目的通知行为。

#### 注意事项

- **默认设置**：系统使用 [coding.png](./assets/coding.png) 作为默认图标，[done.wav](./assets/done.wav) 作为默认提示音
- **资源管理**：支持本地文件路径和网络URL，网络资源可能有加载延迟，系统会自动降级处理（默认3秒）
- **静音模式**：对于频繁通知，可以指定静音模式避免干扰
- **应用关联**：点击通知后返回原应用（Windows）或打开指定的URL、程序、可执行文件。

### 2. 命令行使用

```bash
# 安装
npm install -g @6starlong/mcp-server-notify

# 查看帮助
mcp-notify -h

# 基本通知
mcp-notify -c "标题" "消息内容"

# 流程通知
mcp-notify -c "任务完成" "代码编译成功" --open Code

# 自动化任务通知
mcp-notify -c "测试通过" "所有单元测试已通过" --sound C:\\Windows\\Media\\tada.wav

# 集成到脚本中
npm run build && mcp-notify -c "构建成功" "可以开始部署了"
```

### 3. 编程接口

```typescript
import { sendNotification } from '@6starlong/mcp-server-notify'

await sendNotification('标题', '消息', {
  icon: './icon.png',      // 本地文件或URL，false禁用
  sound: './sound.wav',    // 本地文件或URL，false禁用
  open: 'Code',            // 点击通知后要激活的应用名称
})
```

## 开发和测试

```bash
# 构建项目
pnpm run build

# 测试
pnpm test

# 开发模式（启动MCP服务器）
pnpm run dev
```

## 许可证

MIT License

## 贡献

欢迎提交问题和PR！
