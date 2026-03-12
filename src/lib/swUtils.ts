import type * as _BareMux from "@mercuryworkshop/bare-mux";

function registerSw() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
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
  }

  console.log(
    "service workers are not supported, so interception proxies won't work.",
  );
  console.log("setting proxy to rammerhead");
  localStorage.setItem("proxy", "rammerhead");
}

function unregisterSw() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister());
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
  const transport = localStorage.getItem("transport") || "epoxy";

  const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

  const sharedSetTransportOpts = [{ wisp: genTechnologyUrl("wisp") }];

  switch (transport) {
    case "epoxy":
    case "libcurl":
      await connection.setTransport(
        `/${transport}/index.mjs`,
        sharedSetTransportOpts,
      );
      break;
    case "baremod":
      await connection.setTransport("/baremod/index.mjs", [
        genTechnologyUrl("bare"),
      ]);
      break;
  }
}

export { registerSw, unregisterSw, setupBareMux };
