import { useState, useEffect, useCallback } from "react";
import { fetchHistory, deleteHistoryRecord } from "../utils/api";

export function useHistory() {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);

  const refresh = useCallback(() => {
    fetchHistory()
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const remove = useCallback(async (id) => {
    await deleteHistoryRecord(id);
    setHistory((h) => h.filter((r) => r.id !== id));
  }, []);

  return { history, loading, refresh, remove };
}
