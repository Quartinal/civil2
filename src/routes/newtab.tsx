import { createFileRoute } from "@tanstack/solid-router";
import { clientOnly } from "@solidjs/start";

const NewTabPage = clientOnly(() => import("~/components/NewTabPage.tsx"));

export const Route = createFileRoute("/newtab")({
    component: RouteComponent,
});

function RouteComponent() {
    return <NewTabPage />;
}
