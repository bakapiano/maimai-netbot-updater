import { fetchWithCookieWithRetry } from "./util.ts";
import fs from "fs";
import lodash from "lodash";
import { state } from "./state.ts";

const { throttle } = lodash;

export async function loadCookie(friendCode: string) {
  return state.cookieJars.get(friendCode);
}

export async function saveCookie(cj: any, friendCode: string) {
  const value = getCookieValue(cj);
  Object.keys(value).forEach((key) => {
    // Set cookie expire day to 2099, or will lose this value when save cookie to file
    // This may be a bug(or by design) for CookieJar from node-fetch-cookies
    const value = cj?.cookies?.get("maimai.wahlap.com")?.get(key);
    if (value) value.expiry = new Date().setFullYear(2099);
  });
  state.cookieJars.set(friendCode, cj);
}

export function getCookieValue(cj: any) {
  return {
    _t: cj.cookies?.get("maimai.wahlap.com")?.get("_t")?.value,
    userId: cj.cookies?.get("maimai.wahlap.com")?.get("userId")?.value,
    friendCodeList: cj.cookies?.get("maimai.wahlap.com")?.get("friendCodeList")
      ?.value,
  };
}

export const testCookieExpired = throttle(async (cj: any): Promise<boolean> => {
  // console.log("[Bot] Start test cookie expired: ", getCookieValue(cj));
  try {
    const result = await fetchWithCookieWithRetry(
      cj,
      "https://maimai.wahlap.com/maimai-mobile/home/",
      {
        headers: {
          Host: "maimai.wahlap.com",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x6307001e)",
        },
      },
      undefined,
      true
    );
    const body = await result!.text();
    // fs.writeFileSync("test_cookie_expired.html", body);
    const testReuslt = body.indexOf("登录失败") !== -1;
    // console.log("[Bot] Done test cookie expired: ", testReuslt);
    return testReuslt;
  } catch (err) {
    // console.log("[Bot] Done test cookie expired with error: ", err);
    return true;
  }
});
