import { useState, useEffect } from "react";
import { fetchPresets } from "../utils/api";

export function usePresets() {
  const [presets, setPresets] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPresets()
      .then(setPresets)
      .catch(() => setError("Could not load presets."))
      .finally(() => setLoading(false));
  }, []);

  return { presets, loading, error };
}
