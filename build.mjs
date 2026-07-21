import { cp, mkdir, rm, copyFile } from "node:fs/promises";

const output = new URL("./dist/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(new URL("./icons/", output), { recursive: true });
await mkdir(new URL("./.openai/", output), { recursive: true });
await mkdir(new URL("./server/", output), { recursive: true });

for (const file of ["index.html", "styles.css", "app.js", "sw.js", "manifest.webmanifest"]) {
  await copyFile(new URL(`./${file}`, import.meta.url), new URL(`./${file}`, output));
}

await cp(new URL("./icons/", import.meta.url), new URL("./icons/", output), { recursive: true });
await copyFile(new URL("./.openai/hosting.json", import.meta.url), new URL("./.openai/hosting.json", output));
await copyFile(new URL("./server/index.js", import.meta.url), new URL("./server/index.js", output));

console.log("Static PWA built in dist/");
