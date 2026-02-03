import { randomUUID } from "node:crypto";
import type { UUID } from "node:crypto";
import { useState, useEffect } from "preact/hooks";

export default function isPageLoading() {
    const [isLoading, setIsLoading] = useState(false);
    const [pageLoadId, setPageLoadId] = useState<UUID | null>(null);

    useEffect(() => {
        const handleBeforeUnload = () => {
            const newPageLoadId = randomUUID();
            setPageLoadId(newPageLoadId);
            setIsLoading(true);
        };

        const handleLoad = () => {
            setIsLoading(false);
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        window.addEventListener("load", handleLoad);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            window.removeEventListener("load", handleLoad);
        };
    }, []);

    return { isLoading, pageLoadId };
}