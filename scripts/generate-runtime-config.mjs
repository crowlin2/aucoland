import { cp, copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = path.join(projectRoot, "dist");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const file of ["index.html", "styles.css", "script.js", "site-config.js"]) {
  await copyFile(
    path.join(projectRoot, file),
    path.join(outputDirectory, file)
  );
}

await cp(
  path.join(projectRoot, "assets"),
  path.join(outputDirectory, "assets"),
  { recursive: true }
);

const analytics = {
  gaMeasurementId: process.env.VITE_GA_MEASUREMENT_ID || "",
  gtmId: process.env.VITE_GTM_ID || "",
  metaPixelId: process.env.VITE_META_PIXEL_ID || ""
};

const analyticsOutput =
  `window.AUCO_ANALYTICS_CONFIG = Object.freeze(${JSON.stringify(analytics, null, 2)});\n`;

await writeFile(
  path.join(outputDirectory, "analytics-config.js"),
  analyticsOutput,
  "utf8"
);

console.log("Sitio estático generado en dist/");
