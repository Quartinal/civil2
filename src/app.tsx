import usePageLoading from "~/lib/usePageLoading";
import Loading from "~/components/Loading";

export default function App() {
  const { isLoading, pageLoadId } = usePageLoading();

  if (isLoading) {
    return <Loading key={pageLoadId ?? "loading"} />;
  }

  return <div />;
}
