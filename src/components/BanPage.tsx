import * as s from "~/styles/BanPage.css";

export default function BanPage({ banReason }: { banReason: string }) {
    return (
        <div class={s.banRoot}>
            <div class={s.banText}>
                <h1>Banned</h1>
                <p>{banReason ?? "You have been banned from this proxy"}</p>
                <a href="/baninfo.html" target="_blank">
                    Click here to figure out why you have been banned
                </a>
            </div>
        </div>
    );
}
