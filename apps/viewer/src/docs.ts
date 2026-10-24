/** Where the repository lives, for links to files the site does not show itself (code, presets, plans). */
export const REPO_URL = "https://github.com/ge0ffr3y/evolution-sim/blob/main/";

/** A document's key from its path under docs/: "devlog/README.md" is "devlog", "devlog/0024-x.md" is "devlog/0024-x". */
export function docKey(pathUnderDocs: string): string {
  return pathUnderDocs.replace(/\.md$/, "").replace(/\/README$/, "");
}

/**
 * Where a link written in a document under docs/<folder>/ should point on the site:
 * another findings or devlog page shows on the reading page, an image uses the site's own copy,
 * web links stay as they are, and anything else in the repository opens on GitHub.
 */
export function resolveLink(folder: string, href: string, mediaUrls: ReadonlyMap<string, string>): { href: string; external: boolean } {
  if (/^[a-z]+:/i.test(href) || href.startsWith("#")) return { href, external: !href.startsWith("#") };
  const [pathPart, hash] = href.split("#") as [string, string | undefined];
  // Work out the path from the repository's root.
  const parts = `docs/${folder}/${pathPart}`.split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p !== "." && p !== "") out.push(p);
  }
  const repoPath = out.join("/");
  const suffix = hash ? `#${hash}` : "";
  const local = repoPath.match(/^docs\/((?:devlog|findings)\/[^/]+)\.md$/);
  if (local) return { href: `./read.html?doc=${encodeURIComponent(docKey(local[1]!))}${suffix}`, external: false };
  const asset = mediaUrls.get(repoPath);
  if (asset) return { href: asset, external: false };
  return { href: REPO_URL + repoPath + suffix, external: true };
}
