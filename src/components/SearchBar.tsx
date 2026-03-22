import {
    createSignal,
    onMount,
    onCleanup,
    Show,
    For,
    createEffect,
} from "solid-js";
import searchBar from "~/lib/SearchBar";
import genBCKey from "~/lib/genBCKey";
import "~/styles/SearchBar.css";

const WS_URL = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/suggestions`;

const isProbablyUrl = (value: string) => {
    try {
        new URL(value);
        return true;
    } catch {}
    return /^[\w-]+\.[a-z]{2,}/i.test(value);
};

export default function SearchBar() {
    const bar = searchBar();

    const [query, setQuery] = createSignal("");
    const [suggestions, setSuggestions] = createSignal<string[]>([]);
    const [hasSubmitted, setHasSubmitted] = createSignal(false);
    const [iframeUrl, setIframeUrl] = createSignal("");
    const [iframeVisible, setIframeVisible] = createSignal(false);

    let ws: WebSocket | null = null;
    let inputRef: HTMLInputElement | undefined;
    let iframeRef: HTMLIFrameElement | undefined;
    let hostRef: HTMLDivElement | undefined;
    let rootRef: HTMLDivElement | undefined;

    const bcKey = genBCKey("typed_search");
    const channel = new BroadcastChannel(bcKey);

    const showIframe = () => hasSubmitted() && iframeUrl() !== "";

    createEffect(() => {
        if (!hostRef || !rootRef) return;

        if (showIframe()) {
            hostRef.style.alignItems = "flex-start";
        } else {
            hostRef.style.alignItems = "center";
        }
    });

    onMount(() => {
        ws = new WebSocket(WS_URL);
        ws.onmessage = event => {
            try {
                const { suggestions } = JSON.parse(event.data);
                if (suggestions && Array.isArray(suggestions))
                    setSuggestions(suggestions);
            } catch {}
        };

        channel.onmessage = event => {
            if (event.data?.type === "input" && inputRef) {
                inputRef.value = event.data.value;
                setQuery(event.data.value);
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (hostRef && !hostRef.contains(e.target as Node))
                setSuggestions([]);
        };
        document.addEventListener("mousedown", handleClickOutside);

        onCleanup(() => {
            ws?.close();
            channel.close();
            document.removeEventListener("mousedown", handleClickOutside);
        });
    });

    const broadcast = (value: string) =>
        channel.postMessage({ type: "input", value });

    const handleInput = (value: string) => {
        setQuery(value);
        broadcast(value);

        if (!value) {
            setHasSubmitted(false);
            setIframeUrl("");
            setIframeVisible(false);
            setSuggestions([]);
            return;
        }

        if (!isProbablyUrl(value)) {
            if (ws?.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ q: value }));
        } else {
            setSuggestions([]);
        }
    };

    const handleSubmit = (value = query()) => {
        if (!value) return;

        bar.lastUrlSearched = value;
        bar.url = value;

        localStorage.setItem("last-url-searched", value);
        localStorage.setItem("url", value);

        setSuggestions([]);
        broadcast(value);
        setHasSubmitted(true);
        setIframeUrl(value);

        setTimeout(() => setIframeVisible(true), 60);

        setTimeout(() => {
            if (!iframeRef) return;
            bar.emit("submit", iframeRef, value);
        }, 0);
    };

    return (
        <div ref={hostRef} class="sb-host">
            <div
                ref={rootRef}
                class="sb-root"
                classList={{ "sb-root--expanded": showIframe() }}
            >
                <div
                    class="sb-input-wrapper"
                    classList={{ "sb-input-wrapper--blur": showIframe() }}
                >
                    <input
                        ref={inputRef}
                        class="sb-input"
                        value={query()}
                        onInput={e => handleInput(e.currentTarget.value)}
                        onKeyDown={e => e.key === "Enter" && handleSubmit()}
                        placeholder="Search or enter a URL"
                        autofocus
                        spellcheck={false}
                        autocomplete="off"
                        data-enable-grammarly="false"
                    />
                    <button class="sb-button" onClick={() => handleSubmit()}>
                        Unblock
                    </button>
                </div>

                <Show when={suggestions().length > 0}>
                    <ul
                        class="sb-dropdown"
                        classList={{ "sb-dropdown--blur": showIframe() }}
                    >
                        <For each={suggestions()}>
                            {item => (
                                <li
                                    class="sb-row"
                                    onClick={() => handleSubmit(item)}
                                >
                                    {item}
                                </li>
                            )}
                        </For>
                    </ul>
                </Show>

                <Show when={showIframe()}>
                    <iframe
                        ref={iframeRef}
                        class="sb-frame"
                        classList={{ "sb-frame--visible": iframeVisible() }}
                    />
                </Show>
            </div>
        </div>
    );
}
