import { init } from "@plausible-analytics/tracker";

init({
    domain:
        typeof window !== "undefined"
            ? window.location.protocol !== "http:"
                ? window.location.origin
                : "https://civil.quartinal.me"
            : process.env.DOMAIN!,
});
