import { CookieJar } from "tough-cookie";
import config from "./config.ts";
import makeFetchCookie from "fetch-cookie";

const COOKIE_EXPIRE_LOCATIONS = new Set([
  "https://maimai.wahlap.com/maimai-mobile/error/",
  "https://maimai.wahlap.com/maimai-mobile/logout/",
]);

export class CookieExpiredError extends Error {
  constructor(message = "Cookie 已失效") {
    super(message);
    this.name = "CookieExpiredError";
  }
}

async function fetchWithCookieWithRetry(
  cj: CookieJar,
  url: string,
  options: any | undefined = undefined,
  fetchTimeout: number | undefined = undefined,
  throwOnCookieExpire = false
) {
  const fetch = makeFetchCookie(global.fetch, cj);
  for (let i = 0; i < config.fetchRetryCount; i++) {
    try {
      const result = await fetch(url, {
        signal: (AbortSignal as any).timeout(
          fetchTimeout || config.fetchTimeOut
        ),
        ...options,
      });
      if (throwOnCookieExpire) {
        const location = result.url;
        if (COOKIE_EXPIRE_LOCATIONS.has(location)) {
          throw new CookieExpiredError();
        }
      }
      return result;
    } catch (e: any) {
      if (e instanceof CookieExpiredError) {
        throw e;
      }
      console.log(
        `Delay due to fetch failed with attempt ${url} #${i + 1}, error: ${e}`
      );
      if (i === config.fetchRetryCount - 1) {
        if (e.name === "AbortError" || e.name === "TimeoutError")
          throw new Error(
            `请求超时, 超时时间: ${
              fetchTimeout || config.fetchTimeOut / 1000.0
            } 秒`
          );
        else throw e;
      } else await sleep(1000);
    }
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export { fetchWithCookieWithRetry, sleep };
