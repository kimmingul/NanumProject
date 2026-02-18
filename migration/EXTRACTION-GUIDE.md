# TeamGantt 데이터 추출 가이드

TeamGantt 웹서비스의 모든 프로젝트 데이터를 REST API를 통해 JSON 파일로 추출하는 과정을 설명합니다.

---

## 목차

1. [개요](#1-개요)
2. [기술 스택](#2-기술-스택)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [인증 방식 (AWS Cognito)](#4-인증-방식-aws-cognito)
5. [환경 설정](#5-환경-설정)
6. [API 엔드포인트 상세](#6-api-엔드포인트-상세)
7. [추출 실행 단계 (9단계)](#7-추출-실행-단계-9단계)
8. [안전장치 및 에러 처리](#8-안전장치-및-에러-처리)
9. [출력 디렉토리 구조](#9-출력-디렉토리-구조)
10. [TypeScript 타입 정의](#10-typescript-타입-정의)
11. [실행 방법](#11-실행-방법)
12. [실제 실행 결과](#12-실제-실행-결과)
13. [트러블슈팅](#13-트러블슈팅)

---

## 1. 개요

### 목적

TeamGantt SaaS 서비스에 저장된 프로젝트 관리 데이터 전체를 API를 통해 로컬 JSON 파일로 추출합니다. 추출된 데이터는 이후 Supabase 데이터베이스로 임포트하는 2단계 마이그레이션의 **1단계(추출)**에 해당합니다.

### 데이터 흐름

```
TeamGantt 웹서비스
       │
       │  REST API (HTTPS)
       │  인증: AWS Cognito Bearer Token
       ▼
  추출 스크립트 (TypeScript/Node.js)
       │
       │  Rate Limiting, Retry, Pagination
       ▼
  output/ 폴더 (JSON 파일들)
```

### 추출 대상 엔티티

| 엔티티 | 설명 | API 소스 |
|--------|------|----------|
| 사용자 (Users) | 회사 소속 전체 사용자 | `/companies/{id}/users` |
| 프로젝트 (Projects) | Active, On Hold, Complete 상태별 | `/projects` |
| 프로젝트 계층 (Hierarchy) | 그룹과 태스크의 트리 구조 | `/projects/{id}/children` |
| 프로젝트 접근권한 (Accesses) | 프로젝트별 사용자 권한 | `/projects/{id}/access` |
| 태스크 (Tasks) | 개별 태스크 상세 정보 | `/tasks/{id}` |
| 체크리스트 (Checklists) | 태스크별 체크리스트 항목 | `/tasks/{id}/checklist` |
| 댓글 (Comments) | 프로젝트/태스크 레벨 댓글 | `/{target}/{id}/comments` |
| 시간추적 (Time Tracking) | 작업 시간 기록 | `/times` |
| 보드 (Boards) | 칸반 보드 데이터 | `/boards` |
| 문서 (Documents) | 첨부파일 메타데이터 + 바이너리 | `/tasks/{id}/documents`, 다운로드 URL |

---

## 2. 기술 스택

### 런타임 & 언어

| 항목 | 상세 |
|------|------|
| 런타임 | Node.js |
| 언어 | TypeScript (ES2022 target, strict mode) |
| TS 실행기 | tsx 4.19+ (빌드 없이 TypeScript 직접 실행) |
| 모듈 시스템 | ESM (NodeNext) |

### 의존성 (`package.json`)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.49.2",  // 임포트 단계에서 사용
    "dotenv": "^16.4.7",                  // 환경변수 로드
    "zod": "^3.24.0"                      // 설정값 스키마 검증
  },
  "devDependencies": {
    "tsx": "^4.19.0",                     // TypeScript 실행기
    "typescript": "~5.7.0",              // TypeScript 컴파일러
    "@types/node": "^22.10.0"            // Node.js 타입 정의
  }
}
```

> **참고**: API 호출에는 Node.js 내장 `fetch` API를 사용하며, 별도의 HTTP 클라이언트 라이브러리(axios 등)를 사용하지 않습니다.

---

## 3. 프로젝트 구조

```
migration/
├── .env.example              # 환경변수 템플릿
├── .env                      # 실제 환경변수 (git-ignored)
├── package.json              # 의존성 및 npm 스크립트
├── tsconfig.json             # TypeScript 설정
│
├── src/
│   ├── index.ts              # 메인 진입점 (9단계 오케스트레이터)
│   ├── config.ts             # 환경변수 로드 및 Zod 검증
│   │
│   ├── api/                  # API 통신 계층
│   │   ├── client.ts         # HTTP 클라이언트 (인증, 타임아웃, 에러 처리)
│   │   ├── cognito-auth.ts   # AWS Cognito 토큰 관리
│   │   ├── paginator.ts      # 페이지네이션 유틸리티
│   │   └── endpoints/        # 엔드포인트별 래퍼 함수
│   │       ├── users.ts      # 사용자 API
│   │       ├── projects.ts   # 프로젝트 API
│   │       ├── tasks.ts      # 태스크 API
│   │       ├── groups.ts     # 그룹 API
│   │       ├── comments.ts   # 댓글 API
│   │       ├── boards.ts     # 보드 API
│   │       ├── time-tracking.ts  # 시간추적 API
│   │       └── documents.ts  # 문서 다운로드 API
│   │
│   ├── extractors/           # 데이터 추출 로직 (Phase별)
│   │   ├── company-extractor.ts   # Phase 1-2: 디스커버리 + 사용자
│   │   ├── project-extractor.ts   # Phase 3-4: 프로젝트 목록 + 상세
│   │   ├── task-extractor.ts      # Phase 5: 태스크 상세
│   │   ├── comment-extractor.ts   # 프로젝트 레벨 댓글
│   │   ├── time-extractor.ts      # Phase 6: 시간추적
│   │   ├── board-extractor.ts     # Phase 7: 보드
│   │   └── document-extractor.ts  # Phase 8: 문서 다운로드
│   │
│   ├── types/                # TypeScript 타입 정의
│   │   ├── teamgantt.ts      # TeamGantt API 응답 타입
│   │   └── migration.ts      # CLI 인자 및 검증 타입
│   │
│   └── utils/                # 유틸리티
│       ├── file-writer.ts    # JSON/스트림 파일 기록
│       ├── logger.ts         # 구조화된 로깅 (콘솔 + 파일)
│       ├── progress.ts       # 진행 상태 추적 및 재개 지원
│       ├── rate-limiter.ts   # 동시성 제어 및 요청 간격
│       └── retry.ts          # 재시도 로직 (지수 백오프)
│
└── output/                   # 추출 결과물 (실행 시 생성)
    └── ...
```

---

## 4. 인증 방식 (AWS Cognito)

TeamGantt는 AWS Cognito를 인증 백엔드로 사용합니다. 브라우저에서 로그인할 때 발급되는 Refresh Token을 이용해 API 호출에 필요한 ID Token을 자동으로 발급받습니다.

### 4.1 인증 흐름

```
[최초 1회] 브라우저에서 TeamGantt 로그인
    → 브라우저 쿠키/로컬스토리지에서 Refresh Token 추출
    → .env 파일에 COGNITO_REFRESH_TOKEN으로 저장

[매 실행 시] 스크립트가 자동으로 처리:
    Refresh Token
        ↓  POST (AWS Cognito IDP)
    ID Token (JWT, 1시간 유효)
        ↓  Authorization: Bearer {idToken}
    TeamGantt API 호출
```

### 4.2 Cognito 토큰 갱신 상세

**파일**: `src/api/cognito-auth.ts`

토큰 갱신은 AWS Cognito IDP 엔드포인트에 직접 HTTP POST로 요청합니다:

- **엔드포인트**: `https://cognito-idp.{region}.amazonaws.com/`
- **헤더**:
  - `Content-Type: application/x-amz-json-1.1`
  - `X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth`
- **요청 본문**:
  ```json
  {
    "AuthFlow": "REFRESH_TOKEN_AUTH",
    "ClientId": "5epdg5kohl8ttomj6kce8rucjd",
    "AuthParameters": {
      "REFRESH_TOKEN": "<refresh_token_value>"
    }
  }
  ```
- **응답에서 사용하는 값**:
  - `AuthenticationResult.IdToken` — API 호출에 사용하는 JWT 토큰
  - `AuthenticationResult.ExpiresIn` — 토큰 유효 시간(초, 보통 3600)

### 4.3 토큰 자동 갱신

`CognitoAuth.getToken()` 호출 시:
1. 캐시된 토큰이 있고, 만료까지 **5분 이상** 남았으면 → 캐시된 토큰 반환
2. 그렇지 않으면 → Cognito에 새 토큰 요청 후 캐시 갱신

이 과정은 모든 API 요청마다 `ApiClient.fetchWithTimeout()` 내부에서 자동으로 수행됩니다.

### 4.4 Cognito 고정값

| 항목 | 값 |
|------|-----|
| Region | `us-east-2` |
| User Pool ID | `us-east-2_QHz4338Im` |
| Client ID | `5epdg5kohl8ttomj6kce8rucjd` |

### 4.5 Refresh Token 획득 방법

`.env.example` 파일의 주석에 명시된 대로, **브라우저에서 TeamGantt에 로그인한 후 쿠키에서 추출**합니다:

1. TeamGantt 웹사이트에 로그인
2. 브라우저 개발자 도구 (F12) → Application → Cookies 또는 Local Storage
3. Cognito 관련 Refresh Token 값을 찾아 복사
4. `.env` 파일의 `COGNITO_REFRESH_TOKEN`에 붙여넣기

---

## 5. 환경 설정

### 5.1 `.env` 파일 구성

`.env.example`을 복사하여 `.env` 파일을 생성합니다:

```env
# TeamGantt API 기본 URL
TEAMGANTT_BASE_URL=https://api.teamgantt.com/v1

# 추출 결과 저장 디렉토리
OUTPUT_DIR=./output

# 로그 레벨 (debug | info | warn | error)
LOG_LEVEL=info

# 동시 API 요청 수 (1~20, 기본값 5)
MAX_CONCURRENCY=5

# 문서 파일 다운로드 여부 (true | false)
DOWNLOAD_DOCUMENTS=true

# AWS Cognito 인증 정보
COGNITO_REGION=us-east-2
COGNITO_USER_POOL_ID=us-east-2_QHz4338Im
COGNITO_CLIENT_ID=5epdg5kohl8ttomj6kce8rucjd
COGNITO_REFRESH_TOKEN=your_refresh_token_here
```

### 5.2 설정값 검증 (Zod 스키마)

**파일**: `src/config.ts`

모든 환경변수는 Zod 스키마로 검증됩니다. 필수값이 누락되거나 형식이 잘못되면 프로그램이 시작 시점에 에러 메시지와 함께 종료됩니다.

| 변수 | 타입 | 기본값 | 필수 | 설명 |
|------|------|--------|------|------|
| `TEAMGANTT_BASE_URL` | URL 문자열 | `https://api.teamgantt.com/v1` | N | API 기본 URL |
| `OUTPUT_DIR` | 문자열 | `./output` | N | 결과 저장 경로 |
| `LOG_LEVEL` | enum | `info` | N | debug/info/warn/error |
| `MAX_CONCURRENCY` | 숫자(1~20) | `5` | N | 동시 요청 수 |
| `DOWNLOAD_DOCUMENTS` | 문자열→불린 | `true` | N | 문서 다운로드 여부 |
| `COGNITO_REGION` | 문자열 | - | **Y** | AWS 리전 |
| `COGNITO_USER_POOL_ID` | 문자열 | - | **Y** | Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | 문자열 | - | **Y** | Cognito App Client ID |
| `COGNITO_REFRESH_TOKEN` | 문자열 | - | **Y** | Cognito Refresh Token |

---

## 6. API 엔드포인트 상세

모든 API 호출은 `https://api.teamgantt.com/v1`을 기본 URL로 사용하며, `Authorization: Bearer {idToken}` 헤더와 `Accept: application/json` 헤더를 포함합니다.

### 6.1 사용자 (Users)

**파일**: `src/api/endpoints/users.ts`

| 메서드 | 엔드포인트 | 설명 | 페이지네이션 |
|--------|-----------|------|-------------|
| GET | `/current_user` | 인증된 현재 사용자 정보 조회 | N |
| GET | `/companies/{companyId}/users` | 회사 소속 전체 사용자 목록 | Y |

**`getCurrentUser` 응답 구조**:
```typescript
{
  id: string;
  first_name: string;
  last_name: string;
  email_address: string;
  company_id: string;    // 회사 ID — Discovery 단계에서 추출
  time_zone: string;
  // ...기타 필드
}
```

**`getCompanyUsers` 호출 방식**:
- `paginateAll()` 유틸리티 사용
- 페이지당 100건씩 자동 반복 조회

### 6.2 프로젝트 (Projects)

**파일**: `src/api/endpoints/projects.ts`

| 메서드 | 엔드포인트 | 설명 | 페이지네이션 |
|--------|-----------|------|-------------|
| GET | `/projects?status={status}&page={page}` | 상태별 프로젝트 목록 | Y (커스텀) |
| GET | `/projects/{projectId}` | 프로젝트 상세 정보 | N |
| GET | `/projects/{projectId}/children` | 프로젝트 계층 구조 (그룹+태스크 트리) | N |
| GET | `/projects/{projectId}/access` | 프로젝트 접근 권한 | N |
| GET | `/projects/{projectId}/boards` | 프로젝트 연결 보드 | N |

**프로젝트 목록 조회 특이사항**:
- 상태값 `Active`, `On Hold`, `Complete` 3가지를 순회하며 각각 페이지네이션
- 응답 형식이 `{ projects: [...], total: N }` 또는 `{ data: [...] }` 형태일 수 있어 두 가지 모두 처리
- `total` 값과 비교하여 페이지네이션 종료 판단

**프로젝트 계층 구조 (`/children`) 응답 예시**:
```typescript
[
  {
    id: "123",
    type: "group",           // "group" 또는 "task"
    name: "디자인 단계",
    children: [              // 재귀적 중첩 가능
      { id: "456", type: "task", name: "와이어프레임 작성" },
      { id: "789", type: "task", name: "UI 디자인" }
    ]
  },
  { id: "101", type: "task", name: "킥오프 미팅" }
]
```

이 계층 구조에서 `collectIdsFromChildren()` 함수가 재귀적으로 모든 task ID와 group ID를 수집하여 Phase 5 태스크 추출의 입력으로 사용합니다.

### 6.3 태스크 (Tasks)

**파일**: `src/api/endpoints/tasks.ts`

| 메서드 | 엔드포인트 | 설명 | 페이지네이션 |
|--------|-----------|------|-------------|
| GET | `/tasks/{taskId}` | 태스크 상세 정보 | N |
| GET | `/tasks/{taskId}/checklist` | 태스크 체크리스트 항목 | N |
| GET | `/tasks/{taskId}/documents` | 태스크 첨부 문서 메타데이터 | N |
| GET | `/tasks/{taskId}/comments` | 태스크 댓글 목록 | N |

**태스크 상세 응답 주요 필드**:
```typescript
{
  id: string;
  name: string;
  project_id: string;
  group_id: string;
  start_date: string;     // YYYY-MM-DD
  end_date: string;
  percent_complete: number; // 0~100
  estimated_hours: number;
  type: string;
  status: string;
  sort_order: number;
}
```

### 6.4 그룹 (Groups)

**파일**: `src/api/endpoints/groups.ts`

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/groups/{groupId}` | 그룹 상세 정보 |
| GET | `/groups/{groupId}/comments` | 그룹 댓글 목록 |

### 6.5 댓글 (Comments)

**파일**: `src/api/endpoints/comments.ts`

| 메서드 | 엔드포인트 | 설명 | 페이지네이션 |
|--------|-----------|------|-------------|
| GET | `/{target}/{targetId}/comments` | 대상별 댓글 조회 | Y |

`target`에는 `projects`, `tasks`, `groups` 등이 올 수 있습니다.

**댓글 응답 주요 필드**:
```typescript
{
  id: string;
  message: string;
  type: string;
  created_at: string;
  updated_at: string;
  pinned: boolean;
  user_id: string;
  user_name: string;
  attached_documents: TGDocument[];  // 첨부파일
}
```

### 6.6 보드 (Boards)

**파일**: `src/api/endpoints/boards.ts`

| 메서드 | 엔드포인트 | 설명 | 페이지네이션 |
|--------|-----------|------|-------------|
| GET | `/boards` | 전체 보드 목록 | Y |
| GET | `/boards/{boardId}` | 보드 상세 정보 | N |

### 6.7 시간 추적 (Time Tracking)

**파일**: `src/api/endpoints/time-tracking.ts`

| 메서드 | 엔드포인트 | 설명 | 페이지네이션 |
|--------|-----------|------|-------------|
| GET | `/times` | 전체 시간 기록 목록 | Y |

**시간 기록 응답 주요 필드**:
```typescript
{
  id: string;
  task_id: string;
  user_id: string;
  date: string;       // YYYY-MM-DD
  hours: number;
  notes: string;
}
```

### 6.8 문서 다운로드 (Documents)

**파일**: `src/api/endpoints/documents.ts`

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET (스트림) | `/downloads/{docId}` | 문서 바이너리 다운로드 |

문서 다운로드는 `ApiClient.getStream()`을 사용하여 Node.js `Readable` 스트림으로 수신하며, SHA-256 해시를 계산하면서 파일에 기록합니다.

실제 다운로드 URL은 태스크의 documents 메타데이터 내 `versions[].download_url` 필드에서 최신 버전의 URL을 사용합니다.

---

## 7. 추출 실행 단계 (9단계)

**파일**: `src/index.ts`

전체 추출 프로세스는 순차적으로 실행되는 9개 단계(Phase)로 구성됩니다. 각 단계의 진행 상태는 `output/_metadata/migration-state.json`에 저장되어 중단 후 재개가 가능합니다.

### Phase 1: Discovery (디스커버리)

**파일**: `src/extractors/company-extractor.ts` → `runDiscovery()`

```
GET /current_user → 현재 사용자 정보 + company_id 추출
```

1. `GET /current_user` 호출하여 인증된 사용자 정보 조회
2. 응답에서 `company_id` 추출 (여러 응답 형식에 대응):
   - `currentUser.company_id`
   - `currentUser.company.id`
   - `currentUser.companyId`
   - `currentUser.companies[0].id`
3. `output/_metadata/api-discovery.json`에 결과 저장

**출력 파일**: `_metadata/api-discovery.json`
```json
{
  "currentUser": { ... },
  "companyId": "12345",
  "discoveredAt": "2026-02-06T15:23:08.068Z"
}
```

### Phase 2: Company Data (회사 데이터)

**파일**: `src/extractors/company-extractor.ts` → `extractCompanyData()`

```
GET /companies/{companyId}/users (페이지네이션) → 전체 사용자 목록
```

1. Phase 1에서 얻은 `companyId`로 회사 사용자 목록 조회
2. `paginateAll()`로 전체 페이지 자동 순회

**출력 파일**: `company/users.json`

### Phase 3: Projects List (프로젝트 목록)

**파일**: `src/extractors/project-extractor.ts` → `extractProjects()`

```
GET /projects?status=Active&page=1
GET /projects?status=Active&page=2
...
GET /projects?status=On Hold&page=1
...
GET /projects?status=Complete&page=1
...
```

1. `Active`, `On Hold`, `Complete` 3가지 상태를 순회
2. 각 상태별로 페이지네이션 (응답의 `total` 값 기준으로 종료)
3. 모든 프로젝트를 하나의 배열로 합침

**출력 파일**: `projects/_index.json`

### Phase 4: Project Details (프로젝트 상세)

**파일**: `src/extractors/project-extractor.ts` → `extractProjectDetails()`

각 프로젝트마다 4개 API를 순차 호출:

```
프로젝트 N에 대해:
  ├─ GET /projects/{id}          → 프로젝트 상세
  ├─ GET /projects/{id}/children → 계층 구조 (그룹/태스크 트리)
  ├─ GET /projects/{id}/access   → 접근 권한
  └─ GET /projects/{id}/boards   → 연결된 보드
```

1. 프로젝트 상세 정보 저장
2. `/children`의 트리 구조를 재귀 탐색하여 **모든 task ID와 group ID 수집** → Phase 5의 입력
3. 접근 권한 정보 저장 (404 에러 시 스킵)
4. 보드 연결 정보 저장 (비어있으면 스킵)
5. 프로젝트 완료 상태를 progress에 기록 (재개 시 건너뛰기 위해)

**출력 파일** (프로젝트마다):
```
projects/{projectId}/project.json
projects/{projectId}/children.json
projects/{projectId}/accesses.json
projects/{projectId}/boards/_index.json
```

### Phase 5: Task Details (태스크 상세)

**파일**: `src/extractors/task-extractor.ts` → `extractTasks()`

Phase 4에서 발견된 모든 task ID에 대해 반복:

```
태스크 N에 대해:
  ├─ GET /tasks/{id}            → 태스크 상세
  ├─ GET /tasks/{id}/checklist  → 체크리스트
  ├─ GET /tasks/{id}/documents  → 첨부파일 메타데이터
  └─ GET /tasks/{id}/comments   → 댓글
```

1. 태스크 상세 정보 저장
2. 체크리스트 항목 저장 (비어있으면 스킵)
3. 첨부 문서 메타데이터 저장 + **다운로드 큐에 등록** (Phase 8에서 실제 다운로드)
4. 태스크 댓글 저장
5. 50건마다 진행 상황 로그 출력 및 상태 저장

**출력 파일** (태스크마다):
```
tasks/{taskId}/task.json
tasks/{taskId}/checklist.json         (있는 경우)
tasks/{taskId}/documents/_index.json  (있는 경우)
comments/by-task/{taskId}.json        (있는 경우)
```

완료 후 `tasks/_index.json`에 전체 태스크 인덱스 파일 생성.

### Phase 5.5: Project Comments (프로젝트 댓글)

**파일**: `src/extractors/comment-extractor.ts` → `extractProjectComments()`

```
각 프로젝트에 대해:
  GET /projects/{id}/comments (페이지네이션)
```

태스크 댓글은 Phase 5에서 이미 추출되므로, 여기서는 **프로젝트 레벨 댓글만** 추출합니다.

**출력 파일**: `comments/by-project/{projectId}.json`

### Phase 6: Time Tracking (시간 추적)

**파일**: `src/extractors/time-extractor.ts` → `extractTimeTracking()`

```
GET /times (페이지네이션) → 전체 시간 기록
```

`paginateAll()`로 전체 시간 기록을 한 번에 조회합니다.

**출력 파일**: `time-tracking/time-blocks.json`

### Phase 7: Boards (보드)

**파일**: `src/extractors/board-extractor.ts` → `extractBoards()`

```
GET /boards (페이지네이션) → 전체 보드 목록
```

**출력 파일**: `boards/_index.json`

### Phase 8: Documents (문서 다운로드)

**파일**: `src/extractors/document-extractor.ts` → `extractDocuments()`

Phase 5에서 큐에 등록된 문서들을 실제로 다운로드합니다:

```
각 문서에 대해:
  1. tasks/{taskId}/documents/_index.json에서 download_url 읽기
  2. 최신 버전의 download_url로 스트림 다운로드
  3. SHA-256 해시 계산하며 파일 저장
```

1. 문서 메타데이터 파일(`_index.json`)에서 최신 버전의 `download_url` 추출
2. `ApiClient.getStreamFromUrl()`로 스트림 다운로드 (타임아웃: 120초)
3. 파일명에서 특수문자(`<>:"/\|?*`) 제거 후 저장
4. SHA-256 해시를 계산하면서 기록
5. 20건마다 진행 상황 로그 출력

**출력 파일**: `tasks/{taskId}/documents/files/{fileName}`

`--skip-documents` 플래그 또는 `DOWNLOAD_DOCUMENTS=false` 설정으로 이 단계를 건너뛸 수 있습니다.

### Phase 9: Verification (검증)

**파일**: `src/index.ts` → `runVerification()`

전체 추출 과정의 통계를 집계하고 무결성 보고서를 생성합니다:

```json
{
  "timestamp": "2026-02-07T00:16:22.518Z",
  "overall": "pass | warnings",
  "summary": {
    "projectsCompleted": 368,
    "tasksCompleted": 15249,
    "tasksDiscovered": 15249,
    "groupsDiscovered": 1658,
    "documentsQueued": 312,
    "errorsCount": 368
  },
  "phases": { ... },
  "errors": [ ... ]
}
```

**출력 파일**: `verification/integrity-check.json`

---

## 8. 안전장치 및 에러 처리

### 8.1 Rate Limiter (요청 속도 제어)

**파일**: `src/utils/rate-limiter.ts`

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `maxConcurrency` | 5 | 동시 진행 가능한 요청 수 |
| `minGapMs` | 200ms | 요청 간 최소 간격 |

**동작 방식**:
- `acquire()`: 동시성 슬롯이 빌 때까지 대기 + 최소 간격 보장
- `release()`: 슬롯 해제 후 대기 큐에서 다음 요청 실행
- `pauseFor(ms)`: HTTP 429 응답 시 지정 시간만큼 일시 정지

### 8.2 Retry (재시도)

**파일**: `src/utils/retry.ts`

| 설정 | 기본값 | 설명 |
|------|--------|------|
| `maxRetries` | 3 | 최대 재시도 횟수 |
| `baseDelayMs` | 1,000ms | 기본 대기 시간 |
| `maxDelayMs` | 30,000ms | 최대 대기 시간 |
| `jitterMs` | 500ms | 랜덤 지터 범위 |

**지수 백오프 공식**:
```
delay = min(baseDelay * 2^attempt + random(0~jitter), maxDelay)
```

예시: 1차 재시도 ≈ 1~1.5초, 2차 ≈ 2~2.5초, 3차 ≈ 4~4.5초

### 8.3 HTTP 429 Rate Limit 처리

`ApiClient.get()`에서 HTTP 429 응답을 받으면:
1. `Retry-After` 헤더 값 읽기 (기본값 60초)
2. `rateLimiter.pauseFor()`로 해당 시간만큼 대기
3. 슬롯 해제 후 같은 요청을 재귀적으로 재시도

### 8.4 타임아웃

| 요청 유형 | 타임아웃 | 설정 위치 |
|-----------|---------|----------|
| 일반 API 요청 | 30초 | `requestTimeoutMs` |
| 문서 다운로드 | 120초 | `downloadTimeoutMs` |

`AbortController`를 사용하여 타임아웃 시 요청을 취소합니다.

### 8.5 HTTP 403/404 에러 처리

권한이 없거나(403) 존재하지 않는(404) 리소스에 대해서는:
- **치명적 에러로 중단하지 않고** 경고 로그를 남기고 스킵
- 에러 내역을 `progress.addError()`로 기록
- 나머지 작업은 계속 진행

### 8.6 진행 상태 추적 및 재개 (Resume)

**파일**: `src/utils/progress.ts`

`ProgressTracker`는 다음 상태를 `_metadata/migration-state.json`에 지속적으로 기록합니다:

| 상태 항목 | 용도 |
|-----------|------|
| `phases.{name}.status` | 각 Phase의 상태 (pending/in_progress/completed/failed) |
| `completedProjectIds[]` | 완료된 프로젝트 ID 목록 |
| `completedTaskIds[]` | 완료된 태스크 ID 목록 |
| `discoveredTaskIds[]` | Phase 4에서 발견된 전체 태스크 ID |
| `discoveredGroupIds[]` | Phase 4에서 발견된 전체 그룹 ID |
| `documentQueue[]` | Phase 8에서 다운로드할 문서 큐 |
| `errors[]` | 에러 내역 (타임스탬프, Phase, 엔드포인트, HTTP 상태코드, 메시지) |

**재개 동작**:
- `--resume` 플래그로 실행 시 기존 상태 파일을 로드
- `isPhaseCompleted()` → 완료된 Phase는 스킵
- `isProjectCompleted()` → 완료된 프로젝트는 스킵
- `isTaskCompleted()` → 완료된 태스크는 스킵

**상태 저장 빈도**:
- Phase 시작/완료 시 즉시 저장
- 프로젝트 완료 시 즉시 저장
- 태스크 완료 시 **50건마다** 저장 (I/O 최적화)
- 에러 발생 시 즉시 저장

### 8.7 로깅

**파일**: `src/utils/logger.ts`

**이중 출력**:
1. **콘솔**: 색상 코드 포함 (`debug=회색, info=시안, warn=노랑, error=빨강`)
2. **파일**: `_metadata/migration-log.json` (NDJSON 형식, 줄 단위 JSON)

로그 레벨 우선순위: `debug(0) < info(1) < warn(2) < error(3)`

설정된 `LOG_LEVEL` 이상의 레벨만 출력됩니다.

---

## 9. 출력 디렉토리 구조

```
output/
├── _metadata/
│   ├── api-discovery.json          # Phase 1 결과: 사용자 + 회사 정보
│   ├── migration-state.json        # 전체 진행 상태 (재개용)
│   └── migration-log.json          # 실행 로그 (NDJSON)
│
├── company/
│   └── users.json                  # Phase 2: 회사 사용자 목록
│
├── projects/
│   ├── _index.json                 # Phase 3: 전체 프로젝트 요약 목록
│   └── {projectId}/               # Phase 4: 프로젝트별 디렉토리
│       ├── project.json            #   프로젝트 상세 정보
│       ├── children.json           #   계층 구조 (그룹/태스크 트리)
│       ├── accesses.json           #   접근 권한
│       └── boards/
│           └── _index.json         #   연결된 보드
│
├── tasks/
│   ├── _index.json                 # Phase 5 완료 후: 전체 태스크 인덱스
│   └── {taskId}/                   # Phase 5: 태스크별 디렉토리
│       ├── task.json               #   태스크 상세 정보
│       ├── checklist.json          #   체크리스트 (있는 경우)
│       └── documents/
│           ├── _index.json         #   문서 메타데이터 (있는 경우)
│           └── files/
│               └── {fileName}      #   Phase 8: 다운로드된 실제 파일
│
├── comments/
│   ├── by-project/
│   │   └── {projectId}.json        # Phase 5.5: 프로젝트 레벨 댓글
│   └── by-task/
│       └── {taskId}.json           # Phase 5: 태스크 레벨 댓글
│
├── time-tracking/
│   └── time-blocks.json            # Phase 6: 시간 추적 데이터
│
├── boards/
│   └── _index.json                 # Phase 7: 보드 목록
│
└── verification/
    └── integrity-check.json        # Phase 9: 무결성 검증 보고서
```

### 파일 기록 방식

**파일**: `src/utils/file-writer.ts`

| 메서드 | 용도 | 특징 |
|--------|------|------|
| `writeJson()` | JSON 데이터 저장 | 2-space 들여쓰기, UTF-8, 디렉토리 자동 생성 |
| `writeStream()` | 바이너리 파일 저장 | Node.js 스트림 파이프라인, SHA-256 해시 계산 |

---

## 10. TypeScript 타입 정의

### 10.1 TeamGantt API 엔티티 타입

**파일**: `src/types/teamgantt.ts`

모든 타입에는 `[key: string]: unknown` 인덱스 시그니처가 포함되어 있어, API 응답에 새로운 필드가 추가되더라도 타입 에러 없이 처리됩니다.

```typescript
// 주요 타입 목록
TGCurrentUser    // 인증된 현재 사용자
TGUser           // 회사 사용자
TGProject        // 프로젝트
TGGroup          // 그룹 (태스크 폴더)
TGTask           // 태스크
TGComment        // 댓글
TGTimeBlock      // 시간 기록
TGBoard          // 보드
TGColumn         // 보드 컬럼
TGCard           // 보드 카드
TGDocument       // 첨부 문서
TGAccess         // 접근 권한
TGChecklist      // 체크리스트 항목
TGProjectChild   // 프로젝트 계층 노드 (type: "group" | "task")
TGPaginatedResponse<T>  // 페이지네이션 응답 래퍼
TGSingleResponse<T>     // 단일 리소스 응답 래퍼
```

### 10.2 마이그레이션 상태 타입

**파일**: `src/utils/progress.ts`, `src/types/migration.ts`

```typescript
// CLI 인자
interface CliArgs {
  discoverOnly: boolean;
  verifyOnly: boolean;
  resume: boolean;
  skipDocuments: boolean;
  entity?: string;
}

// 진행 상태
interface MigrationState {
  startedAt: string;
  lastUpdatedAt: string;
  phases: {                         // 9개 Phase 각각의 상태
    discovery: PhaseState;
    company: PhaseState;
    projects: PhaseState;
    projectDetails: PhaseState;
    tasks: PhaseState;
    timeTracking: PhaseState;
    boards: PhaseState;
    documents: PhaseState;
    verification: PhaseState;
  };
  completedProjectIds: string[];    // 완료된 프로젝트 ID
  completedTaskIds: string[];       // 완료된 태스크 ID
  discoveredTaskIds: string[];      // 발견된 태스크 ID
  discoveredGroupIds: string[];     // 발견된 그룹 ID
  documentQueue: Array<{            // 문서 다운로드 큐
    docId: string;
    taskId: string;
    fileName: string;
  }>;
  errors: ErrorEntry[];             // 에러 내역
}

// Phase 상태
interface PhaseState {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  itemsProcessed: number;
  itemsTotal: number;
}
```

---

## 11. 실행 방법

### 11.1 사전 준비

```bash
cd migration
npm install
```

`.env.example`을 복사하여 `.env`를 생성하고 `COGNITO_REFRESH_TOKEN` 값을 설정합니다.

### 11.2 npm 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run migrate` | 전체 추출 실행 (Phase 1~9) |
| `npm run migrate:discover` | Phase 1 디스커버리만 실행 |
| `npm run migrate:resume` | 중단된 추출 이어서 실행 |
| `npm run migrate:verify` | Phase 9 검증만 실행 |

### 11.3 CLI 인자

| 플래그 | 설명 |
|--------|------|
| `--discover-only` | Phase 1 완료 후 종료 |
| `--verify-only` | Phase 9 검증만 실행 |
| `--resume` | 이전 상태에서 재개 |
| `--skip-documents` | Phase 8 문서 다운로드 건너뛰기 |
| `--entity={name}` | 특정 엔티티만 추출 |

### 11.4 실행 예시

```bash
# 전체 추출 (처음부터)
npm run migrate

# 디스커버리만 실행하여 인증 및 회사 정보 확인
npm run migrate:discover

# 중단된 지점부터 재개
npm run migrate:resume

# 문서 다운로드 없이 데이터만 추출
npx tsx src/index.ts --skip-documents

# 디버그 로그 활성화 (.env에서 LOG_LEVEL=debug 설정 후)
npm run migrate
```

---

## 12. 실제 실행 결과

2026-02-06에 실행된 실제 마이그레이션 결과입니다.

### 12.1 소요 시간

| Phase | 시작 | 완료 | 소요 시간 |
|-------|------|------|----------|
| 1. Discovery | 15:23:06 | 15:23:08 | ~2초 |
| 2. Company | 15:23:08 | 15:23:08 | <1초 |
| 3. Projects List | 16:53:55 | 16:54:00 | ~5초 |
| 4. Project Details | 16:54:00 | 17:03:05 | ~9분 |
| 5. Tasks | 17:03:05 | 00:04:07 (+1일) | **~7시간** |
| 6. Time Tracking | 00:06:47 | 00:06:47 | <1초 |
| 7. Boards | 00:06:47 | 00:06:47 | <1초 |
| 8. Documents | 00:06:47 | 00:16:22 | ~10분 |
| **전체** | **15:23:06** | **00:16:22** | **~8시간 53분** |

> Phase 5(태스크 상세)가 15,249건의 태스크 각각에 대해 최대 4개의 API를 호출하므로 가장 오래 걸립니다 (최대 60,996건의 API 호출).

### 12.2 추출 통계

| 엔티티 | 수량 |
|--------|------|
| 사용자 | 38명 |
| 프로젝트 | 368개 |
| 태스크 | 15,249개 |
| 그룹 | 1,658개 |
| 시간 기록 | 7건 |
| 보드 | 0개 |
| 문서 (다운로드) | 312개 |
| **에러** | **368건** (모두 project-access 404 에러) |

### 12.3 에러 분석

발생한 368건의 에러는 **모두 `/projects/{id}/access` 엔드포인트의 HTTP 404 응답**입니다. 이는 일부 프로젝트에서 접근 권한 API가 지원되지 않는 것으로 보이며, 프로젝트 데이터 자체의 추출에는 영향을 주지 않았습니다.

---

## 13. 트러블슈팅

### Cognito 토큰 만료

```
Error: Cognito token refresh failed (HTTP 400)
```

→ Refresh Token이 만료되었을 수 있습니다. TeamGantt에 다시 로그인하여 새 Refresh Token을 `.env`에 업데이트하세요.

### Rate Limit

```
Rate limited on /tasks/12345, waiting 60000ms
```

→ 정상적인 동작입니다. `MAX_CONCURRENCY` 값을 낮추면 (예: 3) Rate Limit 발생 빈도를 줄일 수 있습니다.

### 중간에 중단된 경우

```bash
npm run migrate:resume
```

→ `_metadata/migration-state.json`에 저장된 상태를 기반으로 이미 완료된 항목을 건너뛰고 이어서 실행합니다.

### 문서 다운로드 실패

```
Failed to download document 12345 (report.pdf): HTTP 403
```

→ 일부 문서는 접근 권한이 없거나 삭제되었을 수 있습니다. 에러 목록은 `verification/integrity-check.json`에서 확인할 수 있습니다.

### 페이지네이션 응답 형식 차이

TeamGantt API의 응답 형식이 엔드포인트마다 다를 수 있습니다:
- `{ data: [...] }` — 래핑된 배열
- `[...]` — 직접 배열
- `{ projects: [...], total: N }` — 프로젝트 전용 형식

코드에서는 이 모든 형식을 처리하도록 구현되어 있습니다 (`response.data?.data ?? response.data` 패턴).
