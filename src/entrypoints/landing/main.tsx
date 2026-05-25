import React from "react";
import ReactDOM from "react-dom/client";
import { LandingPage } from "~/landing/LandingPage";
import "~/styles/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("[SongSphere] landing root element missing");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>,
);
