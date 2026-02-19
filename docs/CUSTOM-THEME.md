# DevExtreme 커스텀 다크 테마 가이드

DevExtreme Fluent Blue Dark 테마의 neutral gray 색상을 Tailwind Slate 계열로 교체하여 앱 전체에 일관된 다크 모드를 구현한 방법을 기록합니다.

---

## 1. 배경 — 왜 커스텀 테마가 필요한가

### 문제

DevExtreme의 Fluent Blue Dark 테마는 **neutral gray** 팔레트를 사용합니다:

```
배경:  #1f1f1f, #292929, #363636
보더:  #616161, #5c5c5c
텍스트: #adadad, #d6d6d6
```

NanumProject의 앱 레이아웃(NavRail, Sidebar, Header 등)은 **Tailwind Slate** 팔레트를 사용합니다:

```
배경:  #0f172a, #1e293b
보더:  #334155, #475569
텍스트: #94a3b8, #cbd5e1
```

Neutral gray는 순수한 회색이고, Slate는 blue-tinted 회색입니다. 이 두 계열이 나란히 놓이면 DevExtreme 위젯 영역이 **갈색(brown-ish)**으로 보이는 시각적 부조화가 발생합니다.

### 해결 전략

DevExtreme의 stock dark CSS 파일을 복사하여, **Python 스크립트로 모든 neutral gray 색상을 slate 계열로 일괄 교체**합니다.

```
Stock CSS (781KB, neutral grays)
    ↓  Python find-and-replace
Custom CSS (782KB, slate palette)
```

### 대안 비교

| 방법 | 장점 | 단점 |
|------|------|------|
| **CSS override (기존)** | 변경 범위 최소화 | 66개 규칙, 36개 `!important`, 누락 쉬움 |
| **ThemeBuilder** | 공식 도구, 비주얼 편집 | 852KB/테마, 2개 필요(1.7MB), Gantt 별도, 버전 종속 |
| **Python 찾아바꾸기 (채택)** | 완전한 커버리지, 자동화, 재현 가능 | 업그레이드마다 재실행 필요 |

---

## 2. 아키텍처

### 파일 구조

```
scripts/
└── patch-dark-theme.py          # 색상 교체 스크립트

src/styles/
├── theme-variables.css          # 앱 CSS 변수 (light/dark)
└── dx.fluent.nanum-dark.css     # 생성된 커스텀 다크 테마 (782KB)

src/lib/
└── theme-store.ts               # 테마 전환 로직 (커스텀 CSS import)
```

### 테마 전환 구조

```
Light mode:
  main.tsx → import 'devextreme/.../dx.fluent.blue.light.compact.css'  (static)

Dark mode:
  theme-store.ts → import darkThemeUrl from '../styles/dx.fluent.nanum-dark.css?url'
                 → <link> 태그를 동적으로 head에 추가/제거
```

라이트 모드는 DevExtreme **stock CSS**를 그대로 사용하고, 다크 모드만 **커스텀 CSS**를 사용합니다. `theme-store.ts`는 Zustand persist store로 `[data-theme="dark"]` 속성과 CSS `<link>` 태그를 동기화합니다.

---

## 3. 색상 매핑 테이블

### 기준: Tailwind CSS Slate 팔레트

```
Slate-950: #020617    Slate-50:  #f8fafc
Slate-900: #0f172a    Slate-100: #f1f5f9
Slate-800: #1e293b    Slate-200: #e2e8f0
Slate-700: #334155    Slate-300: #cbd5e1
Slate-600: #475569    Slate-400: #94a3b8
Slate-500: #64748b
```

Tailwind Slate의 정확한 값과 일치하지 않는 중간 톤은 보간(interpolation)하여 매핑합니다. 핵심 원칙: **neutral gray의 밝기(luminance)를 유지하면서 blue tint를 추가**.

### 주요 매핑 (빈도순)

| 역할 | Stock (neutral) | Custom (slate) | 빈도 |
|------|----------------|---------------|------|
| Primary border | `#616161` | `#4b5e78` | 252 |
| Component bg | `#292929` | `#1e293b` (slate-800) | 105 |
| Base dark bg | `#1f1f1f` | `#0f172a` (slate-900) | 78 |
| Hover bg | `#3d3d3d` | `#334155` (slate-700) | 53 |
| Secondary text | `#adadad` | `#a8b6c8` | 52 |
| Border/separator | `#5c5c5c` | `#475569` (slate-600) | 51 |
| Very dark bg | `#141414` | `#0c1425` | 26 |
| Elevated surface | `#424242` | `#354353` | 15 |
| Muted text | `#757575` | `#64748b` (slate-500) | 13 |

### 전체 매핑 (56개)

스크립트의 `COLOR_MAP` 딕셔너리에 정의되어 있습니다. 6개 계층으로 분류:

| 계층 | Gray 범위 | Slate 범위 | 용도 |
|------|----------|-----------|------|
| Background (dark) | `#000000` ~ `#363636` | `#020617` ~ `#283649` | 기본/컴포넌트 배경 |
| Hover/elevated | `#3b3b3b` ~ `#4d4d4d` | `#2f3d51` ~ `#415064` | 호버, 활성 상태 |
| Border/separator | `#515151` ~ `#6e6e6e` | `#445167` ~ `#576c88` | 보더, 구분선 |
| Muted text/icons | `#737373` ~ `#9e9e9e` | `#64748b` ~ `#94a3b8` | 비활성 텍스트, 아이콘 |
| Secondary text | `#a1a1a1` ~ `#cccccc` | `#9baabd` ~ `#cbd5e1` | 보조 텍스트, 라벨 |
| Primary text | `#d4d4d4` ~ `#f5f5f5` | `#d3dbe5` ~ `#f5f7fa` | 본문, 헤딩 |

---

## 4. 스크립트 상세

### 실행 방법

```bash
python3 scripts/patch-dark-theme.py
```

**필수 요건**: Python 3.8+, `node_modules/devextreme` 설치 (`npm install` 후)

### 처리 단계

```
Step 1: 색상 교체 (hex, rgb, rgba 3가지 형식)
  ├── #RRGGBB 패턴 (case-insensitive, 56개 매핑)
  ├── rgb(R,G,B) 패턴 (자동 생성된 RGB 등가물)
  └── rgba(R,G,B,A) 패턴 (알파값 보존)

Step 2: 보더 두께 조정
  └── border*: 2px → 1px (border-radius 제외)

Step 3: 폰트 경로 수정
  └── icons/dxiconsfluent → devextreme/dist/css/icons/dxiconsfluent
      (src/styles/에서 Vite가 올바르게 resolve할 수 있도록)

Step 4: 헤더 주석 추가
  └── 파일 상단에 생성 정보 주석 삽입

Output: src/styles/dx.fluent.nanum-dark.css
```

### 실행 결과 예시

```
Reading stock dark theme: .../dx.fluent.blue.dark.compact.css
  Size: 781,204 bytes

Replacing colors...
  Total color replacements: 803

  Top replacements:
     252x  #616161 → #4b5e78
     105x  #292929 → #1e293b
     104x  rgba(0,0,0,*) → rgba(2,6,23,*)
      78x  #1f1f1f → #0f172a
      53x  #3d3d3d → #334155

Adjusting borders...
  Border adjustments: 58 occurrences of 2px → 1px

Fixing font paths...
  Fixed 3 font references

Verification — remaining neutral grays:
  All neutral grays successfully replaced!
```

### 스크립트 주의사항

1. **Hex 교체 순서**: 길이가 긴 패턴부터 처리하여 부분 매칭 방지
2. **RGB/RGBA 자동 생성**: hex 매핑에서 `hex_to_rgb_str()`로 자동 변환, 별도 관리 불필요
3. **RGBA 알파값 보존**: `rgba(41,41,41,0.5)` → `rgba(30,41,59,0.5)` (알파는 변경하지 않음)
4. **멱등성**: 재실행 시 stock CSS에서 다시 생성하므로 항상 동일 결과
5. **검증**: 스크립트 마지막에 모든 stock neutral gray가 교체되었는지 자동 확인

---

## 5. 폰트 경로 문제

### 문제

Stock CSS는 `node_modules/devextreme/dist/css/` 디렉토리에 위치하며, 폰트를 상대 경로로 참조합니다:

```css
@font-face { src: url(icons/dxiconsfluent.woff2) ... }
```

커스텀 CSS를 `src/styles/`로 이동하면, Vite가 `src/styles/icons/dxiconsfluent.woff2`를 찾으려 하지만 해당 경로에 파일이 없습니다.

### 해결

스크립트에서 상대 경로를 패키지 경로로 교체합니다:

```
icons/dxiconsfluent  →  devextreme/dist/css/icons/dxiconsfluent
```

Vite는 bare import (패키지명으로 시작하는 경로)를 `node_modules/`에서 자동 resolve합니다.

---

## 6. 새 색상 추가/변경 방법

### 기존 매핑 수정

`scripts/patch-dark-theme.py`의 `COLOR_MAP` 딕셔너리를 수정합니다:

```python
COLOR_MAP = {
    "#292929": "#1e293b",   # component bg → 이 값을 변경
    ...
}
```

수정 후 스크립트를 재실행하면 커스텀 CSS가 재생성됩니다.

### 새 neutral gray 발견 시

DevExtreme 업그레이드 후 새로운 neutral gray가 추가될 수 있습니다. 확인 방법:

```bash
# stock CSS에서 사용되는 모든 hex 색상 추출
python3 -c "
import re
css = open('node_modules/devextreme/dist/css/dx.fluent.blue.dark.compact.css').read()
colors = re.findall(r'#[0-9a-fA-F]{6}', css)
from collections import Counter
for c, n in Counter(c.lower() for c in colors).most_common(30):
    print(f'  {n:4d}x  {c}')
"
```

출력에서 `#XXYYZZ` 형태의 pure gray(R=G=B)가 보이면 `COLOR_MAP`에 매핑을 추가합니다.

### 보더 두께 규칙 변경

현재 `border*: 2px` → `1px`로 일괄 변경합니다. 특정 위젯만 적용하려면 `adjust_borders()` 함수의 regex를 수정합니다:

```python
# 예: Gantt만 적용하려면 2-pass 전략 사용
# 1. 전체 CSS에서 Gantt 섹션만 추출
# 2. 해당 섹션에만 border 변경 적용
```

---

## 7. DevExtreme 업그레이드 시 절차

DevExtreme 버전을 올린 후 (예: 25.x → 26.x):

```bash
# 1. 패키지 업데이트
npm update devextreme devextreme-react

# 2. 커스텀 다크 테마 재생성
python3 scripts/patch-dark-theme.py

# 3. 빌드 확인
npm run build

# 4. 브라우저에서 다크 모드 확인
npm run dev
```

스크립트는 항상 `node_modules/devextreme/dist/css/dx.fluent.blue.dark.compact.css`를 원본으로 사용하므로, 업그레이드 후 재실행하면 새 버전의 CSS에 동일한 색상 교체가 적용됩니다.

### 업그레이드 후 확인 사항

1. **새 neutral gray 확인**: 스크립트 실행 후 verification 경고 확인
2. **새 위젯 확인**: 업그레이드로 추가된 위젯이 있으면 다크 모드에서 갈색 영역이 없는지 확인
3. **폰트 경로 확인**: 콘솔에서 `Failed to decode downloaded font` 경고 확인

---

## 8. 앱의 2층 테마 구조

NanumProject는 **2층 테마 구조**를 사용합니다:

```
Layer 1: DevExtreme Theme CSS (위젯 스타일링)
  ├── Light: dx.fluent.blue.light.compact.css (stock)
  └── Dark:  dx.fluent.nanum-dark.css (custom, slate 교체)

Layer 2: App CSS Variables (레이아웃 스타일링)
  └── theme-variables.css
      ├── :root { --sidebar-bg: #ffffff; ... }
      └── [data-theme="dark"] { --sidebar-bg: #1e293b; ... }
```

**Layer 1** — DevExtreme 위젯(DataGrid, Gantt, Scheduler 등)의 내부 스타일. DevExtreme이 생성하는 DOM 요소에 적용됩니다.

**Layer 2** — 앱 레이아웃(Header, NavRail, Sidebar, Toolbar 등)의 스타일. CSS 변수로 정의되어 `[data-theme]` 속성에 따라 전환됩니다.

### 왜 2층이 필요한가

- DevExtreme 위젯은 자체 CSS 클래스를 사용하므로 CSS 변수로 제어할 수 없습니다
- 반대로 앱 레이아웃은 CSS 변수를 사용하여 세밀한 제어가 가능합니다
- 두 레이어 모두 동일한 Tailwind Slate 팔레트를 기반으로 하여 일관성을 유지합니다

### 색상 대응 관계

| 앱 CSS 변수 (Layer 2) | DevExtreme 교체 값 (Layer 1) | 용도 |
|----------------------|----------------------------|------|
| `--sidebar-bg: #1e293b` | `#292929 → #1e293b` | 컴포넌트 배경 |
| `--sidebar-border: #334155` | `#616161 → #4b5e78` | 보더/구분선 |
| `--bg-primary: #0f172a` | `#1f1f1f → #0f172a` | 기본 배경 |
| `--sidebar-hover-bg: #334155` | `#3d3d3d → #334155` | 호버 상태 |
| `--sidebar-text: #cbd5e1` | `#adadad → #a8b6c8` | 보조 텍스트 |

> **참고**: Layer 1과 Layer 2의 대응값이 완전히 동일하지는 않습니다 (예: border `#4b5e78` vs `#334155`). 이는 DevExtreme 내부의 명암 단계를 유지하면서 slate 톤을 적용한 결과입니다.

---

## 9. ProjectDetailPage.css와의 관계

`src/pages/ProjectDetailPage.css`에는 DevExtreme 위젯에 대한 **추가 CSS override** 규칙이 ~66개 있습니다. 이 규칙들은 커스텀 테마 생성 이전에 작성된 것으로, CSS 변수(`var(--sidebar-bg)` 등)를 사용하여 DevExtreme 위젯의 배경/보더/텍스트 색상을 지정합니다.

### 현재 상태

커스텀 테마가 이미 slate 색상을 제공하므로 이 override의 **대부분은 이론적으로 불필요**합니다. 하지만 다음 이유로 유지하고 있습니다:

1. **안전성**: 잘 동작하는 상태에서 대량 삭제의 리스크
2. **미세 조정**: CSS 변수를 통해 DevExtreme 기본값보다 더 정밀한 색상 제어 가능
3. **라이트 모드**: override가 라이트 모드에서도 적용되어 라이트 테마의 일관성 유지

### 향후 정리

커스텀 테마가 안정화되면 ProjectDetailPage.css의 override를 단계적으로 제거할 수 있습니다:

1. 위젯별로 override를 주석 처리
2. 다크/라이트 모드에서 시각적 차이 확인
3. 차이가 없으면 삭제

---

## 10. 트러블슈팅

### 다크 모드에서 갈색 영역이 보이는 경우

1. DevExtreme 위젯 내부 요소인지 확인 (Chrome DevTools → Inspect)
2. 해당 요소의 `background-color` 또는 `border-color`가 neutral gray(`#XXYYZZ`, R=G=B)인지 확인
3. 맞다면 `scripts/patch-dark-theme.py`의 `COLOR_MAP`에 해당 색상의 매핑 추가
4. 스크립트 재실행: `python3 scripts/patch-dark-theme.py`
5. 브라우저 hard refresh (Cmd+Shift+R)

### 폰트 아이콘이 깨지는 경우

콘솔에 `Failed to decode downloaded font` 경고가 나타나면:

1. 커스텀 CSS에서 폰트 경로 확인:
   ```bash
   grep "dxiconsfluent" src/styles/dx.fluent.nanum-dark.css
   ```
2. `devextreme/dist/css/icons/dxiconsfluent`로 시작해야 정상
3. `icons/dxiconsfluent`로 되어 있다면 스크립트의 폰트 경로 수정 단계 확인

### 스크립트 실행 시 "Stock CSS not found" 에러

```bash
npm install  # node_modules 복원
python3 scripts/patch-dark-theme.py
```

### 빌드 후 CSS 크기가 너무 큰 경우

커스텀 CSS는 ~782KB (gzip: ~101KB)입니다. 이는 stock CSS와 거의 동일한 크기이며, Vite가 별도 chunk로 분리하므로 초기 로드에는 포함되지 않습니다 (다크 모드 전환 시에만 로드).
