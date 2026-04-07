import { TbOutlinePlus, TbOutlineWorld } from "solid-icons/tb";
import {
    batch,
    createMemo,
    createSignal,
    For,
    onCleanup,
    onMount,
    Show,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import { TabPill } from "~/components/ui/TabPill";
import { UrlBar } from "~/components/ui/UrlBar";
import {
    createTabHistory,
    loadSession,
    saveSession,
} from "~/lib/browserHelpers";
import searchBar from "~/lib/SearchBar";
import {
    isInternalUrl,
    isNewtabUrl,
    type Tab,
    tabManager,
} from "~/lib/TabManager";
import { createIframeManager } from "~/lib/useIframeManager";
import { createTabDrag } from "~/lib/useTabDrag";

import * as s from "~/styles/BrowserChrome.css";

export default function BrowserChrome() {
    const bar = searchBar();

    const [tabStore, setTabStore] = createStore<{ tabs: Tab[] }>({ tabs: [] });
    const [activeId, setActiveId] = createSignal<string | null>(null);
    const [tabBarWidth, setTabBarWidth] = createSignal(600);
    const [draggingId, setDraggingId] = createSignal<string | null>(null);
    const [iframeIds, setIframeIds] = createSignal<string[]>([]);

    const { getHistory, pushHistory, canBack, canForward } = createTabHistory();
    const { iframeMap, navigateIframe, navigate, registerIframe } =
        createIframeManager(bar, pushHistory);

    let tabStripRef: HTMLDivElement | undefined;
    let browserRootRef: HTMLDivElement | undefined;

    const { startDrag } = createTabDrag({
        getTabStripRef: () => tabStripRef,
        getBrowserRootRef: () => browserRootRef,
        getTabs: () => tabStore.tabs,
        setDraggingId,
    });

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
    const activeUrl = createMemo(
        () => tabStore.tabs.find(t => t.id === activeId())?.url ?? "",
    );
    const activeTabIsNewtab = createMemo(() => isNewtabUrl(activeUrl()));

    const persist = () => saveSession(tabStore.tabs, activeId());

    tabManager.on("tabAdded", tab => {
        setTabStore("tabs", t => [...t, tab]);
        setIframeIds(ids => [...ids, tab.id]);
        persist();
    });
    tabManager.on("tabRemoved", id =>
        batch(() => {
            setTabStore("tabs", t => t.filter(tab => tab.id !== id));
            setIframeIds(ids => ids.filter(i => i !== id));
            setActiveId(tabManager.activeId);
            persist();
        }),
    );
    tabManager.on("tabActivated", id => {
        setActiveId(id);
        persist();
    });
    tabManager.on("tabUpdated", upd => {
        setTabStore(
            "tabs",
            t => t.id === upd.id,
            produce(t => {
                t.title = upd.title;
                t.url = upd.url;
                t.isLoading = upd.isLoading;
                t.favicon = upd.favicon;
            }),
        );
        persist();
    });
    tabManager.on("tabMoved", (id, toIndex) => {
        setTabStore(
            "tabs",
            produce(tabs => {
                const from = tabs.findIndex(t => t.id === id);
                if (from === -1 || from === toIndex) return;
                const [tab] = tabs.splice(from, 1);
                tabs.splice(toIndex, 0, tab);
            }),
        );
        persist();
    });

    const ro = new ResizeObserver(entries => {
        for (const e of entries) setTabBarWidth(e.contentRect.width);
    });
    onCleanup(() => ro.disconnect());

    onMount(() => {
        if (tabStripRef) ro.observe(tabStripRef);

        const session = loadSession();
        if (session) {
            for (const saved of session.tabs) {
                const t = tabManager.createTab(saved.url);
                tabManager.updateTab(t.id, {
                    title: saved.title || t.title,
                    favicon: saved.favicon,
                    isLoading: false,
                });
            }
            const idx = Math.min(
                Math.max(0, session.activeIndex ?? 0),
                tabManager.tabs.length - 1,
            );
            tabManager.activateTab(tabManager.tabs[idx].id);
        } else {
            const t = tabManager.createTab("browser:newtab");
            tabManager.activateTab(t.id);
        }

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

    return (
        <div class={s.browser} ref={browserRootRef}>
            <div class={s.browserChrome}>
                <div class={s.browserTabstrip} ref={tabStripRef}>
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
                        type="button"
                        class={s.tabNew}
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
                    canBack={canBack(activeId())}
                    canForward={canForward(activeId())}
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
                        if (isInternalUrl(tab.url)) {
                            iframe.src = tab.url;
                        } else {
                            bar.emit("submit", iframe, tab.url);
                        }
                    }}
                />
            </div>

            <div class={s.browserViewport}>
                <For each={iframeIds()}>
                    {id => (
                        <iframe
                            title="Proxied browser-in-browser webpage"
                            class={s.browserFrame}
                            classList={{
                                [s.browserFrameActive]: id === activeId(),
                            }}
                            ref={el => registerIframe(id, el)}
                        />
                    )}
                </For>
                <Show when={tabStore.tabs.length === 0}>
                    <div class={s.browserEmpty}>
                        <TbOutlineWorld size={40} class={s.browserEmptyIcon} />
                        <p>No tabs open</p>
                        <button
                            type="button"
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
