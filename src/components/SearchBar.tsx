import { onMount } from "solid-js";
import searchBar from "~/lib/SearchBar";
import genBCKey from "~/lib/genBCKey";

export default function SearchBar({ onclick }: { onclick: () => void }) {
    const bar = searchBar();

    const bcKey = genBCKey("typed_search");
    const channel = new BroadcastChannel(bcKey);

    let inputRef: HTMLInputElement | undefined;

    onMount(() => {
        if (!inputRef) return;
    });
}
