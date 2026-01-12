import { Badge, Card, Divider, Group, Stack, Text, Title } from "@mantine/core";
import {
  CompactMusicScoreCard,
  MusicScoreCard,
} from "../../components/MusicScoreCard";

import type { SyncScore } from "../../types/syncScore";
import { useMemo } from "react";

type RatingSummary = {
  newTop: SyncScore[];
  oldTop: SyncScore[];
  newSum: number;
  oldSum: number;
  totalSum: number;
};

const buildRatingSummary = (scores: SyncScore[]): RatingSummary | null => {
  if (!Array.isArray(scores)) return null;

  const withRating = scores.filter((s) => typeof s.rating === "number");

  const newScores = withRating
    .filter((s) => s.isNew === true)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const oldScores = withRating
    .filter((s) => s.isNew === false)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  const newTop = newScores.slice(0, 15);
  const oldTop = oldScores.slice(0, 35);

  const newSum = newTop.reduce((sum, s) => sum + (s.rating ?? 0), 0);
  const oldSum = oldTop.reduce((sum, s) => sum + (s.rating ?? 0), 0);

  return {
    newTop,
    oldTop,
    newSum,
    oldSum,
    totalSum: newSum + oldSum,
  };
};

type Best50TabProps = {
  scores: SyncScore[];
  loading: boolean;
};

export function Best50Tab({ scores, loading }: Best50TabProps) {
  const ratingSummary = useMemo(() => buildRatingSummary(scores), [scores]);

  return (
    <Stack gap="md">
      <Card withBorder shadow="xs" padding="md">
        <Stack gap={6}>
          <Group gap="sm" wrap="wrap">
            <Text fw={700}>B50 Rating</Text>
            {ratingSummary ? (
              <>
                <Badge color="blue" variant="light">
                  总分 {ratingSummary.totalSum.toFixed(2)}
                </Badge>
                <Badge color="green" variant="light">
                  新曲 {ratingSummary.newSum.toFixed(2)}
                </Badge>
                <Badge color="grape" variant="light">
                  旧曲 {ratingSummary.oldSum.toFixed(2)}
                </Badge>
              </>
            ) : (
              <Badge color="gray" variant="light">
                {loading ? "加载中" : "暂无 rating 数据"}
              </Badge>
            )}
          </Group>
          {ratingSummary && (
            <Text size="sm" c="dimmed">
              组成：新曲 {ratingSummary.newTop.length} 首 + 旧曲{" "}
              {ratingSummary.oldTop.length} 首
            </Text>
          )}
        </Stack>
      </Card>

      {ratingSummary ? (
        <Stack gap="lg">
          <Stack gap={8}>
            <Title size="h3" order={5}>
              现版本 Best 15
            </Title>
            <Group gap="md" align="stretch" wrap="wrap">
              {ratingSummary.newTop.slice(0, 15).map((score) => (
                <CompactMusicScoreCard
                  key={`new-${score.musicId}-${score.type}-${score.chartIndex}`}
                  musicId={score.musicId}
                  chartIndex={score.chartIndex}
                  type={score.type}
                  rating={score.rating ?? null}
                  score={score.score || null}
                  fs={score.fs || null}
                  fc={score.fc || null}
                  chartPayload={score.chartPayload}
                  songMetadata={score.songMetadata}
                  bpm={
                    typeof score.songMetadata?.bpm === "number"
                      ? score.songMetadata.bpm
                      : parseInt(score.songMetadata?.bpm as string) || null
                  }
                  noteDesigner={score.chartPayload?.charter || null}
                />
              ))}
              {ratingSummary.newTop.length === 0 && (
                <Text c="dimmed">暂无新曲</Text>
              )}
            </Group>
          </Stack>

          <Stack gap={8}>
            <Divider />
            <Title size={"h3"} order={5}>
              旧版本 Best 35
            </Title>
            <Group gap="md" align="stretch" wrap="wrap">
              {ratingSummary.oldTop.slice(0, 35).map((score) => (
                <MusicScoreCard
                  key={`old-${score.musicId}-${score.type}-${score.chartIndex}`}
                  musicId={score.musicId}
                  chartIndex={score.chartIndex}
                  type={score.type}
                  rating={score.rating ?? null}
                  score={score.score || null}
                  fs={score.fs || null}
                  fc={score.fc || null}
                  chartPayload={score.chartPayload}
                  songMetadata={score.songMetadata}
                  bpm={
                    typeof score.songMetadata?.bpm === "number"
                      ? score.songMetadata.bpm
                      : parseInt(score.songMetadata?.bpm as string) || null
                  }
                  noteDesigner={score.chartPayload?.charter || null}
                />
              ))}
              {ratingSummary.oldTop.length === 0 && (
                <Text c="dimmed">暂无旧曲</Text>
              )}
            </Group>
          </Stack>
        </Stack>
      ) : (
        !loading && <Text c="dimmed">暂无 B50 数据</Text>
      )}
    </Stack>
  );
}
