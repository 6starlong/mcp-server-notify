/**
 * 窗口管理器
 * 功能：应用启动、窗口激活、托盘应用管理
 */

import { execSync } from 'child_process'
import { openApp } from 'open'

// 检查当前操作系统平台是否为 Windows
const isWindows = process.platform === 'win32'

/**
 * 获取调用当前 Node 进程的应用信息（通过进程树查找）
 * @returns {Promise<{ processName: string; pid: number } | null>} 调用应用信息
 */
export async function getCallerAppInfo(): Promise<{ processName: string; pid: number } | null> {
  // 非 Windows 平台不支持此功能
  if (!isWindows) return null

  try {
    const currentPid = process.pid

    const command = `powershell -Command "` +
      `function Get-ProcessTree { ` +
      `param ([int]$ProcessId, [int]$Level = 0); ` +
      `$process = Get-WmiObject Win32_Process -Filter \\"ProcessId = $ProcessId\\"; ` +
      `if ($process) { ` +
      `$processObj = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue; ` +
      `if ($processObj) { ` +
      `Write-Host \\"PROCESS:$($processObj.ProcessName):$($ProcessId):$Level\\"; ` +
      `} else { ` +
      `Write-Host \\"PROCESS:Unknown:$($ProcessId):$Level\\"; ` +
      `} ` +
      `if ($process.ParentProcessId -gt 0 -and $process.ParentProcessId -ne $ProcessId) { ` +
      `Get-ProcessTree -ProcessId $process.ParentProcessId -Level ($Level + 1); ` +
      `} ` +
      `} ` +
      `} ` +
      `Get-ProcessTree -ProcessId ${currentPid}"`

    const result = execSync(command, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5000
    })

    const cleanResult = result.trim()
      .replace(/\x1B\]633;P;IsWindows=True\x07/g, '') // 移除终端控制字符
      .replace(/\x1B\[[0-9;]*m/g, '') // 移除ANSI颜色代码
      .trim()

    const processes: Array<{ processName: string; pid: number; level: number }> = []
    cleanResult.split('\n').forEach(line => {
      if (line.startsWith('PROCESS:')) {
        const parts = line.replace('PROCESS:', '').split(':')
        if (parts.length >= 3) {
          processes.push({
            processName: parts[0],
            pid: parseInt(parts[1]),
            level: parseInt(parts[2])
          })
        }
      }
    })

    if (processes.length === 0) return null

    // 跳过这些系统进程，寻找真正的调用者
    const skip = ['node', 'powershell', 'cmd', 'conhost', 'wsl', 'bash', 'tsx']
    const caller = processes.find(p => p.level > 0 && !skip.includes(p.processName.toLowerCase()))

    if (caller) {
      return { processName: caller.processName, pid: caller.pid }
    }

    // 如果没找到合适的调用者，返回直接父进程
    if (processes.length > 1) {
      const parent = processes[1]
      return { processName: parent.processName, pid: parent.pid }
    }

    return null
  } catch (error) {
    console.warn('获取调用应用信息失败:', error)
    return null
  }
}

/**
 * 获取当前活动窗口的应用信息
 * @returns {Promise<{ processName: string; pid: number } | null>} 当前活动应用信息
 */
export async function getCurrentActiveApp(): Promise<{ processName: string; pid: number } | null> {
  try {
    const command = `powershell -Command "` +
      `$activeWindow = Add-Type -MemberDefinition '[DllImport(\\"user32.dll\\")]public static extern IntPtr GetForegroundWindow();' -Name Win32 -PassThru; ` +
      `$hwnd = $activeWindow::GetForegroundWindow(); ` +
      `$processId = (Get-Process | Where-Object { $_.MainWindowHandle -eq $hwnd }).Id; ` +
      `if ($processId) { ` +
      `$process = Get-Process -Id $processId; ` +
      `$json = '{' + '\\\"processName\\\":\\\"' + $process.ProcessName + '\\\",\\\"pid\\\":' + $processId + '}'; ` +
      `Write-Host $json ` +
      `}`

    const result = execSync(command, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 3000
    })

    const cleanResult = result.trim()
      .replace(/\x1B\]633;P;IsWindows=True\x07/g, '') // 移除终端控制字符
      .replace(/\x1B\[[0-9;]*m/g, '') // 移除ANSI颜色代码
      .trim()

    if (cleanResult && cleanResult.startsWith('{')) {
      const appInfo = JSON.parse(cleanResult)
      return {
        processName: appInfo.processName,
        pid: parseInt(appInfo.pid)
      }
    }
  } catch (error) {
    console.warn('获取当前活动应用失败:', error)
  }

  return null
}

/**
 * 检查进程是否存在
 */
export async function checkProcessExists(processName: string): Promise<boolean> {
  try {
    const result = execSync(`tasklist /fi "imagename eq ${processName}.exe" /fo csv`, {
      encoding: 'utf8',
      windowsHide: true
    })

    const lines = result.split('\n').filter(line => line.trim())
    return lines.length > 1
  } catch (error) {
    return false
  }
}

/**
 * 检查进程是否有可见窗口
 */
export async function checkProcessHasWindow(processName: string): Promise<boolean> {
  try {
    const command = `powershell -Command "` +
      `$p = Get-Process -Name '${processName}' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }; ` +
      `if ($p) { Write-Host 'HAS_WINDOW' } else { Write-Host 'NO_WINDOW' }"`

    const result = execSync(command, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 3000
    })

    return result.includes('HAS_WINDOW')
  } catch (error) {
    return false
  }
}

/**
 * PowerShell 窗口激活（使用置顶策略确保可靠激活）
 */
export async function activateWindow(processName: string): Promise<boolean> {
  try {
    const command = `powershell -Command "` +
      `$p = Get-Process -Name '${processName}' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }; ` +
      `if ($p) { ` +
      `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport(\\"user32.dll\\")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags); [DllImport(\\"user32.dll\\")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow); [DllImport(\\"user32.dll\\")] public static extern bool IsIconic(IntPtr hWnd); [DllImport(\\"user32.dll\\")] public static extern IntPtr GetForegroundWindow(); public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1); public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2); public const uint SWP_NOMOVE = 0x0002; public const uint SWP_NOSIZE = 0x0001; public const uint SWP_SHOWWINDOW = 0x0040; public const int SW_RESTORE = 9; }'; ` +
      `$hwnd = $p[0].MainWindowHandle; ` +
      `if ([Win32]::IsIconic($hwnd)) { [Win32]::ShowWindow($hwnd, 9); Start-Sleep -Milliseconds 200; } ` +
      `[Win32]::SetWindowPos($hwnd, [Win32]::HWND_TOPMOST, 0, 0, 0, 0, 3); ` +
      `Start-Sleep -Milliseconds 500; ` +
      `[Win32]::SetWindowPos($hwnd, [Win32]::HWND_NOTOPMOST, 0, 0, 0, 0, 3); ` +
      `Start-Sleep -Milliseconds 300; ` +
      `$currentForeground = [Win32]::GetForegroundWindow(); ` +
      `if ($currentForeground -eq $hwnd) { Write-Host 'SUCCESS' } else { Write-Host 'PARTIAL_SUCCESS' } ` +
      `} else { Write-Host 'NO_WINDOW' }"`

    const result = execSync(command, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 5000
    })

    return result.includes('SUCCESS') || result.includes('PARTIAL_SUCCESS')
  } catch (error) {
    return false
  }
}

/**
 * 从正在运行的进程中获取可执行文件路径
 */
export async function getExecutablePathFromProcess(processName: string): Promise<string | null> {
  try {
    const command = `powershell -Command "` +
      `$p = Get-Process -Name '${processName}' -ErrorAction SilentlyContinue; ` +
      `if ($p) { ` +
      `$path = $p[0].Path; ` +
      `if ($path) { Write-Host $path } ` +
      `}"`

    const result = execSync(command, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 3000
    })

    // 清理路径中的终端控制字符
    const cleanPath = result.trim()
      .replace(/\x1B\]633;P;IsWindows=True\x07/g, '') // 移除终端控制字符
      .replace(/\x1B\[[0-9;]*m/g, '') // 移除ANSI颜色代码
      .trim()

    return cleanPath || null
  } catch (error) {
    return null
  }
}

/**
 * 生成可能的可执行文件名变体
 */
function generateExeNames(appName: string): string[] {
  return [
    `${appName}.exe`,
    `${appName.toLowerCase()}.exe`,
    `${appName.charAt(0).toUpperCase() + appName.slice(1)}.exe`,
    `${appName.toUpperCase()}.exe`
  ]
}


// 路径缓存，避免重复查找
const pathCache = new Map<string, string | null>()

/**
 * 通用路径查找（使用 where /r 命令）
 */
export async function findExecutableInCommonPaths(appName: string): Promise<string | null> {
  const cacheKey = appName.toLowerCase()

  // 检查缓存
  if (pathCache.has(cacheKey)) {
    return pathCache.get(cacheKey) || null
  }

  const SEARCH_PATHS = [
    process.env.PROGRAMFILES,
    process.env['PROGRAMFILES(X86)'],
    process.env.LOCALAPPDATA
  ].filter(Boolean) as string[]

  const possibleExeNames = generateExeNames(appName)

  for (const searchPath of SEARCH_PATHS) {
    for (const exeName of possibleExeNames) {
      const command = `where /r "${searchPath}" ${exeName}`

      try {
        const { exec } = await import('child_process')
        const foundPath = await new Promise<string>((resolve, reject) => {
          exec(command, { timeout: 5000 }, (error, stdout) => {
            if (error) {
              return reject(error)
            }
            resolve(stdout)
          })
        })

        // where 命令可能返回多个结果，取第一个有效的
        const firstPath = foundPath.split(/\r?\n/)[0].trim()
        if (firstPath) {
          // 缓存结果
          pathCache.set(cacheKey, firstPath)
          return firstPath
        }
      } catch (error) {
        // 没找到，继续下一个
        continue
      }
    }
  }

  // 缓存未找到的结果
  pathCache.set(cacheKey, null)
  return null
}

/**
 * 清除路径缓存（用于测试或重置）
 */
export function clearPathCache(): void {
  pathCache.clear()
}

/**
 * 智能判断输入类型
 */
function detectInputType(input: string): 'url' | 'file' | 'path' | 'app' {
  // URL 检测
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return 'url'
  }

  // 完整路径检测（Windows）
  if (input.match(/^[A-Za-z]:[\\\/]/) || input.includes('\\') || input.includes('/')) {
    return input.endsWith('.exe') ? 'path' : 'file'
  }

  // 其他情况作为应用名处理
  return 'app'
}

/**
 * 尝试启动应用（支持路径查找）
 */
async function tryStartApplication(appName: string): Promise<{
  success: boolean
  method?: string
  path?: string
  error?: string
}> {
  // 方法1: 直接启动（PATH中）
  console.log(`🚀 尝试直接启动: ${appName}`)
  try {
    await openApp(appName)

    // 等待并验证启动
    await new Promise(resolve => setTimeout(resolve, 2000))
    const started = await checkProcessExists(appName)

    if (started) {
      console.log('✅ 直接启动成功')
      return { success: true, method: 'direct' }
    }
  } catch (error) {
    console.log('❌ 直接启动失败')
  }

  // 方法2: 路径查找启动
  console.log(`🔍 尝试路径查找启动: ${appName}`)
  const commonPath = await findExecutableInCommonPaths(appName)
  if (commonPath) {
    console.log(`📁 找到路径: ${commonPath}`)
    try {
      await openApp(commonPath)

      // 等待并验证启动
      await new Promise(resolve => setTimeout(resolve, 2000))
      const started = await checkProcessExists(appName)

      if (started) {
        console.log('✅ 路径启动成功')
        return { success: true, method: 'path_search', path: commonPath }
      }
    } catch (error) {
      console.log('❌ 路径启动失败')
    }
  }

  return { success: false, error: '所有启动方法都失败' }
}

/**
 * 尝试重启托盘应用
 */
async function tryRestartTrayApp(appName: string): Promise<{
  success: boolean
  execPath?: string
  commonPath?: string
  error?: string
}> {
  // 方法1: 从进程获取路径
  console.log(`📁 尝试从进程获取路径: ${appName}`)
  const execPath = await getExecutablePathFromProcess(appName)
  if (execPath) {
    console.log(`✅ 获取到进程路径: ${execPath}`)
    try {
      await openApp(execPath)
      console.log('✅ 使用进程路径重启成功')
      return { success: true, execPath }
    } catch (error) {
      console.log('❌ 使用进程路径重启失败:', error)
    }
  }

  // 方法2: 通用路径查找
  console.log(`🔍 尝试通用路径查找: ${appName}`)
  const commonPath = await findExecutableInCommonPaths(appName)
  if (commonPath) {
    console.log(`✅ 找到通用路径: ${commonPath}`)
    try {
      await openApp(commonPath)
      console.log('✅ 使用通用路径重启成功')
      return { success: true, commonPath }
    } catch (error) {
      console.log('❌ 使用通用路径重启失败:', error)
    }
  }

  return { success: false, error: '无法获取可执行文件路径' }
}

/**
 * 最终版窗口管理器
 */
export async function windowManager(target: string): Promise<{
  action: string
  success: boolean
  info?: any
} | undefined> {
  console.log(`\n=== 窗口管理: ${target} ===`)

  const inputType = detectInputType(target)
  console.log(`📝 输入类型: ${inputType}`)

  // 分支1: URL/文件/路径 → 直接 open 处理
  if (inputType === 'url' || inputType === 'file' || inputType === 'path') {
    console.log(`🌐 直接打开: ${target}`)
    try {
      await openApp(target)
      return { action: 'open_direct', success: true, info: { type: inputType, target } }
    } catch (error) {
      return { action: 'open_direct', success: false, info: { type: inputType, error } }
    }
  }

  // 非 Windows 平台不支持以下功能
  if (!isWindows) return

  // 分支2: 应用名 → 智能处理
  const appName = target
  console.log(`🔍 检查进程状态: ${appName}`)
  const processExists = await checkProcessExists(appName)

  if (processExists) {
    // 进程存在 → 检查窗口状态
    console.log('✅ 进程存在，检查窗口状态')
    const hasWindow = await checkProcessHasWindow(appName)

    if (hasWindow) {
      // 有窗口 → 激活窗口
      console.log('🪟 有可见窗口，尝试激活')
      const activated = await activateWindow(appName)
      return {
        action: 'activate',
        success: activated,
        info: { appName, hasWindow: true }
      }
    } else {
      // 无窗口（托盘） → 重启应用
      console.log('🎯 无可见窗口（托盘应用），尝试重启')
      const restartResult = await tryRestartTrayApp(appName)
      return {
        action: 'restart_tray',
        success: restartResult.success,
        info: {
          appName,
          hasWindow: false,
          ...restartResult
        }
      }
    }
  } else {
    // 进程不存在 → 启动应用
    console.log('❌ 进程不存在，尝试启动应用')
    const startResult = await tryStartApplication(appName)
    return {
      action: 'start',
      success: startResult.success,
      info: {
        appName,
        ...startResult,
        suggestion: startResult.success ? undefined : `无法启动 ${appName}，请确认应用已正确安装`
      }
    }
  }
}