import usePageLoading from "~/lib/usePageLoading";
import Loading from "~/components/Loading";
import StatsForNerds from "~/components/StatsForNerds";
import "@fontsource/rubik/700.css";

export default function App() {
  const { isLoading, pageLoadId } = usePageLoading();

  if (isLoading) {
    return <Loading key={pageLoadId ?? "loading"} />;
  }

  return <StatsForNerds />;
}
