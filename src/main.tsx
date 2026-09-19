import React from "react";
import ReactDOM from "react-dom/client";
import { StoreProvider } from "./store";
import { Router } from "./Router";
import "./styles.css";
import "./theme.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StoreProvider>
      <Router />
    </StoreProvider>
  </React.StrictMode>,
);
