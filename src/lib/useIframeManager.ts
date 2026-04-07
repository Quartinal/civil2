import { displayUrl, normalizeNav } from "~/lib/browserHelpers";
import { trackVisit } from "~/lib/db";
import type searchBar from "~/lib/SearchBar";
import { isInternalUrl, resolveUrl, tabManager } from "~/lib/TabManager";

type BarInstance = ReturnType<typeof searchBar>;

export function createIframeManager(
    bar: BarInstance,
    push: (id: string, url: string) => void,
) {
    const iframeMap = new Map<string, HTMLIFrameElement>();

    const navigateIframe = (id: string, url: string) => {
        const iframe = iframeMap.get(id);
        if (!iframe) return;

        push(id, url);
        tabManager.updateTab(id, { url, isLoading: true, title: "Loading…" });

        if (!isInternalUrl(url)) {
            void trackVisit(normalizeNav(url)).then(
                ({ userBanned, banReason }) => {
                    if (!userBanned) return;
                    tabManager.updateTab(id, {
                        isLoading: false,
                        title: "Banned",
                    });

                    if (!banReason) return;
                    iframe.src = `${window.location.origin}/ban?reason=${encodeURIComponent(banReason)}`;
                },
            );
        }

        if (isInternalUrl(url)) {
            iframe.src = url;
        } else {
            bar.emit("submit", iframe, normalizeNav(url));
        }
    };

    const navigate = (id: string, url: string) =>
        navigateIframe(id, resolveUrl(url));

    const registerIframe = (id: string, el: HTMLIFrameElement) => {
        iframeMap.set(id, el);

        el.addEventListener("load", () => {
            let href: string | undefined;
            try {
                href = el.contentWindow?.location.href;
            } catch {}
            if (!href || href === "about:blank") return;

            try {
                const docTitle = el.contentDocument?.title;
                const favicon =
                    el.contentDocument?.querySelector<HTMLLinkElement>(
                        'link[rel*="icon"]',
                    )?.href;
                tabManager.updateTab(id, {
                    isLoading: false,
                    title:
                        docTitle ||
                        displayUrl(
                            tabManager.tabs.find(t => t.id === id)?.url ?? "",
                        ) ||
                        "Untitled",
                    favicon,
                });
            } catch {
                tabManager.updateTab(id, { isLoading: false });
            }
        });

        const tab = tabManager.tabs.find(t => t.id === id);
        if (tab?.url) {
            push(id, tab.url);
            if (isInternalUrl(tab.url)) {
                el.src = tab.url;
            } else {
                bar.ready.then(() =>
                    bar.emit("submit", el, normalizeNav(tab.url)),
                );
            }
        }
    };

    return { iframeMap, navigateIframe, navigate, registerIframe };
}
