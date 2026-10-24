import "./style.css";
import { marked } from "marked";
import { docKey, resolveLink } from "./docs";

// The reading page: shows the repo's own markdown (findings and devlog) on the site, so there is one copy of each text.
const sources = import.meta.glob(["../../../docs/devlog/*.md", "../../../docs/findings/*.md"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const media = import.meta.glob("../../../docs/media/*.{svg,png,jpg,gif}", { query: "?url", import: "default", eager: true }) as Record<string, string>;

/** Documents by key ("devlog", "devlog/0024-living-plants", "findings", ...). */
const docs = new Map<string, string>();
for (const [path, text] of Object.entries(sources)) docs.set(docKey(path.replace(/^.*\/docs\//, "")), text);
/** Media files by their path in the repo ("docs/media/x.svg") to the site's own copy. */
const mediaUrls = new Map<string, string>();
for (const [path, url] of Object.entries(media)) mediaUrls.set(path.replace(/^.*\/docs\//, "docs/"), url);

const key = new URLSearchParams(window.location.search).get("doc") ?? "findings";
const main = document.getElementById("doc")!;
const text = docs.get(key);
if (text === undefined) {
  main.innerHTML = `<h1>Not found</h1><p>There is no page called “${key.replace(/[<>&"]/g, "")}”. Try <a href="./read.html?doc=findings">What we found</a> or the <a href="./read.html?doc=devlog">devlog</a>.</p>`;
} else {
  // Our own documents from the repository, so the HTML that marked makes from them can be trusted.
  main.innerHTML = marked.parse(text, { async: false }) as string;
  const folder = key.split("/")[0]!;
  for (const a of main.querySelectorAll("a[href]")) {
    const target = resolveLink(folder, a.getAttribute("href")!, mediaUrls);
    a.setAttribute("href", target.href);
    if (target.external) a.setAttribute("rel", "noopener");
  }
  for (const img of main.querySelectorAll("img[src]")) {
    const target = resolveLink(folder, img.getAttribute("src")!, mediaUrls);
    img.setAttribute("src", target.href);
    img.setAttribute("loading", "lazy");
  }
  document.title = `${main.querySelector("h1")?.textContent ?? "Evolution Sim"} · Evolution Sim`;
}
