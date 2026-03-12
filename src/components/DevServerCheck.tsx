import { useEffect } from "react";

/**
 * DevServerCheck component to verify and log the development server status.
 * This component is only intended for development use.
 */
export default function DevServerCheck() {
  useEffect(() => {
    // Only log in development
    if (import.meta.env.DEV) {
      console.log(
        "%c PhotoAI Dev Server Running %c http://localhost:5173 ",
        "background: #3b82f6; color: #fff; border-radius: 4px; padding: 2px 6px; font-weight: bold;",
        "background: #1e293b; color: #3b82f6; border-radius: 4px; padding: 2px 6px;"
      );

      if (window.location.hostname === "127.0.0.1") {
        console.warn(
          "%c WARNING %c You are accessing the dev server via 127.0.0.1. Please use http://localhost:5173 instead to avoid Magic Link redirect issues.",
          "background: #f59e0b; color: #fff; border-radius: 4px; padding: 2px 6px; font-weight: bold;",
          "color: #f59e0b; font-weight: bold;"
        );
      }
    }
  }, []);

  return null;
}
