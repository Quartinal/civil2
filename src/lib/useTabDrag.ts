import { tabManager } from "~/lib/TabManager";
import type { Tab } from "~/lib/TabManager";
import {
    tab as tabClass,
    tabActive,
    tabDragging,
    tabDragClone,
    tabClose,
} from "~/styles/BrowserChrome.css";

interface TabDragOptions {
    getTabStripRef: () => HTMLDivElement | undefined;
    getBrowserRootRef: () => HTMLDivElement | undefined;
    getTabs: () => readonly Tab[];
    setDraggingId: (id: string | null) => void;
}

export function createTabDrag(opts: TabDragOptions) {
    const { getTabStripRef, getBrowserRootRef, getTabs, setDraggingId } = opts;

    const startDrag = (tabId: string, e: PointerEvent) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest(`.${tabClose}`)) return;

        const strip = getTabStripRef();
        const root = getBrowserRootRef();
        if (!strip || !root) return;

        const tabEl = e.currentTarget as HTMLElement;
        const tabRect = tabEl.getBoundingClientRect();
        const stripRect = strip.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const offsetX = e.clientX - tabRect.left;

        const tabEls = Array.from(
            strip.querySelectorAll<HTMLElement>(`.${tabClass}`),
        );
        const initialRects = tabEls.map(el => el.getBoundingClientRect());
        const dragIdx = getTabs().findIndex(t => t.id === tabId);

        const nonDragCenters: number[] = initialRects
            .filter((_, i) => i !== dragIdx)
            .map(r => r.left + r.width / 2);

        let clone: HTMLDivElement | null = null;
        let dragging = false;
        let currentTargetIdx = dragIdx;
        const THRESHOLD = 3;

        const applyShifts = (targetIdx: number) => {
            const w = tabRect.width;
            tabEls.forEach((el, i) => {
                if (i === dragIdx) return;
                let shift = 0;
                if (targetIdx > dragIdx && i > dragIdx && i <= targetIdx)
                    shift = -w;
                else if (targetIdx < dragIdx && i >= targetIdx && i < dragIdx)
                    shift = w;
                el.style.transition = "transform 0.15s ease";
                el.style.transform = shift ? `translateX(${shift}px)` : "";
            });
        };

        const onMove = (me: PointerEvent) => {
            const dx = me.clientX - startX;
            const dy = me.clientY - startY;
            if (!dragging && Math.sqrt(dx * dx + dy * dy) < THRESHOLD) return;

            if (!dragging) {
                dragging = true;
                setDraggingId(tabId);
                tabManager.activateTab(tabId);
                clone = tabEl.cloneNode(true) as HTMLDivElement;
                clone.style.cssText =
                    `position:fixed;top:${tabRect.top}px;left:${tabRect.left}px;` +
                    `width:${tabRect.width}px;height:${tabRect.height}px;margin:0;` +
                    `z-index:9999;pointer-events:none;transform-origin:center;`;
                clone.classList.remove(tabActive, tabDragging);
                clone.classList.add(tabDragClone);
                root.appendChild(clone);
            }

            if (!clone) return;

            const rawLeft = me.clientX - offsetX;
            const clampedLeft = Math.max(
                stripRect.left,
                Math.min(stripRect.right - tabRect.width, rawLeft),
            );
            clone.style.transform = `translateX(${clampedLeft - tabRect.left}px) scale(1.02)`;

            const centerX = clampedLeft + tabRect.width / 2;
            let targetIdx = 0;
            for (const mid of nonDragCenters) {
                if (centerX > mid) targetIdx++;
            }
            if (targetIdx >= dragIdx) targetIdx++;

            if (targetIdx !== currentTargetIdx) {
                currentTargetIdx = targetIdx;
                applyShifts(targetIdx);
            }
        };

        const onUp = () => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            document.removeEventListener("pointercancel", onUp);

            tabEls.forEach(el => {
                el.style.transform = "";
                el.style.transition = "";
            });

            if (clone) {
                clone.remove();
                clone = null;
            }
            if (dragging && currentTargetIdx !== dragIdx)
                tabManager.moveTab(tabId, currentTargetIdx);
            if (!dragging) tabManager.activateTab(tabId);

            setDraggingId(null);
            dragging = false;
        };

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        document.addEventListener("pointercancel", onUp);
    };

    return { startDrag };
}
