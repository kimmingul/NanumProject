---
description: DevExtreme 컴포넌트 사용 규칙
globs:
  - "src/**/*.tsx"
  - "src/**/*.css"
---

# DevExtreme Component Rules

## Button
- 반드시 `import { Button } from 'devextreme-react/button'` 사용
- 네이티브 `<button>` 사용 금지
- CSS 클래스: `className` prop (NOT `cssClass`)
- 패턴:
  - Primary: `<Button text="Action" icon="plus" type="default" stylingMode="contained" />`
  - Secondary: `<Button text="Cancel" stylingMode="outlined" />`
  - Icon-only: `<Button icon="trash" stylingMode="text" hint="Delete" />`

## DataGrid
- 반드시 `keyExpr` 지정
- `dataSource`에 배열 직접 전달 또는 `ArrayStore` 사용
- 컬럼 정의 시 `dataField`, `caption`, `dataType` 명시
- 필터링: `filterRow={{ visible: true }}`
- 페이징: `paging={{ pageSize: 10 }}`

## SelectBox
- `items` + `value` + `onValueChanged` 패턴
- `displayExpr`, `valueExpr` 명시
- boolean 값: `items={[{text:'Active',value:true},{text:'Inactive',value:false}]}`

## Popup
- `visible` + `onHiding` 패턴
- `title`, `width`, `height` 명시
- 닫기: `hideOnOutsideClick={true}`, `showCloseButton={true}`

## CSS Override Pattern
```css
.container .dx-datagrid { /* override */ }
.container .dx-datagrid-headers { background: #f8fafc; }
.dx-button.custom-class { /* button style */ }
```

## DevExtreme MCP 활용
- 컴포넌트 사용법이 불확실할 때 `devexpress_docs_search` 도구로 공식 문서 검색
- 코드 예제가 필요하면 검색 후 `devexpress_docs_get_content`로 상세 내용 확인
