#Requires -RunAsAdministrator
# Re-register the nightly lead-discovery task to run WHETHER YOU ARE LOGGED ON OR NOT,
# using S4U ("Service For User") logon — NO Windows password is stored.
# S4U fits this job: it only needs outbound internet + localhost Postgres + local disk,
# none of which require the network/credential access that S4U gives up.
#
# Run ONCE from an elevated PowerShell (right-click → Run as administrator):
#   powershell -ExecutionPolicy Bypass -File F:\Projects\mullen_analytics_website\backend\scripts\enable-logged-off.ps1
$ErrorActionPreference = 'Stop'

$py      = 'C:\Python314\python.exe'
$script  = 'F:\Projects\mullen_analytics_website\backend\scripts\run_nightly_discovery.py'
$wd      = 'F:\Projects\mullen_analytics_website\backend'

$action    = New-ScheduledTaskAction -Execute $py -Argument "`"$script`"" -WorkingDirectory $wd
$trigger   = New-ScheduledTaskTrigger -Daily -At ([datetime]'02:00')
$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
                -DontStopIfGoingOnBatteries -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Limited

Register-ScheduledTask -TaskName 'MullenAnalytics-LeadDiscovery' -Action $action -Trigger $trigger `
    -Settings $settings -Principal $principal `
    -Description 'Nightly on-prem lead discovery (Mullen Analytics)' -Force | Out-Null

$t = Get-ScheduledTask -TaskName 'MullenAnalytics-LeadDiscovery'
Write-Host "OK - LogonType is now $($t.Principal.LogonType)." -ForegroundColor Green
Write-Host "It runs daily at 02:00 whether or not you are logged on (the PC must be powered on)." -ForegroundColor Green
