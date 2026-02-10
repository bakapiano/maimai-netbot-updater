import https from "https";

const TARGET_URL = "https://maimai.wahlap.com/maimai-mobile/home/";

// 需要cookie才能正常访问，如果有的话填在这里
const COOKIE = process.env.MAIMAI_COOKIE || "";

function makeRequest() {
  return new Promise((resolve, reject) => {
    const url = new URL(TARGET_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...(COOKIE ? { Cookie: COOKIE } : {}),
      },
    };

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      const elapsed = Date.now() - startTime;
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          elapsed,
          bodyLength: body.length,
          headers: res.headers,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatTime() {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

async function testWithInterval(intervalMs, requestCount) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(
    `Testing with interval: ${intervalMs}ms (${(intervalMs / 1000).toFixed(1)}s), ${requestCount} requests`,
  );
  console.log("=".repeat(60));

  let rateLimitedCount = 0;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < requestCount; i++) {
    try {
      const result = await makeRequest();
      const status = result.statusCode;
      const icon = status === 567 ? "🚫" : status === 200 ? "✅" : "⚠️";

      console.log(
        `[${formatTime()}] #${(i + 1).toString().padStart(3)} | ${icon} Status: ${status} | ${result.elapsed}ms | Body: ${result.bodyLength} bytes`,
      );

      if (status === 567) {
        rateLimitedCount++;
      } else if (status >= 200 && status < 300) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (err) {
      console.log(
        `[${formatTime()}] #${(i + 1).toString().padStart(3)} | ❌ Error: ${err.message}`,
      );
      errorCount++;
    }

    if (i < requestCount - 1) {
      await sleep(intervalMs);
    }
  }

  console.log(`\n--- Summary for ${intervalMs}ms interval ---`);
  console.log(`  ✅ Success:      ${successCount}`);
  console.log(`  🚫 Rate Limited: ${rateLimitedCount}`);
  console.log(`  ❌ Errors:       ${errorCount}`);
  console.log(`  Total:           ${requestCount}`);

  return { intervalMs, successCount, rateLimitedCount, errorCount };
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║        maimai Rate Limit Tester                        ║");
  console.log("║        Target: maimai.wahlap.com/maimai-mobile/home/   ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\nStarted at: ${formatTime()}`);
  console.log(
    `Cookie: ${COOKIE ? "Set" : "Not set (use MAIMAI_COOKIE env var)"}`,
  );

  // 测试间隔配置: [间隔ms, 请求数]
  // 总测试时间约 5*15 + 4*15 + 3*15 + 2*20 + 1.5*20 + 1*20 + 0.75*20 + 0.5*30 + 0.25*30 + 0.1*30 = ~5min
  // 加上每组之间的冷却时间
  const testPlan = [
    // [5000, 15],   // 5秒间隔，15次 (~75s)
    // [4000, 15],   // 4秒间隔，15次 (~60s)
    // [3000, 15],   // 3秒间隔，15次 (~45s)
    // [2000, 30], // 2秒间隔，20次 (~40s)
    // [1500, 20],   // 1.5秒间隔，20次 (~30s)
    [1000, 9999], // 1秒间隔，20次 (~20s)
    // [750, 20], // 0.75秒间隔，20次 (~15s)
    [500, 30], // 0.5秒间隔，30次 (~15s)
    [250, 30], // 0.25秒间隔，30次 (~7.5s)
    [100, 30], // 0.1秒间隔，30次 (~3s)
  ];

  const results = [];

  for (let idx = 0; idx < testPlan.length; idx++) {
    const [interval, count] = testPlan[idx];
    const result = await testWithInterval(interval, count);
    results.push(result);

    // 每组测试之间休息8秒，避免上一组的限流影响下一组
    if (idx < testPlan.length - 1) {
      console.log("\n⏳ Cooling down for 8 seconds before next test...");
      await sleep(8000);
    }
  }

  // 最终汇总
  console.log("\n\n" + "═".repeat(60));
  console.log("                    FINAL SUMMARY");
  console.log("═".repeat(60));
  console.log(
    "Interval(ms)".padEnd(15) +
      "Success".padEnd(10) +
      "RateLimited".padEnd(14) +
      "Errors".padEnd(10) +
      "Rate Limited %",
  );
  console.log("-".repeat(60));

  for (const r of results) {
    const total = r.successCount + r.rateLimitedCount + r.errorCount;
    const rlPercent =
      total > 0 ? ((r.rateLimitedCount / total) * 100).toFixed(1) : "0.0";
    console.log(
      r.intervalMs.toString().padEnd(15) +
        r.successCount.toString().padEnd(10) +
        r.rateLimitedCount.toString().padEnd(14) +
        r.errorCount.toString().padEnd(10) +
        `${rlPercent}%`,
    );
  }

  console.log("\n" + "═".repeat(60));
  console.log(`Finished at: ${formatTime()}`);
}

main().catch(console.error);
