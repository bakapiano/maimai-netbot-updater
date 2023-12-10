import * as schedule from "node-schedule";

import { GameType, lock, queue, updateChunithmScore, updateMaimaiScore } from "./crawler.js";

import { Task } from "./web.js";
import config from "./config.js";
import fetch from "node-fetch";
import { useTrace } from "./trace.js";

var lastFire = 0;

const configureWorker = () => {
  console.log(`Worker enabled`);
  const getWork = new schedule.RecurrenceRule();
  // Every 2 second
  getWork.second = [...Array.from({ length: 60 }, (_, i) => i)].filter(i => i % 2 === 0);
  schedule.scheduleJob(getWork, async () => {
    if (lock) {
      console.log("[Worker] Lock fetch task")
      return;
    }
    // 0 - 20 - 40
    // 2s - 8s - 16s
    if (queue.length >= 40 && Date.now() - lastFire < 16 * 1000) {
      return;
    }
    if (queue.length >= 20 && Date.now() - lastFire < 8 * 1000) {
      return;
    }

    try {
      lastFire = Date.now();
      const url = `${config.worker.task}?token=${config.authToken}`;
      let res = await fetch(url);
      if (res.status !== 400) {
        const { data, uuid, type, appendTime } = (await res.json()) as Task;
        const { username, password, authUrl, diffList, traceUUID, pageInfo } = data;
        console.log("[Worker] Get task", res.status, uuid, type)
        const url = `${config.worker.task}${uuid}/?token=${config.authToken}`;
        res = await fetch(url, { method: "post" });
        if (res.status === 200) {
          console.log("[Worker] Start task", res.status, uuid)
          // 1 min timeout for task
          if (Date.now() - appendTime > 60 * 1000) {
            const trace = useTrace(traceUUID);
            console.log("[Worker] Task timeout", res.status, uuid)
            await trace({ log: `等待时间过长，请重试`, status: "failed"});
            return;
          }

          const func = type === GameType.maimai ? updateMaimaiScore : updateChunithmScore;
          func(username, password, authUrl, traceUUID, diffList, pageInfo).catch(console.log);
        }
        else {
          console.log("[Worker] Failed to ack task", res.status, uuid)
        }
      }
    }
    catch(err) {
      console.log("[Worker] Failed when get task", err)
    }
  });
};

export { configureWorker };
