import { useEffect, useState } from "react";

export type Route =
  | "home"
  | "study"
  | "report"
  | "status"
  | "tutor"
  | "aisettings"
  | "aihistory"
  | "analytics"
  | "library"
  | "diagnosis"
  | "validate";

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash === "/study") return "study";
  if (hash === "/report") return "report";
  if (hash === "/status") return "status";
  if (hash === "/tutor") return "tutor";
  if (hash === "/aisettings") return "aisettings";
  if (hash === "/aihistory") return "aihistory";
  if (hash === "/analytics") return "analytics";
  if (hash === "/library") return "library";
  if (hash === "/diagnosis") return "diagnosis";
  if (hash === "/validate") return "validate";
  return "home";
}

export function useHashRoute(): [Route, (to: string) => void] {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  const navigate = (to: string) => {
    window.location.hash = to;
  };
  return [route, navigate];
}
