import { createSignal, Show, For, createEffect } from "solid-js";
import searchBar from "~/lib/SearchBar";
import SearchBarInput from "~/components/SearchBarInput";
import "~/styles/SearchBar.css";

export default function SearchBarContainer() {
    const bar = searchBar();

    const [suggestions, setSuggestions] = createSignal<string[]>([]);
    const [hasSuggestions, setHasSuggestions] = createSignal(false);

    createEffect(() => {
        setHasSuggestions(suggestions().length > 0);
    });

    const getIframe = () => {
        const frame = window.frameElement;
        if (frame instanceof HTMLIFrameElement) return frame;
        return null;
    };

    const handleSubmit = (value: string) => {
        bar.lastUrlSearched = value;
        bar.url = value;

        localStorage.setItem("last-url-searched", value);
        localStorage.setItem("url", value);

        setSuggestions([]);

        const iframe = getIframe();
        if (iframe) {
            bar.emit("submit", iframe, value);
        }
    };

    return (
        <div class="sb-host">
            <div
                class="sb-root"
                classList={{ "sb-root--has-suggestions": hasSuggestions() }}
            >
                <SearchBarInput
                    onSubmit={handleSubmit}
                    onSuggestions={setSuggestions}
                    showBlur={false}
                />

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
            </div>
        </div>
    );
}
