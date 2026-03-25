import "@fontsource/rubik/500";
import "@fontsource/rubik/400";
import "@catppuccin/palette/css/catppuccin.css";
import "~/styles/NewTabPage.css";
import SearchBarContainer from "./SearchBarContainer";
import { Show } from "solid-js";

export default function NewTabPage() {
    const isInIframe = () => window.self !== window.top;

    return (
        <div class="newtab-root">
            <div class="welcome-text">
                <h1>Welcome to Civil Proxy!</h1>
                <p>
                    It's <b>your</b> web proxy.
                </p>
            </div>

            <Show when={isInIframe()}>
                <div class="searchbar">
                    <SearchBarContainer />
                </div>
            </Show>
        </div>
    );
}
