import { Button, Group, Loader, Stack, Tabs, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";

import { AllScoresTab } from "./score/AllScoresTab";
import { Best50Tab } from "./score/Best50Tab";
import { IconRefresh } from "@tabler/icons-react";
import { LevelScoresTab } from "./score/LevelScoresTab";
import type { MusicRow } from "../types/music";
import type { SyncScore } from "../types/syncScore";
import { VersionScoresTab } from "./score/VersionScoresTab";
import { useAuth } from "../providers/AuthProvider";

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init);
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T) : (null as T);
  return { ok: res.ok, status: res.status, data };
}

export default function ScorePage() {
  const { token } = useAuth();
  const [scores, setScores] = useState<SyncScore[]>([]);
  const [musics, setMusics] = useState<MusicRow[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScores = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      const [latestRes, musicRes, syncListRes] = await Promise.all([
        fetchJson<unknown>("/api/sync/latest", { headers }),
        fetchJson<unknown>("/api/music"),
        fetchJson<unknown>("/api/sync", { headers }),
      ]);

      let message: string | null = null;

      if (!latestRes.ok) {
        message = `获取成绩失败 (HTTP ${latestRes.status})`;
        setScores([]);
      } else if (!Array.isArray(latestRes.data)) {
        message = "成绩返回格式异常，期待为数组";
        setScores([]);
      } else {
        setScores(latestRes.data as SyncScore[]);
      }

      if (musicRes.ok && Array.isArray(musicRes.data)) {
        setMusics(musicRes.data as MusicRow[]);
      } else {
        setMusics([]);
        if (!musicRes.ok) {
          message = message ?? `获取曲库失败 (HTTP ${musicRes.status})`;
        }
      }

      if (
        syncListRes.ok &&
        Array.isArray(syncListRes.data) &&
        syncListRes.data.length
      ) {
        const latest = syncListRes.data[0] as {
          createdAt?: string;
          updatedAt?: string;
        };
        setLastSyncAt(latest.createdAt ?? latest.updatedAt ?? null);
      } else {
        setLastSyncAt(null);
        if (!syncListRes.ok) {
          message = message ?? `获取同步记录失败 (HTTP ${syncListRes.status})`;
        }
      }

      if (message) {
        setError(message);
      }
    } catch (err) {
      setError((err as Error)?.message ?? "请求失败");
      setScores([]);
      setMusics([]);
      setLastSyncAt(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3}>乐曲成绩</Title>
          <Text size="sm" c="dimmed">
            通过最新同步记录获取的所有成绩列表。
          </Text>
        </div>
        <Button
          variant="light"
          size="sm"
          leftSection={
            loading ? <Loader size="xs" /> : <IconRefresh size={16} />
          }
          onClick={loadScores}
          disabled={loading}
        >
          重新获取
        </Button>
      </Group>

      <Tabs defaultValue="best">
        <Tabs.List>
          <Tabs.Tab value="best">Best 50</Tabs.Tab>
          <Tabs.Tab value="levels">按等级</Tabs.Tab>
          <Tabs.Tab value="versions">按版本</Tabs.Tab>
          <Tabs.Tab value="all">全部成绩</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="best" pt="md">
          <Best50Tab scores={scores} loading={loading} />
        </Tabs.Panel>

        <Tabs.Panel value="levels" pt="md">
          <LevelScoresTab
            scores={scores}
            musics={musics}
            lastSyncAt={lastSyncAt}
            loading={loading}
          />
        </Tabs.Panel>

        <Tabs.Panel value="versions" pt="md">
          <VersionScoresTab
            scores={scores}
            musics={musics}
            lastSyncAt={lastSyncAt}
            loading={loading}
          />
        </Tabs.Panel>

        <Tabs.Panel value="all" pt="md">
          <AllScoresTab scores={scores} loading={loading} error={error} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
