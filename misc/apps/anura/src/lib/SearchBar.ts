import { EventEmitter } from "tseep";

const topWin = top as any;

interface ProxyEntry {
    name: "uv" | "scramjet";
    encode: (url: string) => string;
    decode: (url: string) => string;
}

function isNavigableUrl(term: string): boolean {
    try {
        const u = new URL(term);
        return /^https?:|^ftp:/.test(u.protocol);
    } catch {}
    return /^[\w-]+\.[a-z]{2,}/i.test(term);
}

function getProxies(): ProxyEntry[] {
    const entries: ProxyEntry[] = [];

    try {
        const uvConfig = topWin.__uv$config;
        if (uvConfig) {
            entries.push({
                name: "uv",
                encode: (url: string) =>
                    uvConfig.prefix + uvConfig.encodeUrl(url),
                decode: (url: string) => uvConfig.decodeUrl(url),
            });
        }
    } catch {}

    return entries;
}

const searchEngines = [
    { name: "google", value: "https://www.google.com/search?q=%s" },
    { name: "ddg", value: "https://duckduckgo.com/?q=%s" },
    { name: "bing", value: "https://www.bing.com/search?q=%s" },
    { name: "brave", value: "https://search.brave.com/search?q=%s" },
] as const;

class SearchBar extends EventEmitter<{
    submit: (frame: HTMLIFrameElement, term: string) => void;
}> {
    private proxies: ProxyEntry[] = [];

    constructor() {
        super();
        this.proxies = getProxies();
        this.registerHandlers();
    }

    private registerHandlers() {
        this.on("submit", (frame, term) => {
            const storedProxy = localStorage.getItem("proxy") || "uv";
            let proxy = this.proxies.find(p => p.name === storedProxy);

            if (!proxy) {
                this.proxies = getProxies();
                proxy =
                    this.proxies.find(p => p.name === storedProxy) ??
                    this.proxies[0];
            }

            if (!proxy) {
                console.error("[SearchBar] No proxy available from top frame");
                return;
            }

            let normalizedTerm: string;

            if (isNavigableUrl(term)) {
                try {
                    new URL(term);
                    normalizedTerm = term;
                } catch {
                    normalizedTerm = `https://${term}`;
                }
            } else {
                const engineName = localStorage.getItem("search") || "google";
                const engine = searchEngines.find(e => e.name === engineName);
                normalizedTerm =
                    engine?.value.replace("%s", encodeURIComponent(term)) ??
                    `https://www.google.com/search?q=${encodeURIComponent(term)}`;
            }

            const encoded = proxy.encode(normalizedTerm);

            try {
                frame.contentWindow?.location.replace(encoded);
            } catch {
                frame.src = encoded;
            }
        });
    }
}

export default function searchBar() {
    return new SearchBar();
}
