
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { RoleProvider } from "./app/contexts/RoleContext.tsx";
  import { LanguageProvider } from "./app/utils/i18n";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <LanguageProvider>
      <RoleProvider>
        <App />
      </RoleProvider>
    </LanguageProvider>
  );
  