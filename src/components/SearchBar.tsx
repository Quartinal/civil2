import { createSignal, onMount, onCleanup, Show, For } from "solid-js";
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

    let ws: WebSocket | null = null;
    let inputRef: HTMLInputElement | undefined;
    let iframeRef: HTMLIFrameElement | undefined;

    const bcKey = genBCKey("typed_search");
    const channel = new BroadcastChannel(bcKey);

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

        onCleanup(() => {
            ws?.close();
            channel.close();
        });
    });

    const broadcast = (value: string) =>
        channel.postMessage({ type: "input", value });

    const handleInput = (value: string) => {
        setQuery(value);
        broadcast(value);
        if (value && !isProbablyUrl(value)) {
            if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ q: value }));
            }
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

        setTimeout(() => {
            if (!iframeRef) return;
            bar.emit("submit", iframeRef, value);
        }, 0);
    };

    return (
        <div class="sb-root">
            <div class="sb-input-wrapper">
                <input
                    ref={inputRef}
                    class="sb-input"
                    value={query()}
                    onInput={event => handleInput(event.currentTarget.value)}
                    onKeyDown={event => event.key === "Enter" && handleSubmit()}
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
                <ul class="sb-dropdown">
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

            <Show when={hasSubmitted()}>
                <iframe ref={iframeRef} class="sb-frame" />
            </Show>
        </div>
    );
}
