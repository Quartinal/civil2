import { EventEmitter } from "tseep";

export interface Tab {
    id: string;
    url: string;
    title: string;
    favicon?: string;
    isLoading: boolean;
}

const BROWSER_URLS: Record<string, string> = {
    "browser:newtab": `${window.location.origin}/newtab`,
    "browser:settings": `${window.location.origin}/settings`,
    "browser:history": `${window.location.origin}/history`,
    "browser:bookmarks": `${window.location.origin}/bookmarks`,
    "browser:blank": "about:blank",
};

export function resolveUrl(url: string): string {
    if (BROWSER_URLS[url]) return BROWSER_URLS[url];

    const browserMatch = url.match(/^browser:(.+)$/);
    if (browserMatch) {
        const key = `browser:${browserMatch[1]}`;
        return (
            BROWSER_URLS[key] ?? `${window.location.origin}/${browserMatch[1]}`
        );
    }

    return url;
}

export class TabManager extends EventEmitter<{
    tabAdded: (tab: Tab) => void;
    tabRemoved: (id: string) => void;
    tabActivated: (id: string) => void;
    tabUpdated: (tab: Tab) => void;
    tabMoved: (id: string, toIndex: number) => void;
}> {
    private _tabs: Tab[] = [];
    private _activeId: string | null = null;

    get tabs() {
        return this._tabs;
    }

    get activeId() {
        return this._activeId;
    }

    get activeTab() {
        return this._tabs.find(t => t.id === this._activeId);
    }

    createTab(url: string = "browser:newtab") {
        const resolvedUrl = resolveUrl(url);

        const tab: Tab = {
            id: crypto.randomUUID().split("-")[0],
            url: resolvedUrl,
            title: url.startsWith("browser:")
                ? url
                      .replace("browser:", "")
                      .replace(/^\w/, char => char.toUpperCase())
                : "New Tab",
            isLoading: true,
        };

        this._tabs = [...this._tabs, tab];
        this.emit("tabAdded", tab);

        return tab;
    }

    removeTab(id: string) {
        const idx = this._tabs.findIndex(tab => tab.id === id);

        if (idx === -1) return;

        this._tabs = this._tabs.filter(tab => tab.id !== id);
        this.emit("tabRemoved", id);

        if (this._activeId === id) {
            const nextTab = this._tabs[Math.min(idx, this._tabs.length - 1)];
            if (nextTab) this.activateTab(nextTab.id);
            else this._activeId = null;
        }
    }

    activateTab(id: string) {
        this._activeId = id;
        this.emit("tabActivated", id);
    }

    updateTab(id: string, patch: Partial<Omit<Tab, "id">>) {
        this._tabs = this._tabs.map(tab =>
            tab.id === id ? { ...tab, ...patch } : tab,
        );

        const updated = this._tabs.find(tab => tab.id === id);
        if (updated) this.emit("tabUpdated", updated);
    }

    moveTab(id: string, toIndex: number) {
        const from = this._tabs.findIndex(tab => tab.id === id);

        if (from === -1) return;

        const arr = [...this._tabs];

        const [tab] = arr.splice(from, 1);
        arr.splice(toIndex, 0, tab);

        this._tabs = arr;
        this.emit("tabMoved", id, toIndex);
    }
}

export const tabManager = new TabManager();
