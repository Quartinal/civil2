import {
    createSignal,
    createMemo,
    For,
    Show,
    onMount,
    onCleanup,
    batch,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import {
    tabManager,
    type Tab,
    resolveUrl,
    isNewtabUrl,
} from "~/lib/TabManager";
import searchBar from "~/lib/SearchBar";

import { BiRegularLeftArrowAlt, BiRegularRightArrowAlt } from "solid-icons/bi";
import {
    TbOutlineRefresh,
    TbOutlineLock,
    TbOutlineWorld,
    TbOutlineArrowRight,
    TbOutlinePlus,
    TbOutlineX,
} from "solid-icons/tb";
import { CgSpinner } from "solid-icons/cg";

import "@catppuccin/palette/css/catppuccin.css";
import "~/styles/BrowserChrome.css";

function displayUrl(raw: string): string {
    try {
        const u = new URL(raw);
        return u.hostname + u.pathname + u.search;
    } catch {
        return raw;
    }
}

function TabPill(props: {
    tab: Tab;
    active: boolean;
    width: number;
    isDragging: boolean;
    onClose: (e: MouseEvent) => void;
    onPointerDown: (e: PointerEvent) => void;
}) {
    return (
        <div
            class="tab"
            classList={{
                "tab--active": props.active,
                "tab--dragging": props.isDragging,
            }}
            style={{ width: `${props.width}px` }}
            onPointerDown={props.onPointerDown}
        >
            <Show when={props.tab.favicon}>
                <img class="tab--favicon" src={props.tab.favicon} alt="" />
            </Show>
            <Show when={!props.tab.favicon}>
                <span class="tab--icon">
                    <Show
                        when={props.tab.isLoading}
                        fallback={<TbOutlineWorld size={13} />}
                    >
                        <CgSpinner size={13} class="spin" />
                    </Show>
                </span>
            </Show>
            <span class="tab--title">{props.tab.title}</span>
            <button
                class="tab--close"
                title="Close tab"
                onClick={e => {
                    e.stopPropagation();
                    props.onClose(e);
                }}
            >
                <TbOutlineX size={12} />
            </button>
        </div>
    );
}

const WS_URL = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/suggestions`;

const isProbablyUrl = (v: string): boolean => {
    try {
        new URL(v);
        return true;
    } catch {}
    return /^[\w-]+\.[a-z]{2,}/i.test(v);
};

function UrlBar(props: {
    value: string;
    canBack: boolean;
    canForward: boolean;
    isNewtab: boolean;
    onNavigate: (url: string) => void;
    onBack: () => void;
    onForward: () => void;
    onRefresh: () => void;
}) {
    const [editing, setEditing] = createSignal(false);
    const [draft, setDraft] = createSignal("");
    const [suggestions, setSuggestions] = createSignal<string[]>([]);
    let ws: WebSocket | null = null;
    let inputRef: HTMLInputElement | undefined;
    let suppressBlur = false;

    const openWs = () => {
        if (ws && ws.readyState === WebSocket.OPEN) return;
        ws = new WebSocket(WS_URL);
        ws.onmessage = ev => {
            try {
                const { suggestions: s } = JSON.parse(ev.data);
                if (Array.isArray(s)) setSuggestions(s);
            } catch {}
        };
    };

    const closeWs = () => {
        ws?.close();
        ws = null;
    };

    const display = () =>
        editing() ? draft() : props.isNewtab ? "" : displayUrl(props.value);

    const commit = (value = draft()) => {
        const v = value.trim();
        if (!v) {
            setEditing(false);
            setSuggestions([]);
            return;
        }
        setSuggestions([]);
        setEditing(false);
        closeWs();
        const resolved = resolveUrl(v);
        props.onNavigate(resolved !== v ? resolved : v);
    };

    const handleInput = (v: string) => {
        setDraft(v);
        if (!v) {
            setSuggestions([]);
            return;
        }
        if (!isProbablyUrl(v)) {
            openWs();
            if (ws?.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ q: v }));
        } else {
            setSuggestions([]);
        }
    };

    return (
        <div class="urlbar">
            <button
                class="urlbar--nav-btn"
                classList={{ "urlbar--nav-btn--dim": !props.canBack }}
                title="Back"
                disabled={!props.canBack}
                onClick={props.onBack}
            >
                <BiRegularLeftArrowAlt size={17} />
            </button>
            <button
                class="urlbar--nav-btn"
                classList={{ "urlbar--nav-btn--dim": !props.canForward }}
                title="Forward"
                disabled={!props.canForward}
                onClick={props.onForward}
            >
                <BiRegularRightArrowAlt size={17} />
            </button>
            <button
                class="urlbar--nav-btn"
                title="Reload"
                onClick={props.onRefresh}
            >
                <TbOutlineRefresh size={17} />
            </button>

            <div class="urlbar--omnibox-wrap">
                <div
                    class="urlbar--omnibox"
                    classList={{
                        "urlbar--omnibox--focus":
                            editing() || suggestions().length > 0,
                    }}
                >
                    <Show when={!props.isNewtab && !editing()}>
                        <span class="urlbar--lock">
                            <TbOutlineLock size={12} />
                        </span>
                    </Show>
                    <input
                        ref={inputRef}
                        class="urlbar--input"
                        type="text"
                        value={display()}
                        placeholder={
                            props.isNewtab || editing()
                                ? "Search or enter address"
                                : ""
                        }
                        onFocus={e => {
                            setEditing(true);
                            openWs();
                            setDraft(props.isNewtab ? "" : props.value);
                            e.target.select();
                        }}
                        onInput={e => handleInput(e.target.value)}
                        onBlur={() => {
                            if (suppressBlur) return;
                            setEditing(false);
                            setSuggestions([]);
                            closeWs();
                        }}
                        onKeyDown={e => {
                            if (e.key === "Enter") commit();
                            if (e.key === "Escape") {
                                setSuggestions([]);
                                setEditing(false);
                                inputRef?.blur();
                            }
                        }}
                        spellcheck={false}
                        autocomplete="off"
                    />
                    <button
                        class="urlbar--go-btn"
                        title="Go"
                        onClick={() => commit()}
                        onMouseDown={e => e.preventDefault()}
                    >
                        <TbOutlineArrowRight size={14} />
                    </button>
                </div>

                <Show when={suggestions().length > 0}>
                    <ul class="urlbar--suggestions">
                        <For each={suggestions()}>
                            {s => (
                                <li
                                    class="urlbar--suggestion-row"
                                    onMouseDown={() => {
                                        suppressBlur = true;
                                    }}
                                    onClick={() => {
                                        suppressBlur = false;
                                        commit(s);
                                        inputRef?.blur();
                                    }}
                                >
                                    {s}
                                </li>
                            )}
                        </For>
                    </ul>
                </Show>
            </div>
        </div>
    );
}

export default function BrowserChrome() {
    const bar = searchBar();

    const [tabStore, setTabStore] = createStore<{ tabs: Tab[] }>({ tabs: [] });
    const [activeId, setActiveId] = createSignal<string | null>(null);
    const [tabBarWidth, setTabBarWidth] = createSignal(600);
    const [draggingId, setDraggingId] = createSignal<string | null>(null);

    const iframeMap = new Map<string, HTMLIFrameElement>();
    const historyMap = new Map<string, { stack: string[]; cursor: number }>();

    const getHistory = (id: string) => {
        if (!historyMap.has(id)) historyMap.set(id, { stack: [], cursor: -1 });
        return historyMap.get(id)!;
    };
    const pushHistory = (id: string, url: string) => {
        const h = getHistory(id);
        h.stack = h.stack.slice(0, h.cursor + 1);
        h.stack.push(url);
        h.cursor = h.stack.length - 1;
    };

    const canBack = () => {
        const id = activeId();
        return id ? getHistory(id).cursor > 0 : false;
    };
    const canForward = () => {
        const id = activeId();
        if (!id) return false;
        const h = getHistory(id);
        return h.cursor < h.stack.length - 1;
    };

    const TAB_MIN = 60,
        TAB_MAX = 220,
        NEW_BTN_W = 40;
    const tabWidth = createMemo(() => {
        const n = tabStore.tabs.length;
        if (!n) return TAB_MAX;
        return Math.min(
            TAB_MAX,
            Math.max(TAB_MIN, (tabBarWidth() - NEW_BTN_W - 8) / n),
        );
    });

    let tabStripRef: HTMLDivElement | undefined;
    let browserRootRef: HTMLDivElement | undefined;
    const ro = new ResizeObserver(entries => {
        for (const e of entries) setTabBarWidth(e.contentRect.width);
    });

    tabManager.on("tabAdded", tab => setTabStore("tabs", t => [...t, tab]));
    tabManager.on("tabRemoved", id =>
        batch(() => {
            setTabStore("tabs", t => t.filter(tab => tab.id !== id));
            setActiveId(tabManager.activeId);
            iframeMap.delete(id);
            historyMap.delete(id);
        }),
    );
    tabManager.on("tabActivated", id => setActiveId(id));
    tabManager.on("tabUpdated", upd =>
        setTabStore(
            "tabs",
            t => t.id === upd.id,
            produce(t => {
                t.title = upd.title;
                t.url = upd.url;
                t.isLoading = upd.isLoading;
                t.favicon = upd.favicon;
            }),
        ),
    );
    tabManager.on("tabMoved", () => setTabStore("tabs", [...tabManager.tabs]));

    const normalizeNav = (term: string): string => {
        try {
            new URL(term);
            return term;
        } catch {}
        if (/^[\w-]+\.[a-z]{2,}/i.test(term)) return `https://${term}`;
        return term;
    };

    const navigateIframe = (id: string, url: string) => {
        const iframe = iframeMap.get(id);
        if (!iframe) return;
        pushHistory(id, url);
        tabManager.updateTab(id, { url, isLoading: true, title: "Loading…" });
        bar.emit("submit", iframe, normalizeNav(url));
    };
    const navigate = (id: string, url: string) =>
        navigateIframe(id, resolveUrl(url));
    const activeUrl = () =>
        tabStore.tabs.find(t => t.id === activeId())?.url ?? "";
    const activeTabIsNewtab = createMemo(() => isNewtabUrl(activeUrl()));

    const registerIframe = (id: string, el: HTMLIFrameElement) => {
        iframeMap.set(id, el);
        el.addEventListener("load", () => {
            if (!el.src || el.src === "about:blank") return;
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
        if (tab?.url) el.src = tab.url;
    };

    const startDrag = (tabId: string, e: PointerEvent) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest(".tab--close")) return;

        const strip = tabStripRef;
        const root = browserRootRef;
        if (!strip || !root) return;

        const tabEl = e.currentTarget as HTMLElement;
        const tabRect = tabEl.getBoundingClientRect();
        const stripRect = strip.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const offsetX = e.clientX - tabRect.left;

        let clone: HTMLDivElement | null = null;
        let dragging = false;
        const THRESHOLD = 4;

        const onMove = (me: PointerEvent) => {
            const dx = me.clientX - startX;
            const dy = me.clientY - startY;
            if (!dragging && Math.sqrt(dx * dx + dy * dy) < THRESHOLD) return;

            if (!dragging) {
                dragging = true;
                setDraggingId(tabId);
                clone = tabEl.cloneNode(true) as HTMLDivElement;
                clone.style.cssText = `position:fixed;top:${tabRect.top}px;left:${tabRect.left}px;width:${tabRect.width}px;height:${tabRect.height}px;margin:0;z-index:9999;pointer-events:none;`;
                clone.classList.remove("tab--active", "tab--dragging");
                clone.classList.add("tab--drag-clone");
                root.appendChild(clone);
            }

            if (!clone) return;
            const rawLeft = me.clientX - offsetX;
            const clampedLeft = Math.max(
                stripRect.left,
                Math.min(stripRect.right - tabRect.width, rawLeft),
            );
            clone.style.transform = `translateX(${clampedLeft - tabRect.left}px)`;

            const centrX = clampedLeft + tabRect.width / 2;
            const slots = Array.from(
                strip.querySelectorAll<HTMLElement>(".tab:not(.tab--dragging)"),
            );
            const curIdx = tabStore.tabs.findIndex(t => t.id === tabId);
            let tgtIdx = curIdx;
            for (let i = 0; i < slots.length; i++) {
                const r = slots[i].getBoundingClientRect();
                if (centrX >= r.left && centrX < r.right) {
                    tgtIdx = i;
                    break;
                }
                if (i === slots.length - 1 && centrX >= r.right)
                    tgtIdx = slots.length - 1;
            }
            if (tgtIdx !== curIdx) tabManager.moveTab(tabId, tgtIdx);
        };

        const onUp = () => {
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            document.removeEventListener("pointercancel", onUp);
            if (clone) {
                clone.remove();
                clone = null;
            }
            if (!dragging) {
                tabManager.activateTab(tabId);
            }
            setDraggingId(null);
            dragging = false;
        };

        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        document.addEventListener("pointercancel", onUp);
    };

    onMount(() => {
        if (tabStripRef) ro.observe(tabStripRef);
        const t = tabManager.createTab("browser:newtab");
        tabManager.activateTab(t.id);

        const onBrowserNavigate = (e: Event) => {
            const { tabId, url } = (
                e as CustomEvent<{ tabId: string; url: string }>
            ).detail;
            navigateIframe(tabId, url);
        };
        document.addEventListener("browser:navigate", onBrowserNavigate);
        onCleanup(() =>
            document.removeEventListener("browser:navigate", onBrowserNavigate),
        );
    });
    onCleanup(() => ro.disconnect());

    return (
        <div class="browser" ref={browserRootRef}>
            <div class="browser--chrome">
                <div class="browser--tabstrip" ref={tabStripRef}>
                    <For each={tabStore.tabs}>
                        {tab => (
                            <TabPill
                                tab={tab}
                                active={tab.id === activeId()}
                                width={tabWidth()}
                                isDragging={tab.id === draggingId()}
                                onClose={() => tabManager.removeTab(tab.id)}
                                onPointerDown={e => startDrag(tab.id, e)}
                            />
                        )}
                    </For>
                    <button
                        class="tab-new"
                        title="New tab"
                        onClick={() => {
                            const t = tabManager.createTab("browser:newtab");
                            tabManager.activateTab(t.id);
                        }}
                    >
                        <TbOutlinePlus size={15} />
                    </button>
                </div>

                <UrlBar
                    value={activeUrl()}
                    canBack={canBack()}
                    canForward={canForward()}
                    isNewtab={activeTabIsNewtab()}
                    onNavigate={url => {
                        const id = activeId();
                        if (id) navigate(id, url);
                    }}
                    onBack={() => {
                        const id = activeId();
                        if (!id) return;
                        const h = getHistory(id);
                        if (h.cursor > 0) {
                            h.cursor--;
                            navigateIframe(id, h.stack[h.cursor]);
                        }
                    }}
                    onForward={() => {
                        const id = activeId();
                        if (!id) return;
                        const h = getHistory(id);
                        if (h.cursor < h.stack.length - 1) {
                            h.cursor++;
                            navigateIframe(id, h.stack[h.cursor]);
                        }
                    }}
                    onRefresh={() => {
                        const id = activeId();
                        if (!id) return;
                        const tab = tabStore.tabs.find(t => t.id === id);
                        if (!tab) return;
                        const iframe = iframeMap.get(id);
                        if (!iframe) return;
                        tabManager.updateTab(id, { isLoading: true });
                        bar.emit("submit", iframe, tab.url);
                    }}
                />
            </div>

            <div class="browser--viewport">
                <For each={tabStore.tabs}>
                    {tab => (
                        <iframe
                            title="Proxied browser-in-browser webpage"
                            class="browser--frame"
                            classList={{
                                "browser--frame--active": tab.id === activeId(),
                            }}
                            ref={el => registerIframe(tab.id, el)}
                        />
                    )}
                </For>
                <Show when={tabStore.tabs.length === 0}>
                    <div class="browser--empty">
                        <TbOutlineWorld size={40} class="browser--empty-icon" />
                        <p>No tabs open</p>
                        <button
                            onClick={() => {
                                const t =
                                    tabManager.createTab("browser:newtab");
                                tabManager.activateTab(t.id);
                            }}
                        >
                            Open a tab
                        </button>
                    </div>
                </Show>
            </div>
        </div>
    );
}
