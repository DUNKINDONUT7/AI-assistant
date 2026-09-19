import { useEffect, useState } from "react";
import App from "./App";
import { Landing } from "./Landing";
export function Router() {
  const [hash, setHash] = useState(location.hash.slice(1));
  useEffect(() => {
    const change = () => setHash(location.hash.slice(1));
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return ["", "home", "features", "how-it-works", "faq"].includes(hash) ? (
    <Landing />
  ) : (
    <App />
  );
}
