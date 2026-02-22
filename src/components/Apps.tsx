import BaseApp from "~/lib/App.ts";
import { registerSw, unregisterSw, setupBareMux } from "~/lib/swUtils.ts";
import { useRef } from "preact/hooks";

type Apps = {
  url?: string;
  icon?: string;
}[];

const fetchApps = async (): Promise<Apps> => {
  const res = await fetch("/apps/");

  return await res.json();
};

const apps = await fetchApps();

function generateAppUrl(url: string) {
  const urlObj = new URL(url);

  if (localStorage.getItem("proxy") === "rammerhead") {
  }
}

// TODO: fix this
/*export default function Apps() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  for (const app of apps) {
    const appObject = new BaseApp(app.url, url => {
      if (iframeRef.current) {
        iframeRef.current.src = generateAppUrl(url);
      }
    });
  }
}*/
