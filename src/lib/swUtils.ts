import type * as _BareMux from "@mercuryworkshop/bare-mux";

async function registerSw() {
    if ("serviceWorker" in navigator) {
        await navigator.serviceWorker
            .register("/sw.js", {
                scope: "/",
            })
            .then(
                registration =>
                    (registration.onupdatefound = () => registration.update()),
            )
            .catch(error => {
                console.error("service Worker registration failed:", error);
            });

        return;
    }

    console.log(
        "service workers are not supported, so interception proxies won't work.",
    );
    console.log("setting proxy to rammerhead");
    localStorage.setItem("proxy", "rammerhead");
}

async function unregisterSw() {
    if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.getRegistrations().then(registrations => {
            for (const registration of registrations) registration.unregister();
        });
    }
}

declare global {
    var BareMux: typeof _BareMux;
}

function genTechnologyUrl(technology: "wisp" | "bare") {
    const wsProtocol =
        window.location.protocol.split(":")[0] === "https" ? "wss" : "ws";

    const protocol =
        technology === "wisp"
            ? wsProtocol
            : window.location.protocol.split(":")[0] || "http";

    return `${protocol}://${window.location.host}/${technology}/`;
}

async function setupBareMux() {
    const transport = localStorage.getItem("transport") || "libcurl";

    const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

    const sharedSetTransportOpts = [{ wisp: genTechnologyUrl("wisp") }];

    switch (transport) {
        case "epoxy":
        case "libcurl":
            await connection.setTransport(
                `/${transport}/index.mjs`,
                sharedSetTransportOpts,
            );
            console.log(`set transport to /${transport}/index.mjs with wisp`);
            break;
        case "baremod":
            await connection.setTransport("/baremod/index.mjs", [
                genTechnologyUrl("bare"),
            ]);
            console.log("set transport to /baremod/index.mjs with bare-server");
            break;
    }
}

export { registerSw, setupBareMux, unregisterSw };
