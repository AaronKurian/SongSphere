import React from "react";
import ReactDOM from "react-dom/client";
import { PrivacyPage } from "~/landing/PrivacyPage";
import "~/styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("[SongSphere] privacy root missing");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <PrivacyPage />
  </React.StrictMode>,
);
