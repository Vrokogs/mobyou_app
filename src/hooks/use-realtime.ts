'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeFilter = {
  column: string;
  value: string;
};

type UseRealtimeOptions<T> = {
  table: string;
  schema?: string;
  filter?: RealtimeFilter;
  initialData?: T[];
  enabled?: boolean;
};

export function useRealtime<T extends { id: string }>({
  table,
  schema = 'public',
  filter,
  initialData = [],
  enabled = true,
}: UseRealtimeOptions<T>) {
  const [data, setData] = useState<T[]>(initialData);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      if (payload.eventType === 'INSERT') {
        setData((prev) => [...prev, payload.new as T]);
      } else if (payload.eventType === 'UPDATE') {
        setData((prev) =>
          prev.map((item) =>
            item.id === (payload.new as T).id ? (payload.new as T) : item
          )
        );
      } else if (payload.eventType === 'DELETE') {
        setData((prev) =>
          prev.filter((item) => item.id !== (payload.old as T).id)
        );
      }
    },
    []
  );

  useEffect(() => {
    if (!enabled) return;

    const channelName = filter
      ? `${table}:${filter.column}=eq.${filter.value}`
      : table;

    const filterString = filter
      ? `${filter.column}=eq.${filter.value}`
      : undefined;

    const channel = supabase
      .channel(channelName)
      .on<T>(
        'postgres_changes',
        {
          event: '*',
          schema,
          table,
          ...(filterString ? { filter: filterString } : {}),
        },
        handleChange
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, table, schema, filter?.column, filter?.value, enabled, handleChange]);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  return { data, setData };
}
