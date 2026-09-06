import React from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom"; // <-- BrowserRouter ki jagah HashRouter import kiya

import App from "./App.jsx";
import AuthProvider from "./store/auth-context.jsx";
import { UserProvider } from "./store/user-context.jsx";
import './App.css';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter> {/* <-- Yahan bhi BrowserRouter ki jagah HashRouter kar diya */}
      <AuthProvider>
        <UserProvider>
          <App />
        </UserProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);