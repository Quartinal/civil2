import { createFileRoute } from "@tanstack/solid-router";
import {
  Suspense,
  createSignal,
  createEffect,
  onCleanup,
  Show,
} from "solid-js";
import LoadingAnimation from "~/components/LoadingAnimation";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

const MIN_DURATION = 2000;
const MAX_DURATION = 5000;
const EXIT_DURATION = 600;

function TimedLoadingAnimation() {
  const [overlayVisible, setOverlayVisible] = createSignal(true);
  const [mounted, setMounted] = createSignal(true);

  const exit = () => {
    setOverlayVisible(false);
    setTimeout(() => setMounted(false), EXIT_DURATION);
  };

  createEffect(() => {
    const minTimeout = setTimeout(() => exit(), MIN_DURATION);
    const maxTimeout = setTimeout(() => exit(), MAX_DURATION);
    onCleanup(() => {
      clearTimeout(minTimeout);
      clearTimeout(maxTimeout);
    });
  });

  return (
    <Show when={mounted()}>
      <div
        style={{
          opacity: overlayVisible() ? "1" : "0",
          transition: `opacity ${EXIT_DURATION}ms cubic-bezier(0.86, 0, 0.07, 1)`,
        }}
      >
        <LoadingAnimation />
      </div>
    </Show>
  );
}

function RouteComponent() {
  return (
    <Suspense fallback={<TimedLoadingAnimation />}>
      <main></main>
    </Suspense>
  );
}
