import { createFileRoute, redirect } from "@tanstack/solid-router";
import proxyObjMap from "~/lib/proxyObjMap.ts";

function isUrlEncoded(string: string) {
    try {
        const decoded = decodeURIComponent(string);
        return decoded !== string;
    } catch {
        return false;
    }
}

export const Route = createFileRoute("/go/$")({
    beforeLoad: ({ params }: { params: any }) => {
        if (typeof window === "undefined") return;

        const { _splat } = params;
        const url = isUrlEncoded(_splat) ? decodeURIComponent(_splat) : _splat;

        const proxyName = localStorage.getItem("proxy") ?? "scramjet";
        const proxyEncodeFunction = proxyObjMap.find(
            ({ name }) => name === proxyName,
        );
        const encode =
            proxyEncodeFunction?.getValue()?.encodeUrl ??
            window.scramjet?.encodeUrl;

        if (!encode) return;

        throw redirect({
            href: encode(url),
        });
    },
});
