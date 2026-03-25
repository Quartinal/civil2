import { createSignal, Show, For } from "solid-js";
import searchBar from "~/lib/SearchBar";
import SearchBarInput from "~/components/SearchBarInput";
import { tabManager, resolveUrl } from "~/lib/TabManager";
import "~/styles/SearchBar.css";

export default function SearchBar() {
    const bar = searchBar();
    const [suggestions, setSuggestions] = createSignal<string[]>([]);

    const handleSubmit = (value: string) => {
        bar.lastUrlSearched = value;
        bar.url = value;
        localStorage.setItem("last-url-searched", value);
        localStorage.setItem("url", value);
        setSuggestions([]);

        const resolvedUrl = resolveUrl(value);
        const activeId = tabManager.activeId;

        if (activeId) {
            tabManager.updateTab(activeId, {
                url: resolvedUrl,
                isLoading: true,
                title: "Loading...",
            });
            const event = new CustomEvent("browser:navigate", {
                detail: { tabId: activeId, url: resolvedUrl },
                bubbles: true,
            });
            document.dispatchEvent(event);
        } else {
            const tab = tabManager.createTab(resolvedUrl);
            tabManager.activateTab(tab.id);
        }
    };

    return (
        <div class="sb-host">
            <div class="sb-root">
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
