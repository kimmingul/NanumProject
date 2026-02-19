---
name: deploy
description: 빌드 확인 → 문서 업데이트 → Git 커밋 → Push → Vercel 배포 확인
user-invocable: true
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Deploy

빌드부터 Vercel 배포까지 전체 파이프라인을 실행합니다.

## 배포 대상: $ARGUMENTS

## 실행 절차

### 1. 빌드 확인
```bash
npm run build
```
빌드 에러가 있으면 수정 후 재시도.

### 2. 문서 업데이트 (해당 시)
변경 내용에 따라 아래 문서 업데이트:
- `docs/PROGRESS.md` — 새 Phase 또는 Bugfix 항목 추가
- `docs/ARCHITECTURE.md` — 구조 변경 시
- `supabase/DATABASE.md` — DB 스키마 변경 시

### 3. Git 커밋
```bash
git status                    # 변경 파일 확인
git diff                      # 변경 내용 확인
git log --oneline -3          # 최근 커밋 스타일 확인
git add <specific files>      # 파일별 추가 (.env, credentials 제외)
git commit -m "message"       # Conventional Commits 스타일
```

커밋 메시지 규칙:
- `feat:` 새 기능
- `fix:` 버그 수정
- `docs:` 문서만 변경
- `refactor:` 리팩토링
- Co-Authored-By 포함

### 4. Push & 배포 확인
```bash
git push origin master
```
Vercel은 master push 시 자동 배포.
`gh api repos/{owner}/{repo}/deployments` 또는 Vercel 대시보드에서 상태 확인.

### 5. SQL 마이그레이션 안내
새 SQL 마이그레이션이 있으면 사용자에게 Supabase SQL Editor 실행 안내.
