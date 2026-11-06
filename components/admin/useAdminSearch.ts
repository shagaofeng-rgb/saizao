"use client";

import { useEffect, useState } from "react";

export function useAdminSearch(setPage: (page: number) => void) {
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const value = draft.trim();
    if (value === query) return;
    const timer = window.setTimeout(() => { setQuery(value); setPage(1); }, 240);
    return () => window.clearTimeout(timer);
  }, [draft, query, setPage]);
  return { draft, setDraft, query };
}
