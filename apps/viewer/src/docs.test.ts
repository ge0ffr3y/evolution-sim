import { describe, expect, it } from "vitest";
import { REPO_URL, docKey, resolveLink } from "./docs";

const media = new Map([["docs/media/living-plants.svg", "/assets/living-plants-abc.svg"]]);

describe("reading page links", () => {
  it("names documents by their path, with a folder's README as the folder", () => {
    expect(docKey("devlog/README.md")).toBe("devlog");
    expect(docKey("devlog/0024-living-plants.md")).toBe("devlog/0024-living-plants");
    expect(docKey("findings/README.md")).toBe("findings");
  });

  it("keeps findings and devlog links on the site, images on the site's copies, and sends the rest to GitHub", () => {
    expect(resolveLink("findings", "../devlog/README.md", media).href).toBe("./read.html?doc=devlog");
    expect(resolveLink("findings", "living-plants.md", media).href).toBe("./read.html?doc=findings%2Fliving-plants");
    expect(resolveLink("devlog", "0023-predator-life.md#what-broke", media).href).toBe("./read.html?doc=devlog%2F0023-predator-life#what-broke");
    expect(resolveLink("devlog", "../media/living-plants.svg", media).href).toBe("/assets/living-plants-abc.svg");
    expect(resolveLink("devlog", "../../configs/grand-world.json", media)).toEqual({ href: `${REPO_URL}configs/grand-world.json`, external: true });
    expect(resolveLink("devlog", "https://example.org/x", media)).toEqual({ href: "https://example.org/x", external: true });
    expect(resolveLink("devlog", "#top", media)).toEqual({ href: "#top", external: false });
  });
});
