# Migration 인증 가이드 (AWS Cognito)

TeamGantt 데이터 마이그레이션 시 사용되는 AWS Cognito 기반 인증 시스템에 대한 상세 가이드입니다.

> **비공식 방법 안내**
>
> TeamGantt는 공식 API 키 발급이나 OAuth 등록 등 외부 개발자를 위한 공식 인증 수단을 제공하지 않습니다.
> 이 문서에서 설명하는 방법은 **브라우저에서 로그인 세션의 Cognito Refresh Token을 수동으로 추출**하여
> 사용하는 비공식 워크어라운드입니다.
>
> 따라서 다음 사항에 유의하세요:
> - TeamGantt 측의 내부 인증 구조 변경(User Pool ID, Client ID, 토큰 정책 등)에 의해 **언제든 동작이 중단**될 수 있습니다.
> - 이 방법은 TeamGantt의 이용약관(Terms of Service)에 따라 허용되지 않을 수 있으므로, **자사 데이터 백업/마이그레이션 목적으로만** 사용하시기 바랍니다.
> - Refresh Token의 유효 기간은 서버 측 설정에 따르며, 사전 고지 없이 변경될 수 있습니다.

---

## 목차

1. [배경: API 분석 과정](#1-배경-api-분석-과정)
2. [인증 아키텍처 개요](#2-인증-아키텍처-개요)
3. [Cognito 토큰 체계 이해](#3-cognito-토큰-체계-이해)
4. [Refresh Token 획득 방법 (단계별)](#4-refresh-token-획득-방법-단계별)
5. [토큰 갱신 메커니즘 상세](#5-토큰-갱신-메커니즘-상세)
6. [API Client의 인증 통합](#6-api-client의-인증-통합)
7. [환경변수 설정](#7-환경변수-설정)
8. [토큰 만료와 갱신 타이밍](#8-토큰-만료와-갱신-타이밍)
9. [인증 관련 트러블슈팅](#9-인증-관련-트러블슈팅)
10. [보안 주의사항](#10-보안-주의사항)

---

## 1. 배경: API 분석 과정

### 왜 리버스 엔지니어링이 필요한가

TeamGantt는 외부 개발자를 위한 공식 API 문서, API 키 발급, OAuth 앱 등록 등을 제공하지 않습니다. 그러나 TeamGantt 웹앱 자체는 현대적인 SPA(Single Page Application) 구조로 되어 있어, **프론트엔드가 내부 REST API를 호출하여 백엔드에서 데이터를 가져오는 방식**으로 동작합니다.

즉, API는 존재하지만 공식적으로 외부에 공개되지 않은 **내부 API**입니다. 이 마이그레이션 도구는 브라우저 개발자 도구를 통해 이 내부 API의 구조를 분석(리버스 엔지니어링)하여 동일한 방식으로 호출합니다.

### 분석 방법: 브라우저 Network 탭

API 엔드포인트, 인증 방식, 요청/응답 형식은 모두 브라우저의 개발자 도구(F12) **Network 탭**에서 확인했습니다:

1. **TeamGantt에 로그인**한 상태에서 `F12` → **Network** 탭 열기
2. **XHR/Fetch 필터** 선택 (일반 리소스 요청 제외)
3. TeamGantt 웹앱을 **탐색하면서** (프로젝트 클릭, 태스크 열기, 멤버 조회 등) 발생하는 요청 관찰

각 요청에서 다음 정보를 확인할 수 있습니다:

```
── Request ──────────────────────────────────────────────
GET https://api.teamgantt.com/v1/projects?status=Active&page=1
Authorization: Bearer eyJraWQi...
Accept: application/json

── Response (200 OK) ────────────────────────────────────
{
  "projects": [ { "id": "123", "name": "...", ... }, ... ],
  "total": 368
}
```

| 확인 항목 | Network 탭에서 보이는 위치 | 이 프로젝트에서 알아낸 것 |
|-----------|--------------------------|------------------------|
| API 기본 URL | Request URL | `https://api.teamgantt.com/v1` |
| 엔드포인트 경로 | Request URL | `/projects`, `/tasks/{id}`, `/current_user` 등 |
| 인증 방식 | Request Headers | `Authorization: Bearer {JWT}` |
| 쿼리 파라미터 | Request URL | `?status=Active&page=1` 등 |
| 응답 데이터 구조 | Response (Preview/Response 탭) | JSON 필드명, 중첩 구조, 페이지네이션 형식 |

### Cognito 인증 정보의 발견

Cognito 관련 설정값(Region, User Pool ID, Client ID)도 동일한 방법으로 확인했습니다:

1. TeamGantt 로그인 후 Network 탭에서 `cognito-idp` 도메인으로의 요청 관찰
2. 프론트엔드가 토큰 갱신을 위해 보내는 요청에서 확인:

```
── Request ──────────────────────────────────────────────
POST https://cognito-idp.us-east-2.amazonaws.com/
X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth

{
  "AuthFlow": "REFRESH_TOKEN_AUTH",
  "ClientId": "5epdg5kohl8ttomj6kce8rucjd",    ← Client ID
  "AuthParameters": {
    "REFRESH_TOKEN": "eyJjdHki..."              ← Refresh Token
  }
}
```

- **Region**: 요청 URL의 `cognito-idp.us-east-2.amazonaws.com`에서 `us-east-2`
- **Client ID**: 요청 본문의 `ClientId` 필드
- **User Pool ID**: Local Storage의 Cognito 키 패턴 또는 ID Token의 `iss` 클레임에서 확인

### 이 방식의 한계

| 항목 | 설명 |
|------|------|
| **문서 부재** | 공식 API 문서가 없으므로, 엔드포인트별 파라미터와 응답 형식을 직접 실험하며 파악해야 함 |
| **호환성 보장 없음** | 내부 API이므로 사전 공지 없이 엔드포인트, 응답 구조, 인증 방식이 변경될 수 있음 |
| **Rate Limit 불명확** | 외부 사용을 고려하지 않았으므로 요청 빈도 제한 정책이 명시되어 있지 않음 |
| **이용약관** | 내부 API의 비공식 사용이 서비스 이용약관에 위반될 수 있음 |

---

## 2. 인증 아키텍처 개요

### TeamGantt의 인증 방식

TeamGantt는 **AWS Cognito User Pool**을 인증 백엔드로 사용합니다. 사용자가 웹 브라우저에서 TeamGantt에 로그인하면, Cognito가 세 가지 토큰(ID Token, Access Token, Refresh Token)을 발급합니다.

이 마이그레이션 도구는 **Refresh Token**을 사용하여 ID Token을 자동으로 발급받고, 이를 TeamGantt API 호출 시 Bearer Token으로 사용합니다.

### 전체 인증 흐름도

```
┌─────────────────────────────────────────────────────────────────┐
│                    [사전 준비 - 수동 1회]                         │
│                                                                 │
│  1. 브라우저에서 TeamGantt 로그인                                 │
│  2. 개발자 도구에서 Refresh Token 추출                            │
│  3. .env 파일의 COGNITO_REFRESH_TOKEN에 저장                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  [마이그레이션 실행 시 - 자동]                     │
│                                                                 │
│  ┌──────────┐     POST (REFRESH_TOKEN_AUTH)     ┌─────────────┐ │
│  │ Migration │ ──────────────────────────────── > │ AWS Cognito │ │
│  │ Script    │                                   │ IDP         │ │
│  │           │ < ──────────────────────────────── │             │ │
│  └──────────┘     { IdToken, ExpiresIn }         └─────────────┘ │
│       │                                                          │
│       │  Authorization: Bearer {IdToken}                         │
│       ▼                                                          │
│  ┌──────────────┐                                                │
│  │ TeamGantt API │                                               │
│  └──────────────┘                                                │
└──────────────────────────────────────────────────────────────────┘
```

### 관련 소스 파일

| 파일 | 역할 |
|------|------|
| `src/api/cognito-auth.ts` | Cognito 토큰 관리 (갱신, 캐싱) |
| `src/api/client.ts` | API 요청 시 토큰 자동 주입 |
| `src/config.ts` | Cognito 환경변수 로드 및 검증 |
| `src/index.ts` | CognitoAuth 인스턴스 생성 및 연결 |

---

## 3. Cognito 토큰 체계 이해

AWS Cognito는 인증 시 세 가지 JWT 토큰을 발급합니다:

### 3.1 토큰 종류

| 토큰 | 용도 | 유효기간 | 갱신 가능 |
|------|------|----------|-----------|
| **ID Token** | 사용자 신원 증명, API 인증에 사용 | 1시간 (3600초) | Refresh Token으로 갱신 |
| **Access Token** | AWS 리소스 접근 | 1시간 (3600초) | Refresh Token으로 갱신 |
| **Refresh Token** | 새 ID/Access Token 발급 | 30일~1년 (서버 설정에 따라 다름) | 갱신 불가, 재로그인 필요 |

### 3.2 이 프로젝트에서 사용하는 토큰

- **Refresh Token**: `.env` 파일에 저장하여 스크립트 시작 시 로드
- **ID Token**: Refresh Token으로 자동 발급받아 API 호출에 사용

> **왜 ID Token을 사용하나요?**
>
> TeamGantt API는 Cognito의 ID Token을 Bearer Token으로 받아들입니다.
> Access Token이 아닌 **ID Token**을 사용한다는 점에 주의하세요.
> 코드에서 `AuthenticationResult.IdToken`을 추출하여 `Authorization` 헤더에 넣습니다.

### 3.3 JWT 토큰 구조 (참고)

ID Token은 표준 JWT 형식으로, `.`으로 구분된 3개 파트로 구성됩니다:

```
eyJhbGci...header.eyJzdWIi...payload.signature
```

디코딩하면 다음과 같은 정보를 확인할 수 있습니다 (디버깅 시 유용):

```json
{
  "sub": "user-uuid",
  "iss": "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_QHz4338Im",
  "aud": "5epdg5kohl8ttomj6kce8rucjd",
  "token_use": "id",
  "exp": 1707235200,
  "iat": 1707231600,
  "email": "user@example.com"
}
```

- `exp`: 토큰 만료 시각 (Unix timestamp)
- `iat`: 토큰 발급 시각
- `iss`: 발급자 (Cognito User Pool URL)
- `aud`: 대상 (Client ID)

---

## 4. Refresh Token 획득 방법 (단계별)

> **비공식 방법**: TeamGantt는 외부 개발자용 API 키나 OAuth 앱 등록을 제공하지 않으므로,
> 브라우저 개발자 도구에서 직접 Cognito Refresh Token을 추출하는 방식을 사용합니다.
> 이는 공식적으로 지원되는 인증 흐름이 아니며, 자사 데이터 마이그레이션 용도의 임시 방편입니다.

Refresh Token은 TeamGantt 웹사이트에 로그인한 후 브라우저에서 추출해야 합니다. 이 과정은 **수동으로 1회만** 수행하면 되며, 토큰이 만료될 때까지 재사용 가능합니다.

### 4.1 방법 A: 브라우저 Local Storage에서 추출 (권장)

1. **TeamGantt 로그인**
   - 브라우저에서 [https://app.teamgantt.com](https://app.teamgantt.com)에 접속
   - 이메일과 비밀번호로 로그인

2. **개발자 도구 열기**
   - Windows/Linux: `F12` 또는 `Ctrl + Shift + I`
   - macOS: `Cmd + Option + I`

3. **Local Storage 확인**
   - 개발자 도구 상단 탭에서 **Application** (Chrome) 또는 **Storage** (Firefox) 선택
   - 왼쪽 패널에서 **Local Storage** 확장
   - `https://app.teamgantt.com` 항목 클릭

4. **Cognito 키 찾기**
   - Cognito 관련 키를 검색합니다. 일반적으로 다음과 같은 패턴의 키가 있습니다:
   ```
   CognitoIdentityServiceProvider.5epdg5kohl8ttomj6kce8rucjd.<user-sub>.refreshToken
   ```
   - 또는 키 목록에서 `refreshToken`이 포함된 항목을 찾습니다

5. **값 복사**
   - 해당 키의 값(매우 긴 문자열)을 더블클릭하여 선택 후 복사
   - 이 값이 Refresh Token입니다

6. **`.env` 파일에 저장**
   ```env
   COGNITO_REFRESH_TOKEN=eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ...
   ```

### 4.2 방법 B: 네트워크 탭에서 추출

1. TeamGantt에 로그인한 상태에서 개발자 도구의 **Network** 탭을 엽니다.
2. 페이지를 새로고침합니다.
3. 네트워크 요청 중 `cognito-idp.us-east-2.amazonaws.com`으로의 요청을 찾습니다.
4. 요청 본문(Request Payload)에서 `REFRESH_TOKEN` 값을 확인합니다:
   ```json
   {
     "AuthFlow": "REFRESH_TOKEN_AUTH",
     "ClientId": "5epdg5kohl8ttomj6kce8rucjd",
     "AuthParameters": {
       "REFRESH_TOKEN": "여기에_있는_값을_복사"
     }
   }
   ```

### 4.3 방법 C: Cookie에서 추출

일부 Cognito 구현에서는 쿠키에 토큰을 저장합니다:

1. 개발자 도구 → **Application** → **Cookies**
2. `https://app.teamgantt.com` 도메인의 쿠키 확인
3. `cognito` 또는 `refresh` 관련 쿠키 값 확인

> **Tip**: 어떤 방법이든 Refresh Token은 일반적으로 매우 긴 문자열(수백~수천 글자)입니다.
> `eyJ`로 시작하면 JWT 형식의 Refresh Token입니다.

### 4.4 Refresh Token 유효성 간단 확인

토큰을 얻은 후 다음 명령으로 유효성을 빠르게 확인할 수 있습니다:

```bash
# 디스커버리만 실행하여 인증 확인
npm run migrate:discover
```

성공 시 다음과 같은 출력이 나타납니다:
```
[INFO] Refreshing Cognito idToken...
[INFO] Cognito idToken refreshed successfully { expiresIn: 3600, ... }
[INFO] === Phase 1: Discovery ===
[INFO] Current user: John Doe (john@example.com)
```

실패 시:
```
Error: Cognito token refresh failed (HTTP 400): ...
```
→ Refresh Token이 잘못되었거나 만료된 것입니다. 다시 추출하세요.

---

## 5. 토큰 갱신 메커니즘 상세

### 5.1 CognitoAuth 클래스 구조

**파일**: `src/api/cognito-auth.ts`

```typescript
class CognitoAuth {
  // 설정값 (Cognito 연결 정보)
  private config: CognitoAuthConfig;

  // 캐시된 ID Token (갱신될 때마다 업데이트)
  private currentIdToken: string | null = null;

  // 토큰 만료 시각 (밀리초 타임스탬프)
  private tokenExpiresAt: number = 0;
}
```

### 5.2 토큰 요청 흐름 (`getToken()`)

`getToken()`은 모든 API 요청 전에 호출되며, 유효한 ID Token을 반환합니다:

```
getToken() 호출
    │
    ├─ 캐시된 토큰 있음 AND 만료까지 5분 이상 남음?
    │   └─ YES → 캐시된 토큰 즉시 반환 (네트워크 요청 없음)
    │
    └─ NO → refreshToken() 호출
            │
            ├─ Cognito IDP에 POST 요청
            ├─ 새 ID Token 수신
            ├─ currentIdToken 업데이트
            ├─ tokenExpiresAt 업데이트
            └─ 새 토큰 반환
```

핵심 코드:

```typescript
async getToken(): Promise<string> {
  // 캐시된 토큰이 있고, 만료 5분 전이 아니면 재사용
  if (this.currentIdToken && Date.now() < this.tokenExpiresAt - 5 * 60 * 1000) {
    return this.currentIdToken;
  }

  // 만료 임박 또는 토큰 없음 → 갱신
  await this.refreshToken();
  return this.currentIdToken!;
}
```

### 5.3 토큰 갱신 프로세스 (`refreshToken()`)

갱신은 AWS Cognito IDP 엔드포인트에 직접 HTTP POST 요청으로 수행됩니다:

#### 요청 (Request)

```
POST https://cognito-idp.us-east-2.amazonaws.com/
```

**헤더**:
```
Content-Type: application/x-amz-json-1.1
X-Amz-Target: AWSCognitoIdentityProviderService.InitiateAuth
```

**본문 (Body)**:
```json
{
  "AuthFlow": "REFRESH_TOKEN_AUTH",
  "ClientId": "5epdg5kohl8ttomj6kce8rucjd",
  "AuthParameters": {
    "REFRESH_TOKEN": "<.env에 저장된 Refresh Token 값>"
  }
}
```

| 필드 | 설명 |
|------|------|
| `AuthFlow` | `REFRESH_TOKEN_AUTH` — Refresh Token으로 새 토큰 발급 |
| `ClientId` | Cognito App Client ID (TeamGantt의 고정값) |
| `REFRESH_TOKEN` | 브라우저에서 추출한 Refresh Token |

#### 응답 (Response) — 성공 시 (HTTP 200)

```json
{
  "AuthenticationResult": {
    "AccessToken": "eyJraWQi...",
    "IdToken": "eyJraWQi...",
    "TokenType": "Bearer",
    "ExpiresIn": 3600
  }
}
```

| 필드 | 설명 | 사용 여부 |
|------|------|-----------|
| `IdToken` | API 호출에 사용할 JWT 토큰 | **사용** |
| `AccessToken` | AWS 리소스 접근용 토큰 | 미사용 |
| `TokenType` | 항상 `"Bearer"` | 참고용 |
| `ExpiresIn` | 토큰 유효 시간 (초), 보통 `3600` (1시간) | **사용** |

> **참고**: Refresh Token 갱신 시에는 새 Refresh Token이 발급되지 않습니다.
> 기존 Refresh Token을 계속 사용합니다.

#### 응답 — 실패 시

| HTTP 상태 | 에러 코드 | 원인 |
|-----------|----------|------|
| 400 | `NotAuthorizedException` | Refresh Token 만료 또는 무효 |
| 400 | `InvalidParameterException` | 잘못된 파라미터 |
| 400 | `UserNotFoundException` | 사용자 계정 비활성화/삭제 |
| 429 | - | Cognito 요청 빈도 제한 |

### 5.4 토큰 캐싱 및 만료 관리

토큰이 갱신되면 다음 두 값이 업데이트됩니다:

```typescript
// 새 ID Token 저장
this.currentIdToken = result.IdToken;

// 만료 시각 계산 (현재 시각 + ExpiresIn 초 → 밀리초)
this.tokenExpiresAt = Date.now() + result.ExpiresIn * 1000;
```

**만료 타이밍 예시** (ExpiresIn = 3600초):

```
시각          이벤트
────────────  ──────────────────────────────────────
10:00:00      토큰 갱신 완료, tokenExpiresAt = 11:00:00
10:00:00 ~    getToken() → 캐시된 토큰 반환 (갱신 안 함)
10:54:59      getToken() → 캐시된 토큰 반환 (5분 이상 남음)
10:55:00      getToken() → 5분 이하 남음 → refreshToken() 호출!
10:55:01      새 토큰 갱신 완료, tokenExpiresAt = 11:55:01
...           (반복)
```

### 5.5 왜 5분 버퍼를 두는가?

```typescript
Date.now() < this.tokenExpiresAt - 5 * 60 * 1000  // 5분 = 300,000ms
```

5분 버퍼는 다음과 같은 상황을 방지합니다:

1. **네트워크 지연**: 토큰을 검증하는 시점과 실제 API 요청이 서버에 도달하는 시점 사이의 시간차
2. **시간 동기화 차이**: 클라이언트와 서버 시계의 미세한 차이
3. **대기 중인 요청**: Rate Limiter에 의해 대기 중인 요청이 실행될 때 이미 만료된 토큰을 사용하는 것 방지
4. **배치 요청**: 여러 동시 요청이 같은 토큰으로 처리될 때 중간에 만료되는 것 방지

---

## 6. API Client의 인증 통합

### 6.1 요청별 자동 토큰 주입

**파일**: `src/api/client.ts`

모든 API 요청은 `fetchWithTimeout()` 메서드를 거치며, 여기서 매번 `cognitoAuth.getToken()`을 호출합니다:

```typescript
private async fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // ✅ 매 요청마다 유효한 토큰 확보 (필요시 자동 갱신)
    const token = await this.cognitoAuth.getToken();

    return await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,  // ID Token을 Bearer로 전달
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
```

### 6.2 인증 + Rate Limiting + Retry 통합 흐름

실제 API 요청 시 인증, Rate Limiting, Retry가 함께 동작하는 전체 흐름:

```
client.get("/projects")
    │
    ▼
rateLimiter.acquire()          ← 동시성 슬롯 확보 (최대 5개)
    │
    ▼
withRetry(                     ← 실패 시 최대 3회 재시도
    fetchWithTimeout()
        │
        ├─ cognitoAuth.getToken()  ← 토큰 확인/갱신
        │     ├─ 유효: 캐시된 토큰 반환
        │     └─ 만료 임박: Cognito에서 새 토큰 발급
        │
        ├─ fetch(url, { Authorization: Bearer {token} })
        │
        └─ AbortController (30초 타임아웃)
)
    │
    ├─ HTTP 200: JSON 파싱 후 반환
    ├─ HTTP 429: Rate Limit 대기 후 재시도
    └─ HTTP 4xx/5xx: ApiClientError throw → Retry에서 재시도
```

### 6.3 토큰 갱신이 동시 요청에 미치는 영향

동시에 여러 API 요청이 발생하면 토큰 갱신이 여러 번 호출될 수 있습니다:

```
요청 A: getToken() → 만료 임박 → refreshToken() 시작
요청 B: getToken() → 만료 임박 → refreshToken() 시작  (중복 호출)
```

현재 구현에서는 별도의 동시성 제어가 없어 토큰 갱신이 중복될 수 있지만, Cognito 서버는 같은 Refresh Token으로의 중복 요청을 정상적으로 처리합니다. 둘 다 유효한 (동일하거나 다른) ID Token을 받게 되므로 기능상 문제는 없습니다.

---

## 7. 환경변수 설정

### 7.1 Cognito 관련 환경변수

`.env.example`을 `.env`로 복사한 후 `COGNITO_REFRESH_TOKEN`만 실제 값으로 변경하면 됩니다:

```env
# AWS Cognito 인증 정보 (TeamGantt 고정값)
COGNITO_REGION=us-east-2
COGNITO_USER_POOL_ID=us-east-2_QHz4338Im
COGNITO_CLIENT_ID=5epdg5kohl8ttomj6kce8rucjd

# ⚠️ 이 값만 실제 토큰으로 변경하세요
COGNITO_REFRESH_TOKEN=your_refresh_token_here
```

| 변수 | 값 | 변경 여부 | 설명 |
|------|-----|----------|------|
| `COGNITO_REGION` | `us-east-2` | 고정 | TeamGantt Cognito가 위치한 AWS 리전 |
| `COGNITO_USER_POOL_ID` | `us-east-2_QHz4338Im` | 고정 | TeamGantt의 Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | `5epdg5kohl8ttomj6kce8rucjd` | 고정 | TeamGantt의 Cognito App Client ID |
| `COGNITO_REFRESH_TOKEN` | (브라우저에서 추출) | **매번 갱신** | 사용자 개인의 Refresh Token |

### 7.2 설정 검증 (Zod)

**파일**: `src/config.ts`

모든 환경변수는 프로그램 시작 시 Zod 스키마로 검증됩니다:

```typescript
const ConfigSchema = z.object({
  COGNITO_REGION: z.string().min(1, 'Cognito region is required'),
  COGNITO_USER_POOL_ID: z.string().min(1, 'Cognito user pool ID is required'),
  COGNITO_CLIENT_ID: z.string().min(1, 'Cognito client ID is required'),
  COGNITO_REFRESH_TOKEN: z.string().min(1, 'Cognito refresh token is required'),
});
```

누락된 값이 있으면 다음과 같이 명확한 에러 메시지가 출력됩니다:

```
Configuration validation failed:
  - COGNITO_REFRESH_TOKEN: Cognito refresh token is required
```

### 7.3 CognitoAuth 인스턴스 초기화

**파일**: `src/index.ts`

프로그램 시작 시 설정값으로 CognitoAuth 인스턴스를 생성합니다:

```typescript
const cognitoAuth = new CognitoAuth(
  {
    region: config.COGNITO_REGION,           // "us-east-2"
    userPoolId: config.COGNITO_USER_POOL_ID, // "us-east-2_QHz4338Im"
    clientId: config.COGNITO_CLIENT_ID,      // "5epdg5kohl8ttomj6kce8rucjd"
    refreshToken: config.COGNITO_REFRESH_TOKEN, // 사용자 토큰
  },
  logger,
);

// ApiClient에 주입
const client = new ApiClient({
  baseUrl: config.TEAMGANTT_BASE_URL,
  cognitoAuth,   // ← 모든 API 요청에서 토큰 관리에 사용
  maxConcurrency: config.MAX_CONCURRENCY,
  requestTimeoutMs: 30000,
  downloadTimeoutMs: 120000,
  logger,
});
```

---

## 8. 토큰 만료와 갱신 타이밍

### 8.1 ID Token 수명

| 항목 | 값 |
|------|-----|
| 유효 기간 | 3600초 (1시간) |
| 사전 갱신 버퍼 | 300초 (5분) |
| 실효 사용 시간 | ~55분 |

```
│◄────────── 1시간 (3600초) ──────────►│
│                                       │
│◄─── 55분: 캐시 사용 ──►│◄ 5분 버퍼 ►│
                          ↑              ↑
                     갱신 트리거      실제 만료
```

### 8.2 Refresh Token 수명

Refresh Token의 유효 기간은 **Cognito User Pool 서버 설정에 따라** 다릅니다:

| 일반적인 설정 범위 | 설명 |
|---------------------|------|
| 30일 (기본값) | AWS Cognito의 기본 설정 |
| 1일 ~ 3650일 | User Pool 관리자가 설정 가능한 범위 |

> **중요**: Refresh Token은 갱신할 수 없습니다.
> 만료되면 TeamGantt에 다시 로그인하여 새 토큰을 추출해야 합니다.

### 8.3 장시간 실행 시 토큰 갱신 패턴

실제 마이그레이션은 약 8~9시간이 소요됩니다. 이 시간 동안 ID Token은 자동으로 여러 번 갱신됩니다:

```
시간    이벤트
──────  ──────────────────────────────────
00:00   마이그레이션 시작, 첫 토큰 발급 (1번째 갱신)
00:55   Phase 4 진행 중, 토큰 갱신 (2번째)
01:50   Phase 5 진행 중, 토큰 갱신 (3번째)
02:45   Phase 5 진행 중, 토큰 갱신 (4번째)
...
07:35   Phase 5 진행 중, 토큰 갱신 (9번째)
08:30   Phase 8 진행 중, 토큰 갱신 (10번째)
08:53   마이그레이션 완료
```

약 **10회 정도의 자동 갱신**이 발생하며, 모든 갱신은 자동으로 처리됩니다.

---

## 9. 인증 관련 트러블슈팅

### 9.1 Refresh Token 만료

**증상**:
```
Error: Cognito token refresh failed (HTTP 400):
{"__type":"NotAuthorizedException","message":"Refresh Token has expired"}
```

**해결 방법**:
1. TeamGantt 웹사이트에 다시 로그인
2. [4장](#4-refresh-token-획득-방법-단계별)의 방법으로 새 Refresh Token 추출
3. `.env` 파일의 `COGNITO_REFRESH_TOKEN` 값 업데이트
4. `npm run migrate:discover`로 인증 확인

### 9.2 잘못된 Refresh Token

**증상**:
```
Error: Cognito token refresh failed (HTTP 400):
{"__type":"NotAuthorizedException","message":"Invalid Refresh Token"}
```

**원인 및 해결**:
- 토큰 복사 시 일부가 잘렸을 수 있음 → 전체 값을 다시 복사
- 줄바꿈이나 공백이 포함되었을 수 있음 → `.env` 파일에서 토큰 값 주변의 공백 제거
- 토큰 앞뒤에 따옴표가 있으면 제거

### 9.3 사용자 계정 비활성화

**증상**:
```
Error: Cognito token refresh failed (HTTP 400):
{"__type":"UserNotFoundException","message":"User does not exist."}
```

**해결 방법**:
- TeamGantt 관리자에게 계정 상태 확인 요청
- 다른 활성 계정으로 로그인하여 토큰 재발급

### 9.4 Cognito 요청 빈도 제한

**증상**:
```
Error: Cognito token refresh failed (HTTP 429)
```

**해결 방법**:
- 일반적으로 발생하지 않음 (토큰 갱신은 ~55분에 1회)
- 발생 시 잠시 대기 후 재시도
- `MAX_CONCURRENCY` 값을 낮춰 전체 요청 빈도 감소

### 9.5 네트워크 오류

**증상**:
```
Error: Cognito token refresh failed: fetch failed
```

**확인 사항**:
- 인터넷 연결 확인
- `https://cognito-idp.us-east-2.amazonaws.com/` 접근 가능한지 확인
- 방화벽/프록시가 AWS Cognito 엔드포인트를 차단하지 않는지 확인
- VPN 사용 중이면 AWS 리전 접근 가능한지 확인

### 9.6 마이그레이션 중간에 인증 실패

마이그레이션 도중 인증 에러가 발생하면:

1. Refresh Token이 마이그레이션 실행 중에 만료됨
2. `.env`에 새 Refresh Token 저장
3. `npm run migrate:resume`로 중단된 지점부터 재개

`--resume` 플래그는 이미 완료된 Phase와 항목을 건너뛰므로, 인증 문제 해결 후 안전하게 재실행할 수 있습니다.

---

## 10. 보안 주의사항

### 10.1 토큰 보호

- `.env` 파일은 **절대 Git에 커밋하지 마세요** (`.gitignore`에 포함되어 있어야 합니다)
- Refresh Token은 해당 TeamGantt 계정의 전체 접근 권한을 부여합니다
- 토큰을 슬랙, 이메일 등으로 공유하지 마세요

### 10.2 `.gitignore` 확인

```gitignore
# 반드시 포함되어 있어야 합니다
migration/.env
```

### 10.3 토큰 노출 시 대응

Refresh Token이 외부에 노출된 경우:
1. 즉시 TeamGantt에서 비밀번호 변경 (기존 세션/토큰 무효화)
2. 새로 로그인하여 새 Refresh Token 발급
3. 노출된 토큰이 사용된 흔적이 있는지 TeamGantt 활동 로그 확인

### 10.4 최소 권한 원칙

- 마이그레이션에 사용하는 계정은 **읽기 전용 권한**만 있으면 충분합니다
- 가능하면 관리자 계정이 아닌 일반 사용자 계정을 사용하세요
- 마이그레이션 완료 후에는 `.env`에서 토큰 값을 삭제하는 것을 권장합니다
