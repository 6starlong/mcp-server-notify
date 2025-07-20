import { execSync } from 'child_process'
import * as fs from 'fs'

/**
 * 激活指定进程名的窗口（置顶并恢复）
 * @param processName 进程名
 * @param verbose 是否打印详细日志
 * @returns 是否成功激活窗口
 */
export async function activateWindow(processName: string, verbose: boolean = false): Promise<boolean> {
  try {
    const scriptContent = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class TopmostHelper {
    [DllImport(\"user32.dll\")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport(\"user32.dll\")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport(\"user32.dll\")]
    public static extern bool IsIconic(IntPtr hWnd);
    [DllImport(\"user32.dll\")]
    public static extern IntPtr GetForegroundWindow();
    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_SHOWWINDOW = 0x0040;
    public const int SW_RESTORE = 9;
}
"@
$processes = Get-Process -Name \"${processName}\" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
if ($processes) {
    $process = $processes[0]
    $hwnd = $process.MainWindowHandle
    
    if ([TopmostHelper]::IsIconic($hwnd)) {
        [TopmostHelper]::ShowWindow($hwnd, 9)
        Start-Sleep -Milliseconds 200
    }
    
    $result1 = [TopmostHelper]::SetWindowPos($hwnd, [TopmostHelper]::HWND_TOPMOST, 0, 0, 0, 0, 3)
    Start-Sleep -Milliseconds 500
    
    $result2 = [TopmostHelper]::SetWindowPos($hwnd, [TopmostHelper]::HWND_NOTOPMOST, 0, 0, 0, 0, 3)
    
    Start-Sleep -Milliseconds 300
    $currentForeground = [TopmostHelper]::GetForegroundWindow()
    if ($currentForeground -eq $hwnd) {
        Write-Host "SUCCESS"
    } else {
        Write-Host "PARTIAL_SUCCESS"
    }
} else {
    Write-Host "NOT_FOUND"
}
    `
    const tempFile = `temp_topmost_${Date.now()}.ps1`
    fs.writeFileSync(tempFile, scriptContent)
    try {
      const result = execSync(`powershell -ExecutionPolicy Bypass -File ${tempFile}`, {
        encoding: 'utf8',
        windowsHide: true
      })

      return result.includes('SUCCESS') || result.includes('PARTIAL_SUCCESS')
    } finally {
      try { fs.unlinkSync(tempFile) } catch (e) { }
    }
  } catch (error) {
    if (verbose) {
      console.error('窗口激活失败:', error)
    }
    return false
  }
}

/**
 * 获取当前进程的进程树（向上递归父进程）
 */
export async function getProcessTree(verbose: boolean = false): Promise<Array<{ processName: string; pid: number; level: number }>> {
  try {
    const currentPid = process.pid

    const scriptContent = `
function Get-ProcessTree {
    param (
        [int]$ProcessId,
        [int]$Level = 0
    )
    $process = Get-WmiObject Win32_Process -Filter \"ProcessId = $ProcessId\"
    if ($process) {
        $processObj = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($processObj) {
            Write-Host \"PROCESS:$($processObj.ProcessName):$($ProcessId):$Level\"
        } else {
            Write-Host \"PROCESS:Unknown:$($ProcessId):$Level\"
        }
        if ($process.ParentProcessId -gt 0 -and $process.ParentProcessId -ne $ProcessId) {
            Get-ProcessTree -ProcessId $process.ParentProcessId -Level ($Level + 1)
        }
    }
}
Get-ProcessTree -ProcessId ${currentPid}
    `
    const tempFile = `temp_process_tree_${Date.now()}.ps1`
    fs.writeFileSync(tempFile, scriptContent)
    try {
      const result = execSync(`powershell -ExecutionPolicy Bypass -File ${tempFile}`, {
        encoding: 'utf8',
        windowsHide: true
      })
      const output = result.trim()

      const processes: Array<{ processName: string; pid: number; level: number }> = []
      output.split('\n').forEach(line => {
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
      return processes.sort((a, b) => a.level - b.level)
    } finally {
      try { fs.unlinkSync(tempFile) } catch (e) { }
    }
  } catch (error) {
    if (verbose) {
      console.error('获取进程树失败:', error)
    }
    return []
  }
}

/**
 * 获取调用当前 Node 进程的应用信息
 */
export async function getCallerAppInfo(verbose: boolean = false): Promise<{ processName: string; pid: number } | null> {
  try {
    const processTree = await getProcessTree(verbose)
    if (processTree.length === 0) return null

    const skip = ['node', 'powershell', 'cmd', 'conhost', 'wsl', 'bash']
    const caller = processTree.find(p => p.level > 0 && !skip.includes(p.processName.toLowerCase()))

    if (caller) {
      return { processName: caller.processName, pid: caller.pid }
    }

    if (processTree.length > 1) {
      const parent = processTree[1]
      return { processName: parent.processName, pid: parent.pid }
    }

    return null
  } catch (error) {
    if (verbose) {
      console.error('获取调用者应用失败:', error)
    }
    return null
  }
}