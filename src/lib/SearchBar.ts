import { EventEmitter } from "tseep";
import { registerSw, setupBareMux } from "./swUtils";
import callFunctionOnContext from "./callFunctionOnContext";
import type { UVConfig } from "@titaniumnetwork-dev/ultraviolet";
import type { ScramjetController } from "@mercuryworkshop/scramjet";
import type * as _BareMux from "@mercuryworkshop/bare-mux";

interface ProxyEntry {
    // this is only for interception proxies
    name: "uv" | "scramjet";
    value: UVConfig | ScramjetController;
}

interface ISearchBar {
    lastUrlSearched: string | URL;
    url: string;
    debugInfo: Partial<{
        currentRammerheadSession: string;
        currentTransport: `/${string}/index.mjs`;
        currentTechnology: "bare" | "wisp";
        currentTechnologyPath: `/${string}/`;
        currentProxy: "uv" | "scramjet" | "rammerhead";
    }>;
    proxyObjMap: ProxyEntry[];
}

declare global {
    var BareMux: typeof _BareMux;
}

class SearchBar
    extends EventEmitter<{
        submit: (frame: HTMLIFrameElement, term: string) => void;
    }>
    implements ISearchBar
{
    lastUrlSearched!: string | URL;
    url!: string;
    debugInfo!: ISearchBar["debugInfo"];
    proxyObjMap: ISearchBar["proxyObjMap"];

    // not including proxyObjMap
    private static keys = ["lastUrlSearched", "url", "debugInfo"] as const;

    constructor() {
        super();

        // priority baremux setup and sw registration
        registerSw();

        (async () => {
            await setupBareMux();
        })();

        const isJson = (string: string) => {
            try {
                JSON.parse(string);
                return true;
            } catch {
                return false;
            }
        };

        for (const key of SearchBar.keys) {
            const storageKey = key
                .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
                .toLowerCase();
            const value = localStorage.getItem(storageKey)!;

            this[key] = isJson(value) ? JSON.parse(value) : value;
        }

        this.proxyObjMap = [
            {
                name: "uv",
                value: self.__uv$config,
            },
            {
                name: "scramjet",
                value: window.scramjet,
            },
        ];

        this.registerHandlers();
    }

    registerHandlers() {
        const storedProxy = localStorage.getItem("proxy") as "uv" | "scramjet";
        const proxy = this.proxyObjMap.find(p => p.name === storedProxy)!;

        this.on("submit", (frame, term) => {
            callFunctionOnContext(
                frame.contentWindow!,
                proxy.value.encodeUrl,
                term,
            );
        });

        // TODO: add more event handlers
    }
}

export default function searchBar() {
    return new SearchBar();
}
