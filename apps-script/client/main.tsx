import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "../../src/components/dashboard";
import SettingsPage from "../../src/components/settings";
import { currentRoute, rpc } from "./rpc";

function App() {
  const [route, setRoute] = useState(currentRoute);
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const update = () => { setRoute(currentRoute()); setRevision(value => value + 1); };
    const onLink = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.("a");
      if (!link || link.getAttribute("href") !== "/api/oauth/google") return;
      event.preventDefault();
      const popup = window.open("about:blank", "_blank");
      if (!popup) { setMessage("Gmail 연결을 위해 팝업을 허용해 주세요."); return; }
      setMessage("Gmail 연결 창을 준비하고 있어요.");
      rpc<{ url: string }>("startGmailConnection").then(({ url }) => {
        popup.location.href = url;
        setMessage("Gmail 연결을 마치면 이 설정 화면을 새로고침해 주세요.");
      }).catch((error: Error) => { popup.close(); setMessage(error.message); });
    };
    window.addEventListener("hashchange", update);
    document.addEventListener("click", onLink, true);
    return () => {
      window.removeEventListener("hashchange", update);
      document.removeEventListener("click", onLink, true);
    };
  }, []);
  return <>
    {message && <div className="gas-message" role="status">
      {message}<button onClick={() => setMessage("")} aria-label="알림 닫기">닫기</button>
    </div>}
    {route.startsWith("/settings") ? <SettingsPage key={route + revision} />
      : <Dashboard key={route + revision} demo={route.startsWith("/demo")} />}
  </>;
}
createRoot(document.getElementById("root")!).render(<App />);
