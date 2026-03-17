import { createSignal, onMount, onCleanup } from "solid-js";
import "@catppuccin/palette/css/catppuccin.css";
import "@fontsource/rubik/400.css";
import "@fontsource/rubik/500.css";
import cx from "classix";
import "~/styles/LoadingAnimation.css";
import { DotLottie } from "@lottiefiles/dotlottie-web";

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
                  `Registering SW ${typeof window !== "undefined" ? localStorage.getItem("sw") : ""}`,
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
    let containerRef: HTMLDivElement | undefined;

    onMount(() => {
        if (!containerRef) return;

        const anim = new DotLottie({
            autoplay: true,
            loop: true,
            canvas: document.createElement("canvas"),
            src: "/assets/civil-loading.lottie",
        });

        containerRef.appendChild(anim.canvas as Node);

        let aborted = false;
        let timeout: ReturnType<typeof setTimeout>;

        const cycle = () => {
            setVisible(false);
            timeout = setTimeout(() => {
                if (aborted) return;
                setCurrentIndex(i => (i + 1) % statuses.length);
                setVisible(true);
                timeout = setTimeout(cycle, DISPLAY_DURATION + FADE_DURATION);
            }, FADE_DURATION);
        };

        timeout = setTimeout(cycle, DISPLAY_DURATION);

        onCleanup(() => {
            aborted = true;
            clearTimeout(timeout);
            anim.destroy();
        });
    });

    return (
        <div class={cx("loading-container", iframed && "iframed")}>
            <div class="loading-lottie" ref={containerRef} />
            <div class="loading-status-wrapper">
                <span
                    class={cx("loading-status", visible() ? "shown" : "hidden")}
                >
                    {statuses[currentIndex()]}
                </span>
            </div>
        </div>
    );
}
