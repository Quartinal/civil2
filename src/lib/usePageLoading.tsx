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

    const finishLoading = () => {
      const elapsed = Date.now() - loadStartRef.current;
      const remaining = Math.max(0, MIN_LOAD_TIME - elapsed);

      setTimeout(() => {
        setIsLoading(false);
        localStorage.removeItem("pageLoadId");
      }, remaining);
    };

    if (document.readyState === "complete") {
      finishLoading();
    } else {
      window.addEventListener("load", finishLoading);
    }

    return () => {
      window.removeEventListener("load", finishLoading);
    };
  }, []);

  return { isLoading, pageLoadId };
}
