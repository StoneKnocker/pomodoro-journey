import React from "react";
import { createRoot } from "react-dom/client";
import { Stats } from "./Stats";
import "../options/options.css";
import "./stats.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Stats />
  </React.StrictMode>
);
