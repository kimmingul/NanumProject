# NanumProject - 프로젝트 관리 서비스

## 1. 목적

중소형 병원 및 기업을 위한 멀티테넌트 프로젝트 관리(PM) 서비스.
TeamGantt 수준의 Gantt 차트 기반 일정 관리 + 인증/권한 관리를 제공한다.

## 2. 핵심 기능

### Auth 모듈
- **Multi-tenancy:** 테넌트별 독립된 사용자 공간 및 설정
- **Universal Login:** 로그인/회원가입/비밀번호 재설정 UI
- **RBAC:** admin / user / developer 역할 기반 접근 제어
- **Admin Dashboard:** 사용자 관리, 통계 대시보드

### PM 모듈
- **프로젝트 관리:** 프로젝트 CRUD, 상태(active/on_hold/complete/archived), 멤버 권한
- **Gantt 차트:** DevExtreme Gantt 기반 일정 시각화 (태스크 CRUD, 의존성, 리소스 할당)
- **태스크 관리:** 통합 project_items 테이블 (그룹/태스크/마일스톤), 트리 구조, WBS
- **코멘트:** 프로젝트/아이템 대상 다형성 코멘트
- **문서 관리:** 파일 메타데이터 + 버전 히스토리
- **시간 추적:** punched/manual 방식 시간 기록

### 데이터 마이그레이션
- TeamGantt API에서 데이터 추출 (Cognito 인증)
- Supabase로 자동 임포트 (10단계 파이프라인)
- 클린 임포트 (`--clean`) 및 이어하기 (`--resume`) 지원

## 3. 대상 사용자

| 역할 | 설명 |
|------|------|
| 테넌트 admin | 조직 전체 관리. 모든 프로젝트 접근 가능 (project_members 등록 불필요) |
| 프로젝트 admin | 프로젝트 설정, 멤버 초대/관리 |
| 프로젝트 editor | 태스크 생성/수정/삭제, 의존성 관리 |
| 프로젝트 viewer | 읽기 전용 접근 |

## 4. 성공 지표

- Supabase RLS를 통한 완벽한 멀티테넌트 격리
- DevExtreme Gantt/TreeList/DataGrid을 활용한 엔터프라이즈급 UI
- TeamGantt 데이터 완전 마이그레이션 (프로젝트, 태스크, 코멘트, 문서, 시간 기록)
