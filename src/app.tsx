import isPageLoading from "~/lib/isPageLoading";
import "./app.css";

export default function App() {
    const { isLoading, pageLoadId } = isPageLoading();

    if (isLoading) {
        return (
            <div class="loading-screen">
                <h1>Loading...</h1>
                <p>Page Load ID: {pageLoadId}</p>
            </div>
        );
    }
}