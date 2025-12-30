import { fetchWithCookieWithRetry, sleep } from "./util.ts";

import { CookieJar } from "tough-cookie";

export const GameType = {
  maimai: "maimai-dx",
  chunithm: "chunithm",
} as const;

export type GameType = (typeof GameType)[keyof typeof GameType];

export async function getAuthUrl(type: GameType) {
  if (!["maimai-dx", "chunithm"].includes(type)) {
    throw new Error("unsupported type");
  }

  const res = await fetch(
    `https://tgk-wcaime.wahlap.com/wc_auth/oauth/authorize/${type}`
  );
  let href = res.url.replace("redirect_uri=https", "redirect_uri=http");
  // href = href.replace("connect_redirect=1", "connect_redirect=2");
  // console.log(href);
  return href;
}

export const getCookieByAuthUrl = async (authUrl: string) => {
  const cj = new CookieJar();
  const fetch = async (url: string, options: any | undefined = undefined) =>
    await fetchWithCookieWithRetry(cj, url, options, undefined, false);
  await fetch(authUrl, {
    headers: {
      Host: "tgk-wcaime.wahlap.com",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x6307001e)",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-User": "?1",
      "Sec-Fetch-Dest": "document",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  await fetch("https://maimai.wahlap.com/maimai-mobile/home/");

  return cj;
};

const fetchWithToken = async (
  cj: CookieJar,
  url: string,
  options: any = {}
) => {
  let fetchOptions = { ...options };
  if (fetchOptions.addToken) {
    const cookies = cj.getCookiesSync("https://maimai.wahlap.com");
    const token = cookies.find((c) => c.key === "_t")?.value;
    delete fetchOptions.addToken;
    fetchOptions = {
      ...fetchOptions,
      body: `${fetchOptions.body}&token=${token}`,
    };
  }

  fetchOptions = {
    ...fetchOptions,
    headers: {
      Host: "maimai.wahlap.com",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x6307001e)",
      ...fetchOptions.headers,
    },
  };

  return await fetchWithCookieWithRetry(cj, url, fetchOptions, undefined, true);
};

export const getFriendList = async (cj: CookieJar) => {
  console.log(`[Crawler] Start get friend list`);
  const url = "https://maimai.wahlap.com/maimai-mobile/index.php/friend/";
  const result = await fetchWithToken(cj, url);
  const text = await result!.text();
  const t = text.matchAll(/<input type="hidden" name="idx" value="(.*?)"/g);
  const ids = [...new Set([...t].map((x) => x[1]))];
  console.log(`[Crawler] Done get friend list`);
  return ids;
};

export const getSentRequests = async (cj: CookieJar) => {
  console.log(`[Crawler] Start get sent friend requests`);
  const result = await fetchWithToken(
    cj,
    "https://maimai.wahlap.com/maimai-mobile/friend/invite/"
  );
  const text = await result!.text();
  const t = text.matchAll(/<input type="hidden" name="idx" value="(.*?)"/g);
  const ids = [...new Set([...t].map((x) => x[1]))];
  console.log(`[Crawler] Done get sent friend requests: `, ids);
  return ids;
};

export const sendFriendRequest = async (cj: CookieJar, friendCode: string) => {
  console.log(`[Crawler] Start send friend request, friend code ${friendCode}`);
  await fetchWithToken(
    cj,
    "https://maimai.wahlap.com/maimai-mobile/friend/search/invite/",
    {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: `idx=${friendCode}&invite=`,
      method: "POST",
      addToken: true,
    }
  );

  await fetchWithToken(
    cj,
    "https://maimai.wahlap.com/maimai-mobile/index.php/friend/invite/"
  );

  console.log(`[Crawler] Done send friend request, friend code ${friendCode}`);
};

export const favoriteOnFriend = async (cj: CookieJar, friendCode: string) => {
  console.log(`[Crawler] Start favorite on friend, friend code ${friendCode}`);
  await fetchWithToken(
    cj,
    "https://maimai.wahlap.com/maimai-mobile/friend/favoriteOn/",
    {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: `idx=${friendCode}`,
      method: "POST",
      addToken: true,
    }
  );
  console.log(`[Crawler] Done favorite on friend, friend code ${friendCode}`);
};

export const getFriendVS = async (
  cj: CookieJar,
  friendCode: string,
  scoreType: 1 | 2,
  diff: number
): Promise<string> => {
  const startTime = Date.now();
  let url = `https://maimai.wahlap.com/maimai-mobile/friend/friendGenreVs/battleStart/?scoreType=${scoreType}&genre=99&diff=${diff}&idx=${friendCode}`;
  const result = await fetchWithCookieWithRetry(
    cj,
    url,
    {
      headers: {
        Host: "maimai.wahlap.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x6307001e)",
      },
    },
    1000 * 60 * 5,
    true
  );
  const text = await result!.text();
  const cost = Date.now() - startTime;
  console.log(
    `[Crawler] getFriendVS friendCode=${friendCode} scoreType=${scoreType} diff=${diff} cost=${cost}ms`
  );
  return text;
};

export const getUserFriendCode = async (cj: CookieJar) => {
  console.log(`[Crawler] Start get user friend code`);
  const url = "https://maimai.wahlap.com/maimai-mobile/friend/userFriendCode/";
  const result = await fetchWithToken(cj, url);
  const text = await result!.text();
  const match = text.match(
    /<div class="see_through_block m_t_5 m_b_5 p_5 t_c f_15">(.*?)<\/div>/
  );
  const friendCode = match ? match[1] : null;
  console.log(`[Crawler] Done get user friend code: ${friendCode}`);
  return friendCode;
};
