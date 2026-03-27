import { render } from "solid-js/web";

function NewTab() {
    return (
        <div
            style={{
                display: "flex",
                "flex-direction": "column",
                "align-items": "center",
                "justify-content": "center",
                height: "100vh",
                background: "#24273a",
                color: "#cad3f5",
                "font-family": "'Rubik', ui-sans-serif, sans-serif",
                margin: 0,
            }}
        >
            <h1
                style={{
                    "font-size": "2rem",
                    "font-weight": 500,
                    "margin-bottom": "0.5rem",
                    color: "#b7bdf8",
                }}
            >
                New Tab
            </h1>
            <p style={{ color: "#a5adcb", "font-size": "0.9rem" }}>
                Start typing in the address bar to get started.
            </p>
        </div>
    );
}

const root = document.getElementById("root");
if (root) render(() => <NewTab />, root);
