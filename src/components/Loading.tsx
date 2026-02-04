import { useEffect, useRef } from "preact/hooks";
import { DotLottie } from "@lottiefiles/dotlottie-web";
import "~/styles/loading.css";

export default function Loading() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const anim = new DotLottie({
      autoplay: true,
      loop: true,
      canvas: document.createElement("canvas"),
      src: "/assets/civil-loading.lottie",
    });

    containerRef.current.appendChild(anim.canvas as Node);

    return () => anim.destroy();
  }, []);

  return <div ref={containerRef} class="loading__container" />;
}
