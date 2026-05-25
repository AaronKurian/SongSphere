import React from "react";
import ReactDOM from "react-dom/client";
import { LicensePage } from "~/landing/LicensePage";
import "~/styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("[SongSphere] license root missing");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <LicensePage />
  </React.StrictMode>,
);
