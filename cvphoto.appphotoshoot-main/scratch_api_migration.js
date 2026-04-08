const fs = require('fs');
let content = fs.readFileSync('frontend/src/lib/api.ts', 'utf-8');
content = content.replace(
  'const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";',
  'const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:3000/api" : "/api");'
);
content = content.replace(/\$\{API_URL\}\/api/g, '${API_BASE}');
fs.writeFileSync('frontend/src/lib/api.ts', content);
