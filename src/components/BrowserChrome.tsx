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
import { tabManager, Tab, resolveUrl } from "~/lib/TabManager";
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
            {}
            <div class="tab--corner-l" />
            <div class="tab--corner-r" />

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

function UrlBar(props: {
    value: string;
    canBack: boolean;
    canForward: boolean;
    onNavigate: (url: string) => void;
    onBack: () => void;
    onForward: () => void;
    onRefresh: () => void;
}) {
    const [editing, setEditing] = createSignal(false);
    const [draft, setDraft] = createSignal("");
    const display = () => (editing() ? draft() : displayUrl(props.value));
    const commit = () => {
        const v = draft().trim();
        if (!v) return setEditing(false);
        props.onNavigate(resolveUrl(v));
        setEditing(false);
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
            <div
                class="urlbar--omnibox"
                classList={{ "urlbar--omnibox--focus": editing() }}
            >
                <span class="urlbar--lock">
                    <TbOutlineLock size={12} />
                </span>
                <input
                    class="urlbar--input"
                    type="text"
                    value={display()}
                    onFocus={e => {
                        setEditing(true);
                        setDraft(props.value);
                        (e.target as HTMLInputElement).select();
                    }}
                    onInput={e =>
                        setDraft((e.target as HTMLInputElement).value)
                    }
                    onBlur={() => setEditing(false)}
                    onKeyDown={e => {
                        if (e.key === "Enter") commit();
                        if (e.key === "Escape") setEditing(false);
                    }}
                    spellcheck={false}
                    autocomplete="off"
                />
                <button
                    class="urlbar--go-btn"
                    title="Go"
                    onClick={commit}
                    onMouseDown={e => e.preventDefault()}
                >
                    <TbOutlineArrowRight size={14} />
                </button>
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

    const navigateIframe = (id: string, url: string) => {
        const iframe = iframeMap.get(id);
        if (!iframe) return;
        pushHistory(id, url);
        tabManager.updateTab(id, { url, isLoading: true, title: "Loading…" });
        bar.emit("submit", iframe, url);
    };
    const navigate = (id: string, url: string) =>
        navigateIframe(id, resolveUrl(url));
    const activeUrl = () =>
        tabStore.tabs.find(t => t.id === activeId())?.url ?? "";

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
