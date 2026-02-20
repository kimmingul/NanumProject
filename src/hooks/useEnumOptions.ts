import { useMemo } from 'react';
import { useEnumConfigStore } from '@/lib/enum-config-store';
import type { EnumCategory, EnumOption } from '@/types';

interface UseEnumOptionsResult {
  options: EnumOption[];
  items: { value: string; label: string }[];
  labels: Record<string, string>;
  colors: Record<string, string>;
  icons: Record<string, string>;
  values: string[];
  getLabel: (v: string) => string;
  getColor: (v: string) => string;
}

export function useEnumOptions(category: EnumCategory): UseEnumOptionsResult {
  const getOptions = useEnumConfigStore((s) => s.getOptions);
  const options = getOptions(category);

  return useMemo(() => {
    const labels: Record<string, string> = {};
    const colors: Record<string, string> = {};
    const icons: Record<string, string> = {};
    const values: string[] = [];
    const items: { value: string; label: string }[] = [];

    for (const opt of options) {
      labels[opt.value] = opt.label;
      if (opt.color) colors[opt.value] = opt.color;
      if (opt.icon) icons[opt.value] = opt.icon;
      values.push(opt.value);
      items.push({ value: opt.value, label: opt.label });
    }

    const getLabel = (v: string): string => labels[v] || v;
    const getColor = (v: string): string => colors[v] || '#94a3b8';

    return { options, items, labels, colors, icons, values, getLabel, getColor };
  }, [options]);
}
