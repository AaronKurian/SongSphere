import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initBuildFreshness } from "~/shared/build";
import "~/styles/globals.css";

initBuildFreshness("popup");

const root = document.getElementById("root");
if (!root) throw new Error("[SongSphere] popup root element missing");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
