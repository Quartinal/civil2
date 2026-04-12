import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";
import {
    extensionsGetAll,
    extensionsReadFile,
    extensionsResolveIcon,
    extensionsResolvePopup,
} from "~/api/extensions";
import * as s from "~/styles/ExtensionIconBar.css";
import type { ChromeManifest, CivilExtension } from "~/types";

interface ExtIconState {
    ext: Omit<CivilExtension, "files">;
    iconDataUrl: string | null;
    popupPath: string | null;
}

interface PopupState {
    extId: string;
    popupPath: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

const POPUP_W = 380;
const POPUP_H = 600;

function clampPopup(x: number, y: number): { x: number; y: number } {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
        x: Math.min(x, vw - POPUP_W - 8),
        y: Math.min(y, vh - POPUP_H - 8),
    };
}

function buildExtensionFileUrl(extId: string, filePath: string): string {
    return `/civil-ext/${extId}/${filePath}`;
}

export default function ExtensionIconBar() {
    const [icons, setIcons] = createSignal<ExtIconState[]>([]);
    const [popup, setPopup] = createSignal<PopupState | null>(null);

    onMount(async () => {
        const all = extensionsGetAll().filter(e => e.enabled);
        const resolved = await Promise.all(
            all.map(async ext => {
                const manifest = ext.manifest as ChromeManifest;
                const iconPath = extensionsResolveIcon(manifest, 48);
                const popupPath = extensionsResolvePopup(manifest);
                let iconDataUrl: string | null = null;

                if (iconPath) {
                    try {
                        const bytes = await extensionsReadFile(
                            ext.id,
                            iconPath,
                        );
                        const ext_ =
                            iconPath.split(".").pop()?.toLowerCase() ?? "png";
                        const mime =
                            ext_ === "svg"
                                ? "image/svg+xml"
                                : ext_ === "jpg"
                                  ? "image/jpeg"
                                  : "image/png";
                        const blobBytes = new Uint8Array(bytes);
                        const blob = new Blob([blobBytes], { type: mime });
                        iconDataUrl = URL.createObjectURL(blob);
                    } catch (e) {
                        console.warn(
                            "[ExtensionIconBar] icon load failed for",
                            ext.id,
                            e,
                        );
                    }
                }

                return { ext, iconDataUrl, popupPath };
            }),
        );
        setIcons(resolved);
    });

    onCleanup(() => {
        icons().forEach(i => {
            if (i.iconDataUrl) URL.revokeObjectURL(i.iconDataUrl);
        });
    });

    const handleClick = (e: MouseEvent, item: ExtIconState) => {
        if (!item.popupPath) return;

        const btn = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const rawX = btn.left;
        const rawY = btn.bottom + 6;
        const { x, y } = clampPopup(rawX, rawY);

        const current = popup();
        if (current?.extId === item.ext.id) {
            setPopup(null);
            return;
        }

        setPopup({
            extId: item.ext.id,
            popupPath: item.popupPath,
            x,
            y,
            width: POPUP_W,
            height: POPUP_H,
        });
    };

    const closePopup = () => setPopup(null);

    return (
        <>
            <div class={s.bar}>
                <For each={icons()}>
                    {item => (
                        <button
                            type="button"
                            class={s.extBtn}
                            title={item.ext.name}
                            onClick={e => handleClick(e, item)}
                        >
                            <Show
                                when={item.iconDataUrl}
                                fallback={
                                    <span class={s.extIconFallback}>
                                        {item.ext.name
                                            .slice(0, 2)
                                            .toUpperCase()}
                                    </span>
                                }
                            >
                                <img
                                    src={item.iconDataUrl!}
                                    class={s.extIcon}
                                    alt={item.ext.name}
                                />
                            </Show>
                        </button>
                    )}
                </For>
            </div>

            <Show when={popup()}>
                {p => (
                    <Portal>
                        {/** biome-ignore lint/a11y/noStaticElementInteractions: biome being dumb au */}
                        <div
                            style={{
                                position: "fixed",
                                inset: 0,
                                "z-index": "99998",
                                background: "transparent",
                            }}
                            onMouseDown={closePopup}
                        />
                        <div
                            class={s.popup}
                            style={{
                                left: `${p().x}px`,
                                top: `${p().y}px`,
                                width: `${p().width}px`,
                                height: `${p().height}px`,
                            }}
                        >
                            <iframe
                                class={s.popupFrame}
                                src={buildExtensionFileUrl(
                                    p().extId,
                                    p().popupPath,
                                )}
                                title="Extension popup"
                            />
                        </div>
                    </Portal>
                )}
            </Show>
        </>
    );
}
