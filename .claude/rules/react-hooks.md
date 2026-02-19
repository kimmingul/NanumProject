---
description: React 커스텀 훅 작성 규칙
globs:
  - "src/hooks/*.ts"
---

# React Hook Rules

## 파일 구조
- `src/hooks/` 디렉토리에 위치
- 파일명: `use{Feature}.ts` (camelCase)
- 하나의 훅 파일에 관련 기능 그룹핑

## Supabase 데이터 Fetching 패턴

```typescript
export function useFeature() {
  const profile = useAuthStore((s) => s.profile);
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;  // ✅ tenant guard
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('table')
        .select('*')
        .eq('tenant_id', profile.tenant_id);
      if (error) throw error;
      setData(data || []);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, refetch: fetchData };
}
```

## RPC 호출 패턴

```typescript
// void return
async function rpc(fn: string, params: Record<string, unknown>): Promise<void> {
  const { error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)(fn, params);
  if (error) throw error;
}

// with return value
async function rpcWithReturn<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await (supabase.rpc as unknown as (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, params);
  if (error) throw error;
  return data as T;
}
```

> RPC cast가 필요한 이유: Supabase generated types에서 `Functions: Record<string, never>`로 정의되어 있음

## 주의사항
- `useCallback` deps에 `profile?.tenant_id` 포함
- Supabase 클라이언트는 `src/lib/supabase.ts`에서 import
- Auth 상태는 `useAuthStore`에서 가져옴 (Zustand)
- 에러 처리: `throw error` → 호출측에서 try/catch
