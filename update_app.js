const fs = require('fs');
const path = 'c:/Users/Acer/Downloads/SAAS/cvphoto.appphotoshoot-main/cvphoto.appphotoshoot-main/frontend/src/App.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  'import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";',
  'import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";'
);

c = c.replace(
  'import LoginPage from "./pages/LoginPage";',
  'import LoginPage from "./pages/LoginPage";\nimport SignUpPage from "./pages/SignUpPage";'
);

c = c.replace(
  '  const [globalProgress, setGlobalProgress] = useState(false);',
  '  const [globalProgress, setGlobalProgress] = useState(false);\n  const navigate = useNavigate();'
);

c = c.replace(
  '        if (\n          data.session &&\n          (window.location.pathname === "/" ||\n            window.location.pathname === "/auth" ||\n            window.location.pathname === "/login" ||\n            isAuthCallback)\n        ) {\n          window.location.replace("/dashboard");\n        }',
  '        if (\n          data.session &&\n          (window.location.pathname === "/" ||\n            window.location.pathname === "/auth" ||\n            window.location.pathname === "/login" ||\n            window.location.pathname === "/signup" ||\n            isAuthCallback)\n        ) {\n          navigate("/dashboard", { replace: true });\n        }'
);

c = c.replace(
  '      <Route path="/auth" element={<AuthPage />} />\n      <Route path="/login" element={<LoginPage />} />',
  '      <Route path="/auth" element={<Navigate to="/login" replace />} />\n      <Route path="/login" element={<LoginPage />} />\n      <Route path="/signup" element={<SignUpPage />} />'
);

fs.writeFileSync(path, c);
console.log('App patched');
