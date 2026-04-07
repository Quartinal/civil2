import { clientOnly } from "@solidjs/start";
import { createRootRoute, Outlet } from "@tanstack/solid-router";
import { Suspense } from "solid-js";

const Devtools = import.meta.env.DEV
    ? clientOnly(() => import("../components/Devtools"))
    : () => null;

export const Route = createRootRoute({
    component: RootComponent,
});

function RootComponent() {
    return (
        <Suspense>
            <Outlet />
            <Devtools />
        </Suspense>
    );
}
