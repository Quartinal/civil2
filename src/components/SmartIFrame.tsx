import "~/styles/SmartIFrame.css";
import { createSignal, createEffect } from "solid-js";
import proxyObjMap from "~/lib/proxyObjMap";
import { track } from "@plausible-analytics/tracker";

export default function SmartIFrame(props: { src: string }) {
    const [src, setSrc] = createSignal(props.src);

    createEffect(() => {
        const proxyName = localStorage.getItem("proxy");

        const proxy = proxyObjMap.find(({ name }) => name === proxyName);

        const encode =
            proxy?.getValue()?.encodeUrl ?? window.scramjet.encodeUrl;
        const decode =
            proxy?.getValue()?.decodeUrl ?? window.scramjet.decodeUrl;

        const encoded = encode(props.src);

        setSrc(encoded);

        track("Internal site visit", {
            props: { url: decode(props.src) },
        });
    });

    return <iframe src={src()} class="smart-iframe" />;
}
