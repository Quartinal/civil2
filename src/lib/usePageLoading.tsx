import type { UUID } from "node:crypto";
import { useState, useEffect, useRef } from "preact/hooks";

const MIN_LOAD_TIME = 5000;

export default function usePageLoading() {
  const [isLoading, setIsLoading] = useState(true);
  const [pageLoadId, setPageLoadId] = useState<UUID | null>(null);

  const loadStartRef = useRef<number>(Date.now());

  useEffect(() => {
    loadStartRef.current = Date.now();

    const pageId = crypto.randomUUID();
    setPageLoadId(pageId);
    localStorage.setItem("pageLoadId", pageId);

    const handleLoad = () => {
      const elapsed = Date.now() - loadStartRef.current;
      const remaining = Math.max(0, MIN_LOAD_TIME - elapsed);

      setTimeout(() => {
        setIsLoading(false);
      }, remaining);
    };

    window.addEventListener("load", handleLoad);

    return () => {
      window.removeEventListener("load", handleLoad);
    };
  }, []);

  return { isLoading, pageLoadId };
}
