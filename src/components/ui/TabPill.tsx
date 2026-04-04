import { Show } from "solid-js";
import { TbOutlineWorld, TbOutlineX } from "solid-icons/tb";
import { CgSpinner } from "solid-icons/cg";
import type { Tab } from "~/lib/TabManager";
import * as s from "~/styles/BrowserChrome.css";

interface TabPillProps {
    tab: Tab;
    active: boolean;
    width: number;
    isDragging: boolean;
    onClose: (e: MouseEvent) => void;
    onPointerDown: (e: PointerEvent) => void;
}

export function TabPill(props: TabPillProps) {
    return (
        <div
            class={s.tab}
            classList={{
                [s.tabActive]: props.active,
                [s.tabDragging]: props.isDragging,
            }}
            style={{ width: `${props.width}px` }}
            onPointerDown={props.onPointerDown}
        >
            <Show when={props.tab.favicon}>
                <img class={s.tabFavicon} src={props.tab.favicon} alt="" />
            </Show>
            <Show when={!props.tab.favicon}>
                <span class={s.tabIcon}>
                    <Show
                        when={props.tab.isLoading}
                        fallback={<TbOutlineWorld size={13} />}
                    >
                        <CgSpinner size={13} class={s.spin} />
                    </Show>
                </span>
            </Show>
            <span class={s.tabTitle}>{props.tab.title}</span>
            <button
                class={s.tabClose}
                title="Close tab"
                onClick={e => {
                    e.stopPropagation();
                    props.onClose(e);
                }}
            >
                <TbOutlineX size={12} />
            </button>
        </div>
    );
}
