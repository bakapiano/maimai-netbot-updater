const MAIMAI_IMG_PREFIX = "https://maimai.wahlap.com/maimai-mobile/img/";

export function normalizeMaimaiImgUrl(url: string) {
  if (url.startsWith(MAIMAI_IMG_PREFIX)) {
    return url.replace(MAIMAI_IMG_PREFIX, "/maimai-mobile/img/");
  }
  return url;
}
