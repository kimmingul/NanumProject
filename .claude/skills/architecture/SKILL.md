---
name: architecture
description: 시스템 아키텍처 분석, 설계, 리팩토링 계획 수립
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash
---

# Architecture

시스템 아키텍처를 분석하고 설계 방향을 제안합니다.

## 분석/설계 대상: $ARGUMENTS

## 분석 프로세스

### 1. 현재 아키텍처 파악
- `docs/ARCHITECTURE.md` 읽기 (전체 구조)
- `supabase/DATABASE.md` 읽기 (DB 스키마)
- `docs/PRD.md` 읽기 (요구사항)
- 관련 소스 코드 탐색

### 2. 구조 분석

**프론트엔드 레이어:**
```
Routes (routes/index.tsx)
  └── Pages (pages/*.tsx)
       ├── Features (features/**/*.tsx)
       ├── Hooks (hooks/use*.ts)
       └── Store (lib/*-store.ts)
```

**백엔드 레이어:**
```
Supabase
  ├── Auth (auth.users + profiles)
  ├── Database (PostgreSQL + RLS)
  ├── Storage (avatars, documents)
  └── RPC Functions (SECURITY DEFINER)
```

**데이터 흐름:**
```
Component → Hook → Supabase Client → PostgreSQL (RLS filtered)
                                    ↓
                              Auth Token (auto)
```

### 3. 설계 원칙

| 원칙 | 적용 |
|------|------|
| 단일 책임 | 훅 하나에 하나의 도메인 |
| 테넌트 격리 | 모든 쿼리에 tenant_id 필터 |
| 최소 권한 | RLS + RBAC (admin/manager/member/viewer) |
| 서버 사이드 권한 | 중요 작업은 SECURITY DEFINER RPC |
| 클라이언트 상태 분리 | auth-store (persist) vs pm-store (memory) |

### 4. 제안 형식

변경이 필요한 경우:
1. **문제 분석** — 현재 구조의 한계점
2. **설계 제안** — 변경 방향 (다이어그램 포함)
3. **영향 범위** — 변경되는 파일 목록
4. **마이그레이션 전략** — 점진적 적용 단계
5. **트레이드오프** — 장단점 비교

### 5. 문서화
설계 결정은 `docs/ARCHITECTURE.md`에 반영.
