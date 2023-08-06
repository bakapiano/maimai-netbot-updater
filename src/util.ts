import * as http from "node:http";
import * as https from "node:https";

import { AbortError } from "node-fetch";
import config from "./config.js";
import { fetch } from "node-fetch-cookies";

async function fetchWithCookieWithRetry(cj: any, url: string, options : any | undefined = undefined, fetchTimeout: number | undefined = undefined) {
  for (let i = 0; i < config.fetchRetryCount; i++) {
    try {
      const result = await fetch(cj, url, {
        signal: (AbortSignal as any).timeout(fetchTimeout || config.fetchTimeOut),
        agent: function (_parsedURL: any) {
          if (_parsedURL.protocol == "http:") {
            return new http.Agent({ keepAlive: true });
          } else {
            return new https.Agent({ keepAlive: true });
          }
        },
        ...options,
      });
      return result;
    } catch (e) {
      console.log(`Delay due to fetch failed with attempt ${url} #${i + 1}, error: ${e}`);
      if (i === config.fetchRetryCount - 1) {
        if (typeof e === typeof AbortError) throw new Error(`请求超时, 超时时间: ${fetchTimeout || config.fetchTimeOut / 1000.0 } 秒`);
        else throw e
      }
      else await sleep(1000)
    }
  }
} 

async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export { fetchWithCookieWithRetry, sleep };
