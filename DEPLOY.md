# 배포

## 현재 상태

- 앱은 정적 파일만 사용.
- 빌드 과정 없음.
- `index.html`을 그대로 배포하면 됨.
- GitHub CLI 로그인 토큰이 만료되어 자동 배포는 아직 불가.

## GitHub Pages 배포

1. GitHub CLI 재로그인.

```powershell
gh auth login -h github.com
```

2. 배포 스크립트 실행.

```powershell
.\deploy-github-pages.ps1
```

예상 주소:

```text
https://<github-id>.github.io/seller-margin-note/
```

## 수동 배포

배포 스크립트를 쓰지 않을 경우:

```powershell
git init -b main
git add .
git commit -m "Initial seller margin calculator"
```

3. public repo 생성과 push.

```powershell
gh repo create seller-margin-note --public --source . --remote origin --push
```

4. GitHub Pages 활성화.

```powershell
gh api repos/:owner/seller-margin-note/pages -f source[branch]=main -f source[path]=/
```

## 배포 전 확인

```powershell
node --check app.js
```

브라우저 확인:

1. `index.html` 열기.
2. `예시 불러오기` 클릭.
3. 상품 저장.
4. CSV 내보내기.
