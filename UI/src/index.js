import React from "react";
import ReactDOM from "react-dom/client";
import "./css/style.css";
import App from "./App";

import { BrowserRouter } from "react-router-dom";
import { UserProvider } from "./utils/UserContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <App />
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
