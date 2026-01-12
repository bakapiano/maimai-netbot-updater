import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  CompactMusicScoreCard,
  MinimalMusicScoreCard,
  renderRank,
} from "../../components/MusicScoreCard";
import type { MusicChartPayload, MusicRow } from "../../types/music";
import { useMemo, useState } from "react";

import type { SyncScore } from "../../types/syncScore";

const formatDateTime = (value: string | null) => {
  if (!value) return "暂无同步信息";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "暂无同步信息";
  return dt.toLocaleString();
};

type ChartEntry = {
  music: MusicRow;
  chart: MusicChartPayload;
  chartIndex: number;
  score?: SyncScore;
};

type LevelBucket = {
  levelKey: string;
  levelNumeric: number | null;
  details: Array<{
    detailKey: string;
    detailNumeric: number | null;
    items: ChartEntry[];
  }>;
};

const parseLevelValue = (value: string) => {
  const match = /^([0-9]+(?:\.[0-9]+)?)(\+)?$/.exec(value.trim());
  if (!match) return null;
  const base = parseFloat(match[1]);
  if (!Number.isFinite(base)) return null;
  // Treat a trailing + as slightly higher than the base number
  return base + (match[2] ? 0.1 : 0);
};

const normalizeLevelKey = (chart: MusicChartPayload) => {
  if (chart.level) return chart.level;
  if (typeof chart.detailLevel === "number") {
    return Math.floor(chart.detailLevel).toString();
  }
  return "?";
};

const normalizeDetailKey = (chart: MusicChartPayload) => {
  if (typeof chart.detailLevel === "number")
    return chart.detailLevel.toFixed(1);
  if (chart.level) return chart.level;
  return "?";
};

const buildBuckets = (
  musics: MusicRow[],
  scores: SyncScore[]
): LevelBucket[] => {
  const scoreMap = new Map<string, SyncScore>();
  for (const s of scores) {
    const key = `${s.musicId}-${s.chartIndex}`;
    scoreMap.set(key, s);
  }

  const levelMap = new Map<string, Map<string, ChartEntry[]>>();

  for (const music of musics) {
    const charts = music.charts ?? [];
    charts.forEach((chart, idx) => {
      const levelKey = normalizeLevelKey(chart);
      const detailKey = normalizeDetailKey(chart);
      const levelBucket =
        levelMap.get(levelKey) ?? new Map<string, ChartEntry[]>();
      if (!levelMap.has(levelKey)) levelMap.set(levelKey, levelBucket);
      const detailBucket = levelBucket.get(detailKey) ?? [];
      if (!levelBucket.has(detailKey)) levelBucket.set(detailKey, detailBucket);

      detailBucket.push({
        music,
        chart,
        chartIndex: idx,
        score: scoreMap.get(`${music.id}-${idx}`),
      });
    });
  }

  const buckets: LevelBucket[] = Array.from(levelMap.entries()).map(
    ([levelKey, detailMap]) => ({
      levelKey,
      levelNumeric: parseLevelValue(levelKey),
      details: Array.from(detailMap.entries())
        .map(([detailKey, items]) => ({
          detailKey,
          detailNumeric: parseLevelValue(detailKey),
          items: items.sort(
            (a, b) => (b.score?.rating ?? 0) - (a.score?.rating ?? 0)
          ),
        }))
        .sort(
          (a, b) =>
            (a.detailNumeric ?? Infinity) - (b.detailNumeric ?? Infinity)
        ),
    })
  );

  buckets.sort((a, b) => {
    const numDiff =
      (b.levelNumeric ?? -Infinity) - (a.levelNumeric ?? -Infinity);
    if (numDiff !== 0) return numDiff;
    return a.levelKey.localeCompare(b.levelKey);
  });

  return buckets;
};

const rankOrder = ["SSS+", "SSS", "SS+", "SS", "S+", "S"] as const;
type RankBucket = (typeof rankOrder)[number];

const fcOrder = ["ap+", "ap", "fc+", "fc"] as const; // highest to lowest
const fsOrder = ["fsd+", "fsd", "fs+", "fs"] as const;
type FcBucket = (typeof fcOrder)[number];
type FsBucket = (typeof fsOrder)[number];

const emptyCounts = (): Record<RankBucket, number> => ({
  "SSS+": 0,
  SSS: 0,
  "SS+": 0,
  SS: 0,
  "S+": 0,
  S: 0,
});

const emptyStatusCounts = () => ({
  fc: fcOrder.reduce<Record<FcBucket, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<FcBucket, number>),
  fs: fsOrder.reduce<Record<FsBucket, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<FsBucket, number>),
});

const scoreToRank = (scoreText?: string | null): RankBucket | null => {
  if (!scoreText) return null;
  const val = parseFloat(scoreText.replace("%", ""));
  if (!Number.isFinite(val)) return null;
  if (val >= 100.5) return "SSS+";
  if (val >= 100) return "SSS";
  if (val >= 99.5) return "SS+";
  if (val >= 99) return "SS";
  if (val >= 98) return "S+";
  if (val >= 97) return "S";
  return null;
};

const summarizeRanks = (entries: ChartEntry[]) => {
  const counts = emptyCounts();
  for (const entry of entries) {
    const rank = scoreToRank(
      entry.score?.score ?? entry.score?.dxScore ?? null
    );
    if (!rank) continue;
    const idx = rankOrder.indexOf(rank);
    for (let i = idx; i < rankOrder.length; i++) {
      counts[rankOrder[i]] += 1;
    }
  }
  return { counts, total: entries.length };
};

const summarizeStatuses = (entries: ChartEntry[]) => {
  const { fc, fs } = emptyStatusCounts();
  for (const entry of entries) {
    const fcVal = entry.score?.fc?.toLowerCase?.() as FcBucket | undefined;
    const fsVal = entry.score?.fs?.toLowerCase?.() as FsBucket | undefined;
    if (fcVal && fcVal in fc) fc[fcVal] += 1;
    if (fsVal && fsVal in fs) fs[fsVal] += 1;
  }
  return { fc, fs, total: entries.length };
};

const buildRankBadges = (
  summary: { counts: Record<RankBucket, number>; total: number },
  size: "xs" | "sm" = "xs",
  expanded = false
) => {
  const list = expanded ? rankOrder : (["SSS+", "SSS"] as RankBucket[]);
  return list.map((r) => (
    <Badge key={r} size={size} variant="light" color="blue" radius="sm">
      <Text size="xs" fw={600} style={{ lineHeight: 1 }}>
        {summary.counts[r]}/{summary.total} {renderRank(r, { compact: true })}
      </Text>
    </Badge>
  ));
};

const buildStatusBadges = (
  summary: {
    fc: Record<FcBucket, number>;
    fs: Record<FsBucket, number>;
    total: number;
  },
  size: "xs" | "sm" = "xs",
  expanded = false
) => {
  const fcColor = (key: FcBucket) =>
    key === "ap+" || key === "ap" ? "orange" : "green";
  const fsColor = (key: FsBucket) =>
    key === "fsd+" || key === "fsd" ? "orange" : "blue";

  const label = (key: FcBucket | FsBucket) => key.toUpperCase();

  const fcList = expanded
    ? fcOrder
    : (["ap+", "ap", "fc+", "fc"] as FcBucket[]);
  const fsList = expanded ? fsOrder : ([] as FsBucket[]);

  const allBadges: JSX.Element[] = [];
  fcList.forEach((key) => {
    allBadges.push(
      <Badge
        key={`fc-${key}`}
        size={size}
        variant="light"
        color="blue"
        radius="sm"
      >
        <Group gap={4} align="center">
          <Text size="xs" fw={600} style={{ lineHeight: 1 }}>
            {summary.fc[key]}/{summary.total}
          </Text>
          <Text size="xs" fw={600} c={fcColor(key)} style={{ lineHeight: 1 }}>
            {label(key)}
          </Text>
        </Group>
      </Badge>
    );
  });
  fsList.forEach((key) => {
    allBadges.push(
      <Badge
        key={`fs-${key}`}
        size={size}
        variant="light"
        color="blue"
        radius="sm"
      >
        <Group gap={4} align="center">
          <Text size="xs" fw={600} style={{ lineHeight: 1 }}>
            {summary.fs[key]}/{summary.total}
          </Text>
          <Text size="xs" fw={600} c={fsColor(key)} style={{ lineHeight: 1 }}>
            {label(key)}
          </Text>
        </Group>
      </Badge>
    );
  });

  return allBadges;
};

const renderCombinedBadges = (
  rankSummary: { counts: Record<RankBucket, number>; total: number },
  statusSummary: {
    fc: Record<FcBucket, number>;
    fs: Record<FsBucket, number>;
    total: number;
  },
  size: "xs" | "sm" = "xs",
  expanded = false,
  onToggle: () => void
) => (
  <Group gap={6} wrap="wrap" align="center">
    {buildRankBadges(rankSummary, size, expanded)}
    {buildStatusBadges(statusSummary, size, expanded)}
    <ActionIcon
      size="18"
      variant="light"
      color="blue"
      radius="999"
      onClick={onToggle}
      aria-label={expanded ? "折叠" : "展开"}
    >
      <Text size="sm" fw={800} style={{ lineHeight: 1 }}>
        {expanded ? "−" : "+"}
      </Text>
    </ActionIcon>
  </Group>
);

const CombinedBadges = ({
  rankSummary,
  statusSummary,
  size = "xs",
  defaultExpanded = false,
}: {
  rankSummary: { counts: Record<RankBucket, number>; total: number };
  statusSummary: {
    fc: Record<FcBucket, number>;
    fs: Record<FsBucket, number>;
    total: number;
  };
  size?: "xs" | "sm";
  defaultExpanded?: boolean;
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return renderCombinedBadges(rankSummary, statusSummary, size, expanded, () =>
    setExpanded((prev) => !prev)
  );
};
type LevelScoresTabProps = {
  musics: MusicRow[];
  scores: SyncScore[];
  lastSyncAt: string | null;
  loading: boolean;
};

export function LevelScoresTab({
  musics,
  scores,
  lastSyncAt,
  loading,
}: LevelScoresTabProps) {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const filteredMusics = useMemo(
    () => musics.filter((m) => m.type !== "utage"),
    [musics]
  );
  const filteredScores = useMemo(
    () => scores.filter((s) => s.type !== "utage"),
    [scores]
  );

  const buckets = useMemo(
    () => buildBuckets(filteredMusics, filteredScores),
    [filteredMusics, filteredScores]
  );
  const current =
    buckets.find((b) => b.levelKey === selectedLevel) ?? buckets[0];

  const overallSummary = useMemo(() => {
    const allEntries = buckets.flatMap((lvl) =>
      lvl.details.flatMap((d) => d.items)
    );
    return summarizeRanks(allEntries);
  }, [buckets]);

  return (
    <Stack gap="md">
      <Card shadow="sm" radius="md" p="md">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap={8} align="center">
              <Title order={4} size="h4">
                按定数查看：
              </Title>
            </Group>
          </Group>

          {buckets.length > 0 && (
            <Stack gap={4}>
              <Group gap="xs" wrap="wrap">
                {buckets.map((b) => (
                  <Button
                    key={b.levelKey}
                    size="xs"
                    variant={
                      current?.levelKey === b.levelKey ? "filled" : "light"
                    }
                    style={{ width: 72 }}
                    onClick={() => setSelectedLevel(b.levelKey)}
                  >
                    {b.levelKey}
                  </Button>
                ))}
              </Group>
            </Stack>
          )}
        </Stack>
      </Card>

      {loading ? (
        <Text size="sm">加载中...</Text>
      ) : !current ? (
        <Text size="sm" c="dimmed">
          暂无数据
        </Text>
      ) : (
        <Stack gap="lg">
          {current.details.map((detail, idx) => (
            <Stack key={`${current.levelKey}-${detail.detailKey}`} gap="xs">
              <Group align="center">
                <Text fw={700}>{detail.detailKey}</Text>
              </Group>
              <CombinedBadges
                rankSummary={summarizeRanks(detail.items)}
                statusSummary={summarizeStatuses(detail.items)}
              />
              <Group gap="sm" align="stretch" wrap="wrap">
                {detail.items.map((entry) => (
                  <MinimalMusicScoreCard
                    key={`${entry.music.id}-${entry.chartIndex}`}
                    musicId={entry.music.id}
                    chartIndex={entry.chartIndex}
                    type={entry.music.type}
                    rating={entry.score?.rating ?? null}
                    score={entry.score?.score || entry.score?.dxScore || null}
                    fs={entry.score?.fs ?? null}
                    fc={entry.score?.fc ?? null}
                    chartPayload={{
                      level: entry.chart.level,
                      detailLevel:
                        typeof entry.chart.detailLevel === "number"
                          ? entry.chart.detailLevel
                          : null,
                      charter: entry.chart.charter ?? null,
                    }}
                    songMetadata={{
                      title: entry.music.title,
                      artist: entry.music.artist ?? undefined,
                      category: entry.music.category ?? undefined,
                      isNew: entry.music.isNew ?? undefined,
                      bpm: entry.music.bpm ?? null,
                    }}
                  />
                ))}
              </Group>
              {idx < current.details.length - 1 && (
                <Divider variant="dashed" mt="md" mb="0" />
              )}
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
