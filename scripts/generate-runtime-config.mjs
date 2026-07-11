import { cp, copyFile, mkdir, rm } from "node:fs/promises";
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

console.log("Sitio estático generado en dist/");

for (const routeDirectory of ["gracias", "politica-de-privacidad"]) {
  await cp(
    path.join(projectRoot, routeDirectory),
    path.join(outputDirectory, routeDirectory),
    { recursive: true }
  );
}
