import { createGlobalThemeContract } from "@vanilla-extract/css";
import { flavors } from "@catppuccin/palette";

const { colors } = flavors.macchiato;

export const vars = createGlobalThemeContract(
    {
        color: Object.fromEntries(
            Object.keys(colors).map(k => [k, null]),
        ) as Record<keyof typeof colors, null>,
    },
    (_, path) => `civil-${path.join("-")}`,
);
