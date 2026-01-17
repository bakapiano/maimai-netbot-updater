import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configFile = fs.readFileSync(
  path.join(__dirname, "../config.json"),
  "utf-8"
);
const configData = JSON.parse(configFile);

const env = process.env.NODE_ENV || "dev";
const config = {
  ...configData[env],
  dev: env === "dev",
};

export default config;
