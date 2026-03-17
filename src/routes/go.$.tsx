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
        const { _splat } = params;
        const url = isUrlEncoded(_splat) ? decodeURIComponent(_splat) : _splat;

        let proxyName = "scramjet";
        let encode: ((url: string) => string) | undefined;

        if (typeof window !== "undefined") {
            proxyName = localStorage.getItem("proxy") ?? "scramjet";
            const proxyEncodeFunction = proxyObjMap.find(
                ({ name }) => name === proxyName,
            );
            encode =
                proxyEncodeFunction?.getValue()?.encodeUrl ??
                window.scramjet.encodeUrl;

            throw redirect({
                href: encode(url),
            });
        }

        return;
    },
});
