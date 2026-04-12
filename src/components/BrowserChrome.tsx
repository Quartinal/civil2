import { TbOutlinePlus, TbOutlinePuzzle, TbOutlineWorld } from "solid-icons/tb";
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
import BookmarksBar from "~/components/BookmarksBar";
import { useContextMenu } from "~/components/ContextMenu";
import ExtensionIconBar from "~/components/ExtensionIconBar";
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
    const ctx = useContextMenu();

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
    const activeTab = createMemo(
        () => tabStore.tabs.find(t => t.id === activeId()) ?? null,
    );
    const activeUrl = createMemo(() => activeTab()?.url ?? "");
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

    const openExtensions = () => {
        const id = activeId();
        if (id) navigate(id, "browser:extensions");
    };

    return (
        // biome-ignore lint/a11y/noStaticElementInteractions: biome breaking my project lmao
        <div
            class={s.browser}
            ref={browserRootRef}
            onContextMenu={e => {
                const target = e.target as HTMLElement;
                const isInput =
                    target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable;
                ctx.open(e, [
                    {
                        label: "New Tab",
                        icon: <TbOutlinePlus size={14} />,
                        action: () => {
                            const t = tabManager.createTab("browser:newtab");
                            tabManager.activateTab(t.id);
                        },
                    },
                    { type: "separator" },
                    {
                        label: "Extensions",
                        icon: <TbOutlinePuzzle size={14} />,
                        action: openExtensions,
                    },
                    {
                        label: "History",
                        action: () => {
                            const id = activeId();
                            if (id) navigate(id, "browser:history");
                        },
                    },
                    {
                        label: "Bookmarks",
                        action: () => {
                            const id = activeId();
                            if (id) navigate(id, "browser:bookmarks");
                        },
                    },
                    {
                        label: "Apps",
                        action: () => {
                            const id = activeId();
                            if (id) navigate(id, "browser:apps");
                        },
                    },
                    { type: "separator" },
                    ...(isInput
                        ? [
                              {
                                  label: "Cut",
                                  shortcut: "⌘X",
                                  action: () => document.execCommand("cut"),
                              },
                              {
                                  label: "Copy",
                                  shortcut: "⌘C",
                                  action: () => document.execCommand("copy"),
                              },
                              {
                                  label: "Paste",
                                  shortcut: "⌘V",
                                  action: () => document.execCommand("paste"),
                              },
                              { type: "separator" as const },
                          ]
                        : []),
                    {
                        label: "View Source",
                        action: () => {
                            const url = activeUrl();
                            if (url)
                                window.open(`view-source:${url}`, "_blank");
                        },
                    },
                    { type: "separator" },
                    {
                        label: "Close Tab",
                        danger: true,
                        action: () => {
                            const id = activeId();
                            if (id) tabManager.removeTab(id);
                        },
                    },
                ]);
            }}
        >
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

                <div class={s.urlbarRow}>
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
                    <ExtensionIconBar />
                    <button
                        type="button"
                        class={s.extensionsBtn}
                        title="Extensions"
                        onClick={openExtensions}
                    >
                        <TbOutlinePuzzle size={15} />
                    </button>
                </div>

                <BookmarksBar
                    activeUrl={activeUrl()}
                    activeTitle={activeTab()?.title ?? ""}
                    activeFavicon={activeTab()?.favicon}
                    onNavigate={url => {
                        const id = activeId();
                        if (id) navigate(id, url);
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
