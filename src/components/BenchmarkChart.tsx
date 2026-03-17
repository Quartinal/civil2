import { onMount, onCleanup, createMemo, Show, For } from "solid-js";
import { init, graphic } from "echarts";
import { flavors } from "@catppuccin/palette";
import type { ColorName } from "@catppuccin/palette";
import type { EChartsOption } from "echarts";

const macchiatoColors = flavors.macchiato.colors;
const hex = ({ rgb: { r, g, b } }: { rgb: { [key: string]: number } }) =>
    `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;

const colors = Object.fromEntries(
    Object.entries(macchiatoColors).map(([name, color]) => [name, hex(color)]),
) as Record<ColorName, string>;

const IMPL_METADATA = {
    "UltraViolet new encoding method": {
        short: "UltraViolet new",
        color: colors.blue,
        tag: "JavaScript",
    },
    "UltraViolet old encoding method": {
        short: "UltraViolet old",
        color: colors.mauve,
        tag: "JavaScript",
    },
    "Civil C++/WebAssembly encoding method": {
        short: "C++/WASM",
        color: colors.green,
        tag: "WebAssembly",
    },
};

type ImplMetadata = {
    short: string;
    color: string;
    tag: string;
};

function meta(impl: string): ImplMetadata {
    for (const [key, value] of Object.entries(IMPL_METADATA))
        if (impl.toLowerCase().includes(key.toLowerCase().slice(0, 8)))
            return value;
    if (impl.includes("new"))
        return IMPL_METADATA["UltraViolet new encoding method"];
    if (impl.includes("old"))
        return IMPL_METADATA["UltraViolet old encoding method"];
    return IMPL_METADATA["Civil C++/WebAssembly encoding method"];
}

const FONT = '"Rubik", sans-serif';

const axisBase = {
    axisLine: { lineStyle: { color: colors.surface2 } },
    axisTick: { show: false },
    splitLine: {
        lineStyle: { color: colors.surface0, type: "dashed" as const },
    },
    axisLabel: { color: colors.subtext0, fontFamily: FONT, fontSize: 11 },
};

const gridBase = {
    left: "2%",
    right: "3%",
    top: "22%",
    bottom: "10%",
    containLabel: true,
};

const tooltipBase = {
    trigger: "axis" as const,
    axisPointer: { type: "shadow" as const },
    backgroundColor: colors.mantle,
    borderColor: colors.surface2,
    borderWidth: 1,
    textStyle: { color: colors.text, fontFamily: FONT, fontSize: 12 },
    extraCssText: "box-shadow: 0 8px 32px rgba(0,0,0,0.4); border-radius: 8px;",
};

const titleBase = (text: string, subtext: string) => ({
    text,
    subtext,
    left: "center" as const,
    top: 10,
    textStyle: {
        color: colors.text,
        fontSize: 11,
        fontWeight: 400,
        letterSpacing: 3,
        fontFamily: FONT,
    },
    subtextStyle: { color: colors.subtext0, fontSize: 10, fontFamily: FONT },
});

function gradient(top: string, bottom: string) {
    return new graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: top },
        { offset: 1, color: bottom },
    ]);
}

function barSeries(
    implColors: string[],
    values: number[],
    labelSuffix = "",
    labelColors?: string[],
    topAlpha = "",
) {
    return {
        type: "bar" as const,
        barMaxWidth: 56,
        emphasis: {
            itemStyle: { shadowBlur: 20, shadowColor: implColors[0] + "66" },
        },
        data: values.map((value, i) => ({
            value,
            itemStyle: {
                borderRadius: [5, 5, 0, 0],
                color: gradient(implColors[i] + topAlpha, implColors[i] + "33"),
            },
            label: {
                show: true,
                position: "top" as const,
                color: labelColors?.[i] ?? implColors[i],
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: 700,
                formatter: `${value}${labelSuffix}`,
            },
        })),
    };
}

type Run = {
    impl: string;
    total_ms: number;
    ops_per_sec: number;
    avg_ns_per_op: number;
};

type Comparison = {
    baseline_impl: string;
    wasm_ops_per_sec: number | null;
    baseline_ops_per_sec: number;
    speedup_factor: number | null;
};

interface BenchmarkChartProps {
    data: {
        iterations: number;
        runs: Run[];
        comparisons: Comparison[];
    };
}

const styles = {
    root: `background:${colors.base};min-height:100vh;color:${colors.text};font-family:${FONT};padding:2.5rem 2rem 3rem;box-sizing:border-box`,
    inner: `max-width:1100px;margin:0 auto`,
    chip: `display:inline-flex;align-items:center;gap:6px;background:${colors.surface0};border:1px solid ${colors.surface2};border-radius:999px;padding:3px 12px;font-size:10px;color:${colors.subtext0};letter-spacing:1px;text-transform:uppercase;margin-bottom:1.25rem`,
    h1: `margin:0 0 .3rem;font-size:clamp(1.6rem,4vw,2.6rem);font-weight:700;letter-spacing:-.04em;color:${colors.text};font-family:${FONT}`,
    subheading: `margin:0 0 2rem;color:${colors.subtext1};font-size:.82rem;font-weight:400`,
    heroLabel: `font-size:.75rem;color:${colors.subtext0};margin-top:.5rem;text-align:center`,
    pills: `display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:2rem`,
    grid2: `display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.25rem;margin-bottom:1.25rem`,
    card: `background:${colors.mantle};border:1px solid ${colors.surface0};border-radius:12px;overflow:hidden`,
    chartBox: `width:100%;height:300px`,
    fullCard: `background:${colors.mantle};border:1px solid ${colors.surface0};border-radius:12px;overflow:hidden;margin-bottom:1.25rem`,
    fullChart: `width:100%;height:280px`,
    tableWrap: `background:${colors.mantle};border:1px solid ${colors.surface0};border-radius:12px;overflow:hidden`,
    tableHead: `padding:.65rem 1.25rem;border-bottom:1px solid ${colors.surface0};font-size:.65rem;color:${colors.subtext0};letter-spacing:.12em;text-transform:uppercase`,
    table: `width:100%;border-collapse:collapse;font-size:.78rem`,
    th: `padding:.6rem 1.25rem;text-align:left;color:${colors.subtext0};font-weight:500;white-space:nowrap;border-bottom:1px solid ${colors.surface0}`,
    implCell: `display:inline-flex;align-items:center;gap:8px`,
    footer: `text-align:center;margin-top:2rem;color:${colors.overlay0};font-size:.68rem;letter-spacing:.08em`,
} as const;

const heroCard = (win: boolean) =>
    `display:inline-flex;flex-direction:column;align-items:center;background:${colors.mantle};border:1px solid ${win ? colors.green : colors.red}33;border-radius:14px;padding:1.5rem 3rem 1.25rem;box-shadow:0 0 60px ${win ? colors.green : colors.red}11;margin-bottom:2.5rem`;
const heroNumber = (win: boolean) =>
    `font-size:clamp(3rem,7vw,4.5rem);font-weight:900;color:${win ? colors.green : colors.red};line-height:1;letter-spacing:-.05em`;
const pill = (color: string) =>
    `display:inline-flex;align-items:center;gap:6px;background:${colors.surface0};border:1px solid ${color}44;border-radius:999px;padding:4px 12px;font-size:.72rem;color:${colors.subtext1}`;
const dot = (color: string) =>
    `width:7px;height:7px;border-radius:50%;background:${color};flex-shrink:0`;
const implTag = (color: string) =>
    `background:${color}22;color:${color};border-radius:4px;padding:1px 6px;font-size:.65rem;font-weight:700`;
const tableCell = (rowIndex: number) =>
    `padding:.65rem 1.25rem;border-bottom:1px solid ${colors.surface0};background:${rowIndex % 2 ? colors.surface0 + "44" : "transparent"}`;

export default function BenchmarkChart(props: BenchmarkChartProps) {
    const runs = createMemo(() => props.data?.runs ?? []);
    const comparisons = createMemo(() => props.data?.comparisons ?? []);
    const iterations = createMemo(() => props.data?.iterations ?? 0);

    const wasmRow = createMemo(() =>
        runs().find(
            ({ impl }) => impl.includes("wasm") || impl.includes("c++"),
        ),
    );
    const jsRow = createMemo(() =>
        runs().filter(
            ({ impl }) => !(impl.includes("wasm") || impl.includes("c++")),
        ),
    );
    const bestJs = createMemo(() =>
        jsRow().reduce<Run | null>(
            (best, current) =>
                (best?.ops_per_sec ?? 0) > current.ops_per_sec ? best : current,
            null,
        ),
    );
    const headline = createMemo(() => {
        const wasmRun = wasmRow();
        const bestJsRun = bestJs();
        if (!wasmRun || !bestJsRun) return null;
        return (wasmRun.ops_per_sec / bestJsRun.ops_per_sec).toFixed(2);
    });
    const wasmWins = createMemo(() => parseFloat(headline()!) >= 1.0);

    const throughputOption = createMemo<EChartsOption | {}>(() => {
        const runners = runs();
        if (!runners.length) return {};
        const names = runners.map(({ impl }) => meta(impl).short);
        const implColors = runners.map(({ impl }) => meta(impl).color);
        const values = runners.map(
            ({ ops_per_sec }) => +(ops_per_sec / 1e6).toFixed(4),
        );
        return {
            backgroundColor: "transparent",
            title: titleBase(
                "THROUGHPUT",
                "Millions of operations / second (higher is better)",
            ),
            tooltip: {
                ...tooltipBase,
                formatter: (params: any[]) => {
                    const point = params[0];
                    const color = implColors[point.dataIndex];
                    return (
                        `<span style="color:${color};font-weight:700">${names[point.dataIndex]}</span><br/>` +
                        `<span style="font-size:16px;font-weight:700;color:${color}">${point.value}</span>` +
                        `<span style="color:${colors.subtext0}"> Mops/s</span>`
                    );
                },
            },
            grid: gridBase,
            xAxis: { type: "category", data: names, ...axisBase },
            yAxis: {
                type: "value",
                name: "Mops/s",
                nameTextStyle: {
                    color: colors.subtext0,
                    fontFamily: FONT,
                    fontSize: 10,
                },
                ...axisBase,
            },
            series: [barSeries(implColors, values)],
        };
    });

    const latencyOption = createMemo<EChartsOption | {}>(() => {
        const runners = runs();
        if (!runners.length) return {};
        const names = runners.map(({ impl }) => meta(impl).short);
        const implColors = runners.map(({ impl }) => meta(impl).color);
        const values = runners.map(
            ({ avg_ns_per_op }) => +avg_ns_per_op.toFixed(1),
        );
        return {
            backgroundColor: "transparent",
            title: titleBase(
                "LATENCY",
                "Nanoseconds / operation (lower is better)",
            ),
            tooltip: {
                ...tooltipBase,
                formatter: (params: any[]) => {
                    const point = params[0];
                    const color = implColors[point.dataIndex];
                    return (
                        `<span style="color:${color};font-weight:700">${names[point.dataIndex]}</span><br/>` +
                        `<span style="font-size:16px;font-weight:700;color:${color}">${point.value}</span>` +
                        `<span style="color:${colors.subtext0}"> ns/op</span>`
                    );
                },
            },
            grid: gridBase,
            xAxis: { type: "category", data: names, ...axisBase },
            yAxis: {
                type: "value",
                name: "ns/op",
                nameTextStyle: {
                    color: colors.subtext0,
                    fontFamily: FONT,
                    fontSize: 10,
                },
                ...axisBase,
            },
            series: [barSeries(implColors, values, "", undefined, "cc")],
        };
    });

    const speedupOption = createMemo<EChartsOption | {}>(() => {
        const comps = comparisons();
        if (!comps.length || comps[0].speedup_factor == null) return {};
        const names = comps.map(
            ({ baseline_impl }) => `vs ${meta(baseline_impl).short}`,
        );
        const values = comps.map(
            ({ speedup_factor }) => +(speedup_factor as number).toFixed(3),
        );
        const winFlags = values.map(v => v >= 1.0);
        const implColors = winFlags.map(win =>
            win ? colors.green : colors.red,
        );
        const bottomColors = winFlags.map(
            win => (win ? colors.teal : colors.maroon) + "44",
        );
        return {
            backgroundColor: "transparent",
            title: titleBase("SPEEDUP FACTOR", "Wasm / JS  (1.0 is parity)"),
            tooltip: {
                ...tooltipBase,
                formatter: (params: any[]) => {
                    const point = params[0];
                    const win = point.value >= 1.0;
                    const color = win ? colors.green : colors.red;
                    return (
                        `<span style="color:${colors.subtext1}">${names[point.dataIndex]}</span><br/>` +
                        `<span style="font-size:20px;font-weight:900;color:${color}">${point.value}×</span>` +
                        `<span style="color:${colors.subtext0}"> ${win ? "faster" : "slower"}</span>`
                    );
                },
            },
            grid: gridBase,
            xAxis: { type: "category", data: names, ...axisBase },
            yAxis: {
                type: "value",
                name: "× ratio",
                min: 0,
                nameTextStyle: {
                    color: colors.subtext0,
                    fontFamily: FONT,
                    fontSize: 10,
                },
                ...axisBase,
                axisLabel: { ...axisBase.axisLabel, formatter: "{value}×" },
            },
            series: [
                {
                    ...barSeries(implColors, values, "×", implColors),
                    data: values.map((value, i) => ({
                        value,
                        itemStyle: {
                            borderRadius: [5, 5, 0, 0],
                            color: gradient(implColors[i], bottomColors[i]),
                        },
                        label: {
                            show: true,
                            position: "top" as const,
                            color: implColors[i],
                            fontFamily: FONT,
                            fontSize: 13,
                            fontWeight: 900,
                            formatter: `${value}×`,
                        },
                    })),
                    markLine: {
                        silent: true,
                        symbol: "none",
                        lineStyle: {
                            color: colors.overlay1,
                            type: "dashed" as const,
                            width: 1,
                        },
                        data: [
                            {
                                yAxis: 1,
                                label: {
                                    formatter: "parity",
                                    color: colors.overlay0,
                                    fontFamily: FONT,
                                    fontSize: 10,
                                },
                            },
                        ],
                    },
                },
            ],
        };
    });

    let refThroughput!: HTMLDivElement;
    let refLatency!: HTMLDivElement;
    let refSpeedup!: HTMLDivElement;

    onMount(() => {
        const initChart = (el: HTMLDivElement, option: EChartsOption | {}) => {
            if (!Object.keys(option).length) return null;
            const chart = init(el, null, { renderer: "canvas" });
            chart.setOption(option as EChartsOption);
            return chart;
        };

        const chartInstances = [
            initChart(refThroughput, throughputOption()),
            initChart(refLatency, latencyOption()),
            initChart(refSpeedup, speedupOption()),
        ].filter((chart): chart is NonNullable<typeof chart> => chart !== null);

        const resizeObserver = new ResizeObserver(() =>
            chartInstances.forEach(chart => chart.resize()),
        );
        [refThroughput, refLatency, refSpeedup].forEach(el =>
            resizeObserver.observe(el),
        );
        onCleanup(() => {
            resizeObserver.disconnect();
            chartInstances.forEach(chart => chart.dispose());
        });
    });

    return (
        <div style={styles.root}>
            <div style={styles.inner}>
                <div>
                    <div style={styles.chip}>
                        <span style={{ color: colors.green }}>●</span>
                        {iterations().toLocaleString()} iterations |{" "}
                        {runs().length} implementations
                    </div>
                    <h1 style={styles.h1}>XOR encoder benchmark</h1>
                    <p style={styles.subheading}>
                        2 UltraViolet JavaScript implementations compared to
                        Civil's C++/WebAssembly implementation via Emscripten
                    </p>
                </div>

                <Show when={headline()}>
                    <div>
                        <div style={heroCard(wasmWins())}>
                            <div style={heroNumber(wasmWins())}>
                                {headline()}×
                            </div>
                            <div style={styles.heroLabel}>
                                WebAssembly is{" "}
                                {wasmWins() ? "faster" : "slower"} than the best
                                JavaScript implementation
                            </div>
                        </div>
                    </div>
                </Show>

                <div style={styles.pills}>
                    <For each={runs()}>
                        {run => {
                            const implMeta = meta(run.impl);
                            return (
                                <span style={pill(implMeta.color)}>
                                    <span style={dot(implMeta.color)} />
                                    {implMeta.short}
                                    <span style={implTag(implMeta.color)}>
                                        {implMeta.tag}
                                    </span>
                                </span>
                            );
                        }}
                    </For>
                </div>

                <div style={styles.grid2}>
                    <div style={styles.card}>
                        <div ref={refThroughput} style={styles.chartBox} />
                    </div>
                    <div style={styles.card}>
                        <div ref={refLatency} style={styles.chartBox} />
                    </div>
                </div>

                <Show
                    when={
                        comparisons().length > 0 &&
                        comparisons()[0].speedup_factor != null
                    }
                >
                    <div style={styles.fullCard}>
                        <div ref={refSpeedup} style={styles.fullChart} />
                    </div>
                </Show>

                <div style={styles.tableWrap}>
                    <div style={styles.tableHead}>raw results</div>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <For
                                    each={
                                        [
                                            "Implementation",
                                            "Mops/s",
                                            "ns/op",
                                            "Total ms",
                                        ] as const
                                    }
                                >
                                    {heading => (
                                        <th style={styles.th}>{heading}</th>
                                    )}
                                </For>
                            </tr>
                        </thead>
                        <tbody>
                            <For each={runs()}>
                                {(run, index) => {
                                    const implMeta = meta(run.impl);
                                    return (
                                        <tr>
                                            <td style={tableCell(index())}>
                                                <span style={styles.implCell}>
                                                    <span
                                                        style={dot(
                                                            implMeta.color,
                                                        )}
                                                    />
                                                    <span
                                                        style={`color:${colors.text}`}
                                                    >
                                                        {run.impl}
                                                    </span>
                                                </span>
                                            </td>
                                            <td
                                                style={`${tableCell(index())};color:${implMeta.color};font-weight:700`}
                                            >
                                                {(
                                                    run.ops_per_sec / 1e6
                                                ).toFixed(4)}
                                            </td>
                                            <td
                                                style={`${tableCell(index())};color:${colors.subtext1}`}
                                            >
                                                {run.avg_ns_per_op.toFixed(1)}
                                            </td>
                                            <td
                                                style={`${tableCell(index())};color:${colors.subtext1}`}
                                            >
                                                {run.total_ms.toFixed(1)}
                                            </td>
                                        </tr>
                                    );
                                }}
                            </For>
                        </tbody>
                    </table>
                </div>

                <div style={styles.footer}>
                    catppuccin macchiato · apache echarts · solidjs
                </div>
            </div>
        </div>
    );
}
