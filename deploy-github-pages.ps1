param(
  [string]$RepoName = "seller-margin-note",
  [string]$CommitMessage = "Initial seller margin calculator"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI(gh)가 필요합니다."
}

gh auth status | Out-Null

if (-not (Test-Path -LiteralPath ".git")) {
  git init -b main
}

git add .

$changes = git status --porcelain
if ($changes) {
  git commit -m $CommitMessage
}

$owner = gh api user --jq ".login"
$repoExists = $true
try {
  gh repo view "$owner/$RepoName" | Out-Null
} catch {
  $repoExists = $false
}

if (-not $repoExists) {
  gh repo create $RepoName --public --source . --remote origin --push
} else {
  $remoteUrl = "https://github.com/$owner/$RepoName.git"
  $hasOrigin = $true
  try {
    git remote get-url origin | Out-Null
  } catch {
    $hasOrigin = $false
  }

  if (-not $hasOrigin) {
    git remote add origin $remoteUrl
  }

  git push -u origin main
}

$pagesExists = $true
try {
  gh api "repos/$owner/$RepoName/pages" | Out-Null
} catch {
  $pagesExists = $false
}

if (-not $pagesExists) {
  gh api "repos/$owner/$RepoName/pages" -f "source[branch]=main" -f "source[path]=/"
}

Write-Host "Published: https://$owner.github.io/$RepoName/"
