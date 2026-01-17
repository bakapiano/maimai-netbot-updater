param(
    [string]$RemoteHost = "106.14.237.126",
    [string]$RemoteUser = "root",
    [string]$RemoteBasePath = "/root/maiserver"
)

$ErrorActionPreference = "Stop"

$sshExe = (Get-Command ssh -ErrorAction Stop).Source
$scpExe = (Get-Command scp -ErrorAction Stop).Source
$tarExe = (Get-Command tar -ErrorAction Stop).Source

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$workerSource = Join-Path $repoRoot "v2" | Join-Path -ChildPath "worker"
$jobServiceSource = Join-Path $repoRoot "v2" | Join-Path -ChildPath "job-service"

$controlPath = Join-Path ([System.IO.Path]::GetTempPath()) (
    "ssh-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
)
$sshOptions = @(
    "-o", "ControlMaster=auto",
    "-o", "ControlPersist=600",
    "-o", "ControlPath=$controlPath"
)

foreach ($path in @($workerSource, $jobServiceSource)) {
    if (-not (Test-Path $path)) {
        throw "Required path not found: $path"
    }
}

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("maiserver-deploy-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    $workerArchive = Join-Path $tempDir "worker.tar"
    $jobArchive = Join-Path $tempDir "job-service.tar"

    & $tarExe -cf $workerArchive --exclude=node_modules -C $workerSource .
    & $tarExe -cf $jobArchive --exclude=node_modules -C $jobServiceSource .

    $sshTarget = "$RemoteUser@$RemoteHost"

    & $scpExe @sshOptions $workerArchive "${sshTarget}:${RemoteBasePath}/worker.tar"
    & $scpExe @sshOptions $jobArchive "${sshTarget}:${RemoteBasePath}/job-service.tar"

    $remoteCommand = @(
        "set -e",
        "mkdir -p '$RemoteBasePath/worker' '$RemoteBasePath/job-service'",
        "rm -rf '$RemoteBasePath/worker'/*",
        "rm -rf '$RemoteBasePath/job-service'/*",
        "tar -xf '$RemoteBasePath/worker.tar' -C '$RemoteBasePath/worker'",
        "tar -xf '$RemoteBasePath/job-service.tar' -C '$RemoteBasePath/job-service'",
        "rm -f '$RemoteBasePath/worker.tar' '$RemoteBasePath/job-service.tar'"
    ) -join " && "

    & $sshExe @sshOptions $sshTarget $remoteCommand
}
finally {
    try {
        & $sshExe @sshOptions "-O" "exit" $sshTarget | Out-Null
    } catch {
        # ignore failures when closing control connection
    }

    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
    if (Test-Path $controlPath) {
        Remove-Item $controlPath -Force -ErrorAction SilentlyContinue
    }
}
