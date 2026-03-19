#Requires -Version 5.1
<#
  Sends file bytes to a Windows printer queue as a single RAW job (ESC/POS, TSPL, etc.).
  Used by BFC API instead of the legacy `print` command, which does not spool binary/RAW reliably.
#>
param(
  [Parameter(Mandatory = $true)][string]$PrinterName,
  [Parameter(Mandatory = $true)][string]$Path
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Path)) {
  Write-Error "Print file not found: $Path"
  exit 2
}

$bytes = [System.IO.File]::ReadAllBytes($Path)
if ($bytes.Length -eq 0) {
  Write-Error "Print file is empty."
  exit 3
}

$typeDef = @'
using System;
using System.Runtime.InteropServices;

public static class BfcRawPrint {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct DocInfo {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }

  [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", CharSet = CharSet.Unicode, ExactSpelling = true, SetLastError = true)]
  private static extern bool OpenPrinter(string szPrinter, out IntPtr h, IntPtr pd);

  [DllImport("winspool.drv", SetLastError = true)]
  private static extern bool ClosePrinter(IntPtr h);

  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", CharSet = CharSet.Unicode, ExactSpelling = true, SetLastError = true)]
  private static extern bool StartDocPrinter(IntPtr h, int level, ref DocInfo di);

  [DllImport("winspool.drv", SetLastError = true)]
  private static extern bool EndDocPrinter(IntPtr h);

  [DllImport("winspool.drv", SetLastError = true)]
  private static extern bool StartPagePrinter(IntPtr h);

  [DllImport("winspool.drv", SetLastError = true)]
  private static extern bool EndPagePrinter(IntPtr h);

  [DllImport("winspool.drv", SetLastError = true)]
  private static extern bool WritePrinter(IntPtr h, IntPtr p, int cb, out int pc);

  public static void Send(string printer, byte[] data) {
    IntPtr h = IntPtr.Zero;
    if (!OpenPrinter(printer, out h, IntPtr.Zero))
      throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "OpenPrinter failed");
    try {
      DocInfo di = new DocInfo {
        pDocName = "BFC POS",
        pOutputFile = null,
        pDataType = "RAW"
      };
      if (!StartDocPrinter(h, 1, ref di))
        throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "StartDocPrinter failed");
      try {
        if (!StartPagePrinter(h))
          throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "StartPagePrinter failed");
        IntPtr ptr = Marshal.AllocCoTaskMem(data.Length);
        try {
          Marshal.Copy(data, 0, ptr, data.Length);
          int w;
          if (!WritePrinter(h, ptr, data.Length, out w))
            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "WritePrinter failed");
          if (w != data.Length)
            throw new Exception("WritePrinter incomplete: wrote " + w + " of " + data.Length + " bytes");
        } finally {
          Marshal.FreeCoTaskMem(ptr);
        }
        if (!EndPagePrinter(h))
          throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "EndPagePrinter failed");
      } finally {
        EndDocPrinter(h);
      }
    } finally {
      ClosePrinter(h);
    }
  }
}
'@

try {
  Add-Type -TypeDefinition $typeDef -ErrorAction Stop
} catch {
  Write-Error ("Failed to compile RAW print helper: " + $_.Exception.Message)
  exit 4
}

try {
  [BfcRawPrint]::Send($PrinterName, $bytes)
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
