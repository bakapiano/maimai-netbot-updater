import { CookieJar } from "tough-cookie";

export const state = {
  isCookieExpired: false,
  authUrl: "",
  cookieJars: new Map<string, CookieJar>(),
};
