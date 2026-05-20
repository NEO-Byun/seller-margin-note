param(
  [string]$RepoName = "seller-margin-note",
  [string]$CommitMessage = "Initial seller margin calculator"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI(gh)가 필요합니다."
}

$RepoRoot = (Get-Location).Path
$SafeDirectory = $RepoRoot.Replace("\", "/")

function Invoke-Git {
  & git -c "safe.directory=$SafeDirectory" @args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($args -join ' ') 실패"
  }
}

function Invoke-Gh {
  & gh @args
  if ($LASTEXITCODE -ne 0) {
    throw "gh $($args -join ' ') 실패"
  }
}

Invoke-Gh auth status | Out-Null

if (-not (Test-Path -LiteralPath ".git")) {
  Invoke-Git init -b main
}

Invoke-Git add .

$changes = & git -c "safe.directory=$SafeDirectory" status --porcelain
if ($LASTEXITCODE -ne 0) {
  throw "git status 실패"
}
if ($changes) {
  Invoke-Git commit -m $CommitMessage
}

$owner = (& gh api user --jq ".login").Trim()
if ($LASTEXITCODE -ne 0 -or -not $owner) {
  throw "GitHub 사용자 확인 실패"
}

$repoExists = $true
try {
  Invoke-Gh repo view "$owner/$RepoName" | Out-Null
} catch {
  $repoExists = $false
}

if (-not $repoExists) {
  Invoke-Gh repo create $RepoName --public --description "Korean seller margin calculator" | Out-Null
}

$remoteUrl = "https://github.com/$owner/$RepoName.git"
$originUrl = & git -c "safe.directory=$SafeDirectory" remote get-url origin 2>$null

if ($LASTEXITCODE -ne 0) {
  Invoke-Git remote add origin $remoteUrl
} elseif ($originUrl.Trim() -ne $remoteUrl) {
  Invoke-Git remote set-url origin $remoteUrl
}

Invoke-Git push -u origin main

$pagesExists = $true
try {
  Invoke-Gh api "repos/$owner/$RepoName/pages" | Out-Null
} catch {
  $pagesExists = $false
}

if (-not $pagesExists) {
  Invoke-Gh api "repos/$owner/$RepoName/pages" -f "source[branch]=main" -f "source[path]=/" | Out-Null
}

Write-Host "Published: https://$owner.github.io/$RepoName/"
