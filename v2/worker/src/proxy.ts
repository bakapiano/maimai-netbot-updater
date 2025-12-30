import * as http from "http";
import * as net from "net";
import * as url from "url";

import { getCookieByAuthUrl, getUserFriendCode } from "./crawler.ts";

import { HTTPParser } from "http-parser-js";
import config from "./config.ts";
import { saveCookie } from "./cookie.ts";
import { state } from "./state.ts";

const proxyServer = http.createServer(httpOptions);

const WHITE_LIST = [
  "127.0.0.1",
  "localhost",
  "tgk-wcaime.wahlap.com",
  "maimai.bakapiano.com",
  "www.diving-fish.com",
  "open.weixin.qq.com",
  "weixin110.qq.com",
  "res.wx.qq.com",
  "libs.baidu.com",
  "maimai.bakapiano.online",
  "api.maimai.bakapiano.online",
  "api.maimai.bakapiano.com",
].concat(config.host);

function checkHostInWhiteList(target: string | null) {
  if (!target) return false;
  if (config.dev) return true;
  target = target.split(":")[0];
  return WHITE_LIST.find((value) => value === target) !== undefined;
}

async function onAuthHook(href: string) {
  console.log("Successfully hook auth request!");

  const target = href.replace("http", "https");
  const key = String(url.parse(target, true).query.r);

  // Check if this request corresponds to a pending auth in our state
  console.log(`Found pending auth for key ${key}, exchanging cookie...`);
  try {
    const cj = await getCookieByAuthUrl(target);
    const friendCode = await getUserFriendCode(cj);
    if (friendCode) {
      await saveCookie(cj, friendCode);
      state.isCookieExpired = false;
      console.log(`Cookie updated successfully for ${friendCode}.`);
      return `${config.redirectUrl}?friendCode=${friendCode}`;
    } else {
      console.error("Failed to get friend code");
      return config.redirectUrl;
    }
  } catch (e) {
    console.error("Failed to exchange cookie", e);
    return config.redirectUrl;
  }
}

// handle http proxy requests
async function httpOptions(clientReq: any, clientRes: any) {
  clientReq.on("error", (e: any) => {
    console.log("client socket error: " + e);
  });

  var reqUrl = url.parse(clientReq.url);
  if (!checkHostInWhiteList(reqUrl.host)) {
    try {
      clientRes.statusCode = 400;
      clientRes.writeHead(400, {
        "Access-Control-Allow-Origin": "*",
      });
      clientRes.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    } catch (err) {
      console.log(err);
    }
    return;
  }

  if (
    reqUrl.href &&
    reqUrl.href.startsWith(
      "http://tgk-wcaime.wahlap.com/wc_auth/oauth/callback"
    )
  ) {
    try {
      const redirectResult = await onAuthHook(reqUrl.href);
      clientRes.writeHead(302, { location: redirectResult });
      clientRes.statusCode = 302;
      clientRes.end();
    } catch (err) {
      console.log(err);
    }

    return;
  }

  var options = {
    hostname: reqUrl.hostname,
    port: reqUrl.port,
    path: reqUrl.path,
    method: clientReq.method,
    headers: clientReq.headers,
  };

  var serverConnection = http.request(options, function (res) {
    clientRes.writeHead(res.statusCode, res.headers);
    res.pipe(clientRes);
  });

  serverConnection.on("error", (e) => {
    console.log("server connection error: " + e);
  });

  clientReq.pipe(serverConnection);
}

// handle https proxy requests (CONNECT method)
proxyServer.on("connect", (clientReq: any, clientSocket: any, head: any) => {
  clientSocket.on("error", (e: any) => {
    console.log("client socket error: " + e);
    clientSocket.end();
  });

  var reqUrl = url.parse("https://" + clientReq.url);

  if (
    !checkHostInWhiteList(reqUrl.host) ||
    (reqUrl.href &&
      (reqUrl.href.startsWith("https://maimai.wahlap.com/") ||
        reqUrl.href.startsWith("https://chunithm.wahlap.com/")))
  ) {
    try {
      clientSocket.statusCode = 400;
      clientSocket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    } catch (err) {
      console.log(err);
    }
    return;
  }

  if (reqUrl.host === "tgk-wcaime.wahlap.com:80") {
    clientSocket.write(
      "HTTP/" +
        clientReq.httpVersion +
        " 200 Connection Established\r\n" +
        "Proxy-agent: Node.js-Proxy\r\n" +
        "\r\n",
      "UTF-8",
      () => {
        const parser: any = new HTTPParser("REQUEST");
        parser[HTTPParser.kOnHeadersComplete] = async (info: any) => {
          try {
            const redirectResult = await onAuthHook(
              `http://tgk-wcaime.wahlap.com${info.url}`
            );
            clientSocket.end(
              `HTTP/1.1 302 Found\r\nLocation: ${redirectResult}\r\n\r\n`
            );
          } catch (err) {
            console.log(err);
          }
        };

        clientSocket.on("data", (chunk: any) => {
          parser.execute(chunk);
        });
      }
    );

    return;
  }

  var options = {
    port: reqUrl.port,
    host: reqUrl.hostname,
  };

  var serverSocket = net.connect(options as any, () => {
    clientSocket.write(
      "HTTP/" +
        clientReq.httpVersion +
        " 200 Connection Established\r\n" +
        "Proxy-agent: Node.js-Proxy\r\n" +
        "\r\n",
      "UTF-8",
      () => {
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      }
    );
  });

  serverSocket.on("error", (e) => {
    console.log("forward proxy server connection error: " + e);
    clientSocket.end();
  });
});

proxyServer.on("clientError", (err, clientSocket: any) => {
  console.log("client error: " + err);
  clientSocket.statusCode = 400;
  clientSocket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

export { proxyServer as proxy };
