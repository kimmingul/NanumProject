import { useCallback, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';

export interface SearchResultItem {
  id: string;
  type: 'project' | 'item' | 'user';
  name: string;
  secondary: string;
  icon: string;
  projectId?: string;
  itemType?: string;
}

interface SearchResults {
  projects: SearchResultItem[];
  items: SearchResultItem[];
  users: SearchResultItem[];
}

const EMPTY_RESULTS: SearchResults = { projects: [], items: [], users: [] };

export interface UseGlobalSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResults;
  loading: boolean;
  flatResults: SearchResultItem[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  reset: () => void;
}

export function useGlobalSearch(): UseGlobalSearchReturn {
  const profile = useAuthStore((s) => s.profile);
  const [query, setQueryRaw] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const executeSearch = useCallback(async (q: string) => {
    const tenantId = profile?.tenant_id;
    if (!tenantId || q.length < 2) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }

    setLoading(true);
    const currentRequestId = ++requestIdRef.current;
    const pattern = `%${q}%`;

    try {
      const [projectsRes, itemsRes, usersRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, description')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .or(`name.ilike.${pattern},description.ilike.${pattern}`)
          .limit(5),
        supabase
          .from('project_items')
          .select('id, name, project_id, item_type')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .ilike('name', pattern)
          .limit(5),
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
          .limit(5),
      ]);

      // Discard stale response
      if (currentRequestId !== requestIdRef.current) return;

      const projects: SearchResultItem[] = (projectsRes.data || []).map((p) => ({
        id: p.id,
        type: 'project' as const,
        name: p.name,
        secondary: p.description || '',
        icon: 'folder',
      }));

      // Build a map of project IDs → names
      const projectNameMap = new Map<string, string>();
      for (const p of projectsRes.data || []) {
        projectNameMap.set(p.id, p.name);
      }
      // Fetch missing project names for items whose projects weren't in the search results
      const itemData = itemsRes.data || [];
      const missingIds = itemData
        .map((i) => i.project_id)
        .filter((pid) => !projectNameMap.has(pid));
      if (missingIds.length > 0) {
        const uniqueIds = [...new Set(missingIds)];
        const { data: extraProjects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', uniqueIds);
        for (const p of extraProjects || []) {
          projectNameMap.set(p.id, p.name);
        }
      }

      // Re-check stale after extra query
      if (currentRequestId !== requestIdRef.current) return;

      const items: SearchResultItem[] = itemData.map((i) => ({
        id: i.id,
        type: 'item' as const,
        name: i.name,
        secondary: projectNameMap.get(i.project_id) || '',
        icon: i.item_type === 'milestone' ? 'event' : i.item_type === 'group' ? 'folder' : 'todo',
        projectId: i.project_id,
        itemType: i.item_type,
      }));

      const users: SearchResultItem[] = (usersRes.data || []).map((u) => ({
        id: u.id,
        type: 'user' as const,
        name: u.full_name || u.email,
        secondary: u.email,
        icon: 'user',
      }));

      setResults({ projects, items, users });
      setActiveIndex(0);
    } catch {
      // Silently ignore search errors
      if (currentRequestId === requestIdRef.current) {
        setResults(EMPTY_RESULTS);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [profile?.tenant_id]);

  const setQuery = useCallback((q: string) => {
    setQueryRaw(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 2) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      executeSearch(q);
    }, 300);
  }, [executeSearch]);

  const flatResults: SearchResultItem[] = [
    ...results.projects,
    ...results.items,
    ...results.users,
  ];

  const reset = useCallback(() => {
    setQueryRaw('');
    setResults(EMPTY_RESULTS);
    setActiveIndex(0);
    setLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestIdRef.current++;
  }, []);

  return { query, setQuery, results, loading, flatResults, activeIndex, setActiveIndex, reset };
}
