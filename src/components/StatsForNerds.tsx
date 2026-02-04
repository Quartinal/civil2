import { useEffect, useRef, useState } from "preact/hooks";
import cx from "classix";

export default function StatsForNerds() {
  const [open, setOpen] = useState(false);
  const [fps, setFps] = useState(0);
  const [ping, setPing] = useState<number | null>(null);
  const [memory, setMemory] = useState<number | null>(null);

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let rafId: number;

    const loop = (time: number) => {
      frameCount.current++;

      if (time - lastTime.current >= 1000) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastTime.current = time;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const measurePing = async () => {
      try {
        const start = performance.now();
        await fetch(window.location.origin, {
          method: "HEAD",
          cache: "no-store",
        });
        const end = performance.now();

        if (!cancelled) {
          setPing(Math.round(end - start));
        }
      } catch {
        if (!cancelled) setPing(null);
      }
    };

    measurePing();
    const id = setInterval(measurePing, 5000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const updateMemory = () => {
      const mem = (performance as any).memory;
      if (mem) {
        setMemory(Math.round(mem.usedJSHeapSize / 1024 / 1024));
      }
    };

    updateMemory();
    const id = setInterval(updateMemory, 2000);
    return () => clearInterval(id);
  }, []);

  const isHidden = !open || !!localStorage.getItem("pageLoadId");

  return (
    <div class="stats">
      <button onClick={() => setOpen(!open)} class="stats__toggle">
        Stats
      </button>

      <div class={cx("stats__panel", isHidden && "stats__panel--hidden")}>
        <div class="stats__content">
          <div class="stats__row">
            <span class="stats__label">FPS</span>
            <span class="stats__value stats__value--fps">{fps}</span>
          </div>

          <div class="stats__row">
            <span class="stats__label">Ping</span>
            <span class="stats__value stats__value--ping">
              {ping !== null ? `${ping} ms` : "—"}
            </span>
          </div>

          <div class="stats__row">
            <span class="stats__label">Memory</span>
            <span class="stats__value stats__value--memory">
              {memory !== null ? `${memory} MB` : "Unsupported"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
