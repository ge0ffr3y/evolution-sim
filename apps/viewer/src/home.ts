import "./style.css";
import { FEATURED, featuredLink } from "./featured";

// The front page: one card per featured world, each starting it in the simulator.
const list = document.getElementById("featured");
if (list) {
  FEATURED.forEach((world, k) => {
    const card = document.createElement("a");
    card.className = k === 0 ? "featured-card featured-first" : "featured-card";
    card.href = featuredLink(world);
    const title = document.createElement("h3");
    title.textContent = world.title;
    const text = document.createElement("p");
    text.textContent = world.watchFor;
    const go = document.createElement("span");
    go.className = "featured-go";
    go.textContent = "Watch it →";
    card.append(title, text, go);
    list.append(card);
  });
}
