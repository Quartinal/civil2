import { createSignal, createEffect, onCleanup } from "solid-js";
import { clientOnly } from "@solidjs/start";
import "@catppuccin/palette/css/catppuccin.css";
import "@fontsource/rubik/400.css";
import "@fontsource/rubik/500.css";
import cx from "classix";
import "~/styles/LoadingAnimation.css";

const DotLottieSolid = clientOnly(() =>
  import("@lottiefiles/dotlottie-solid").then(m => ({
    default: m.DotLottieSolid,
  })),
);

interface LoadingAnimationProps {
  iframed?: boolean;
}

const FADE_DURATION = 400;
const DISPLAY_DURATION = 600;

export default function LoadingAnimation({ iframed }: LoadingAnimationProps) {
  const statuses = (
    iframed
      ? [
          "Requesting Rammerhead session",
          "Encoding URL with _rhs prefix",
          "Getting Rammerhead session from localStorage",
          "Redirecting to requested proxied webpage",
          "Encoding URL to codec",
          "Getting transport from localStorage",
          "Getting proxy from localStorage",
          "Setting up SW and BareMux",
          "Connecting to WISP server",
          `Registering SW ${localStorage.getItem("sw")}`,
          "Fetching ScramJet configuration",
          "Fetching UV configuration",
        ]
      : [
          "Loading page",
          "Getting assets from cache",
          "Registering page as a PWA",
        ]
  ).map(status => `${status}...`);

  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [visible, setVisible] = createSignal(true);

  createEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const cycle = () => {
      setVisible(false);
      timeout = setTimeout(() => {
        setCurrentIndex(i => (i + 1) % statuses.length);
        setVisible(true);
        timeout = setTimeout(cycle, DISPLAY_DURATION + FADE_DURATION);
      }, FADE_DURATION);
    };

    timeout = setTimeout(cycle, DISPLAY_DURATION);
    onCleanup(() => clearTimeout(timeout));
  });

  return (
    <>
      <div class={cx("loading-container", iframed && "iframed")}>
        <div class="loading-lottie">
          <DotLottieSolid
            src="/assets/civil-loading.lottie"
            autoplay
            loop
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        <div class="loading-status-wrapper">
          <span class={cx("loading-status", visible() ? "shown" : "hidden")}>
            {statuses[currentIndex()]}
          </span>
        </div>
      </div>
    </>
  );
}
