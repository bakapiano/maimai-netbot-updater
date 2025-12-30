import config from "./config.ts";
import { startServer } from "./api.ts";

startServer();

console.log(
  `Job service started in ${config.dev ? "development" : "production"} mode.`
);
