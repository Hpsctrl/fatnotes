# Windows shell/storage/USB repair helper for this machine.
# Run elevated. It logs every command and avoids partition/filesystem changes.

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$LogDir = Join-Path $env:USERPROFILE 'Desktop\WindowsRepairLogs'
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Log = Join-Path $LogDir "elevated-repair-$Stamp.txt"

function Write-Log {
    param([string]$Message)
    $line = "[{0}] {1}" -f (Get-Date -Format o), $Message
    $line | Tee-Object -FilePath $Log -Append
}

function Run-Cmd {
    param(
        [string]$Title,
        [string]$FilePath,
        [string[]]$Arguments
    )
    Write-Log "=== $Title ==="
    Write-Log "Command: $FilePath $($Arguments -join ' ')"
    try {
        & $FilePath @Arguments 2>&1 | Tee-Object -FilePath $Log -Append
        Write-Log "ExitCode: $LASTEXITCODE"
    }
    catch {
        Write-Log "ERROR: $($_.Exception.Message)"
    }
}

function Dump-State {
    param([string]$Title)
    Write-Log "=== STATE: $Title ==="
    'Processes:' | Tee-Object -FilePath $Log -Append
    Get-Process explorer,ShellExperienceHost,StartMenuExperienceHost,RuntimeBroker -ErrorAction SilentlyContinue |
        Select-Object ProcessName,Id,StartTime,Responding,Path |
        Sort-Object ProcessName |
        Format-Table -AutoSize | Tee-Object -FilePath $Log -Append

    'Problem devices:' | Tee-Object -FilePath $Log -Append
    Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue |
        Where-Object Status -ne 'OK' |
        Select-Object Class,FriendlyName,Status,Problem,InstanceId |
        Sort-Object Class,FriendlyName |
        Format-List | Tee-Object -FilePath $Log -Append

    'Disks:' | Tee-Object -FilePath $Log -Append
    Get-Disk |
        Select-Object Number,FriendlyName,SerialNumber,BusType,PartitionStyle,OperationalStatus,HealthStatus,IsOffline,IsReadOnly,Size |
        Sort-Object Number |
        Format-Table -AutoSize | Tee-Object -FilePath $Log -Append

    'Partitions:' | Tee-Object -FilePath $Log -Append
    Get-Partition |
        Select-Object DiskNumber,PartitionNumber,DriveLetter,Type,GptType,Size,IsOffline,IsReadOnly,IsHidden |
        Sort-Object DiskNumber,PartitionNumber |
        Format-Table -AutoSize | Tee-Object -FilePath $Log -Append

    'Volumes:' | Tee-Object -FilePath $Log -Append
    Get-Volume |
        Select-Object DriveLetter,FileSystemLabel,FileSystem,DriveType,HealthStatus,OperationalStatus,Size,SizeRemaining |
        Sort-Object DriveLetter |
        Format-Table -AutoSize | Tee-Object -FilePath $Log -Append

    'USB devices:' | Tee-Object -FilePath $Log -Append
    Get-PnpDevice -PresentOnly -Class USB -ErrorAction SilentlyContinue |
        Select-Object FriendlyName,Status,Problem,InstanceId |
        Sort-Object FriendlyName |
        Format-Table -Wrap -AutoSize | Tee-Object -FilePath $Log -Append

    'Network:' | Tee-Object -FilePath $Log -Append
    Get-NetIPConfiguration | Format-List | Tee-Object -FilePath $Log -Append

    'envirtahci registry/service:' | Tee-Object -FilePath $Log -Append
    Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\envirtahci' -ErrorAction SilentlyContinue |
        Select-Object Start,Type,ErrorControl,ImagePath,DisplayName |
        Format-List | Tee-Object -FilePath $Log -Append
    sc.exe query envirtahci | Tee-Object -FilePath $Log -Append
}

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Log 'ERROR: This script must be run as Administrator.'
    exit 740
}

Write-Log 'Elevated repair started.'
Write-Log "Log: $Log"
Write-Log "Computer: $env:COMPUTERNAME User: $env:USERNAME"
Get-CimInstance Win32_OperatingSystem |
    Select-Object Caption,Version,BuildNumber,InstallDate,LastBootUpTime |
    Format-List | Tee-Object -FilePath $Log -Append

Dump-State 'Before repair'

$BackupDir = Join-Path $LogDir "backup-$Stamp"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
Write-Log "BackupDir: $BackupDir"
Run-Cmd 'Export envirtahci service key' reg.exe @('export', 'HKLM\SYSTEM\CurrentControlSet\Services\envirtahci', (Join-Path $BackupDir 'envirtahci-service.reg'), '/y')
Run-Cmd 'Export SCSIAdapter class key' reg.exe @('export', 'HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e97b-e325-11ce-bfc1-08002be10318}', (Join-Path $BackupDir 'class-scsiadapter.reg'), '/y')
Run-Cmd 'Export USB class key' reg.exe @('export', 'HKLM\SYSTEM\CurrentControlSet\Control\Class\{36fc9e60-c465-11cf-8056-444553540000}', (Join-Path $BackupDir 'class-usb.reg'), '/y')
Run-Cmd 'Export Enum PCI key' reg.exe @('export', 'HKLM\SYSTEM\CurrentControlSet\Enum\PCI', (Join-Path $BackupDir 'enum-pci.reg'), '/y')
Run-Cmd 'Export Enum USB key' reg.exe @('export', 'HKLM\SYSTEM\CurrentControlSet\Enum\USB', (Join-Path $BackupDir 'enum-usb.reg'), '/y')
Run-Cmd 'List StoreMI and USB OEM drivers' pnputil.exe @('/enum-drivers', '/files')

Write-Log 'Attempting restore point. This may fail if System Protection is disabled.'
try {
    Checkpoint-Computer -Description 'Before StoreMI SATA and AMD USB repair' -RestorePointType 'MODIFY_SETTINGS'
    Write-Log 'Restore point created.'
}
catch {
    Write-Log "Restore point not created: $($_.Exception.Message)"
}

Run-Cmd 'DISM CheckHealth' DISM.exe @('/Online', '/Cleanup-Image', '/CheckHealth')
Run-Cmd 'DISM ScanHealth' DISM.exe @('/Online', '/Cleanup-Image', '/ScanHealth')
Run-Cmd 'DISM RestoreHealth' DISM.exe @('/Online', '/Cleanup-Image', '/RestoreHealth')
Run-Cmd 'SFC scannow' sfc.exe @('/scannow')

Write-Log 'Starting shell/network services that are safe and on-demand.'
foreach ($svc in 'NlaSvc','Netman') {
    try {
        Start-Service -Name $svc -ErrorAction Stop
        Write-Log "Started service: $svc"
    }
    catch {
        Write-Log "Service $svc not started: $($_.Exception.Message)"
    }
}

Write-Log 'Refreshing Explorer once.'
try {
    Stop-Process -Name explorer -Force -ErrorAction Stop
    Start-Sleep -Seconds 3
    Start-Process explorer.exe
    Write-Log 'Explorer restarted.'
}
catch {
    Write-Log "Explorer refresh failed: $($_.Exception.Message)"
}

$sataId = 'PCI\VEN_1022&DEV_43C8&SUBSYS_10621B21&REV_01\4&68C9D68&0&010A'
$usbControllerId = 'PCI\VEN_1022&DEV_43D5&SUBSYS_11421B21&REV_01\4&68C9D68&0&000A'
$usbRootHubId = 'USB\AMDROOT_HUB31\5&2BC95336&0&0'

Write-Log 'Repairing StoreMI SATA binding without enabling envirtahci.'
Run-Cmd 'Install Microsoft SATA AHCI INF for matching devices' pnputil.exe @('/add-driver', 'C:\Windows\INF\mshdc.inf', '/install')
Run-Cmd 'Remove old StoreMI/Enmotus AHCI driver package without force' pnputil.exe @('/delete-driver', 'oem56.inf', '/uninstall')
Run-Cmd 'Scan devices after SATA driver repair' pnputil.exe @('/scan-devices')

Write-Log 'Repairing old AMD USB 3.1 controller/root hub binding.'
Run-Cmd 'Install Microsoft xHCI INF for matching devices' pnputil.exe @('/add-driver', 'C:\Windows\INF\usbxhci.inf', '/install')
Run-Cmd 'Install Microsoft USB hub INF for matching devices' pnputil.exe @('/add-driver', 'C:\Windows\INF\usbhub3.inf', '/install')
Run-Cmd 'Remove failed AMD root hub device node' pnputil.exe @('/remove-device', $usbRootHubId)
Run-Cmd 'Remove old AMD USB controller driver package without force' pnputil.exe @('/delete-driver', 'oem79.inf', '/uninstall')
Run-Cmd 'Scan devices after USB repair' pnputil.exe @('/scan-devices')

Start-Sleep -Seconds 5
Dump-State 'After repair'

Write-Log 'Recent storage/USB/shell event log entries after repair:'
$boot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
Get-WinEvent -FilterHashtable @{LogName='System'; StartTime=$boot; Level=1,2,3} -ErrorAction SilentlyContinue |
    Where-Object { $_.ProviderName -match 'Kernel-PnP|USB|Disk|Ntfs|stor|Service Control Manager|DistributedCOM' -or $_.Message -match 'USB|AHCI|SATA|StoreMI|envirt|disk|ntfs|explorer|ShellExperienceHost|StartMenuExperienceHost' } |
    Select-Object TimeCreated,ProviderName,Id,LevelDisplayName,Message |
    Format-List | Tee-Object -FilePath $Log -Append

Write-Log 'Elevated repair completed. Do not delete backups until after a successful reboot and verification.'
Write-Output "DONE. Log: $Log"
