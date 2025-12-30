import { dirname, resolve } from "node:path";

import { fileURLToPath } from "node:url";
import { parseFriendVsSongs } from "./friend-vs-parser.ts";
import { readFile } from "node:fs/promises";

// Quick smoke test: read a Friend VS HTML page and dump the parsed songs.
const [, , inputArg] = process.argv;
const here = dirname(fileURLToPath(import.meta.url));
const defaultSample =
  "../friend-vs/7beb8c63-656e-40fe-a823-94f23bf5fcc1-413252453611467-type1-diff0.html";
const target = resolve(here, inputArg ?? defaultSample);

const html = await readFile(target, "utf-8");
console.log("Parsing HTML from", target);
const songs = parseFriendVsSongs(html);

console.log(`Parsed ${songs.length} songs from ${target}`);
console.log("First five entries:");
console.log(songs.filter((s) => s.score != null).slice(0, 5));

const categories = new Set(songs.map((song) => song.category ?? "(none)"));
console.log(`Detected categories (${categories.size}):`);
console.log([...categories]);
