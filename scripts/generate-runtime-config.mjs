import { writeFile } from "node:fs/promises";

const analytics = {
  gaMeasurementId: process.env.VITE_GA_MEASUREMENT_ID || "",
  gtmId: process.env.VITE_GTM_ID || "",
  metaPixelId: process.env.VITE_META_PIXEL_ID || ""
};

const output = `window.AUCO_ANALYTICS_CONFIG = Object.freeze(${JSON.stringify(analytics, null, 2)});\n`;
await writeFile(new URL("../analytics-config.js", import.meta.url), output, "utf8");

console.log("analytics-config.js generado para Netlify");
