import {
  Alert,
  Badge,
  Card,
  Group,
  Image,
  Loader,
  Pagination,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";

import { IconAlertCircle } from "@tabler/icons-react";
import type { SyncScore } from "../../types/syncScore";

const FALLBACK_COVER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%25' height='100%25' fill='%23222931'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%238a8f98' font-size='12'>Cover</text></svg>";

type AllScoresTabProps = {
  scores: SyncScore[];
  loading: boolean;
  error: string | null;
};

export function AllScoresTab({ scores, loading, error }: AllScoresTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(scores.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [scores.length, page, pageSize]);

  const summary = useMemo(
    () => ({ total: scores.length, page, pageSize }),
    [scores.length, page, pageSize]
  );

  const paginatedScores = useMemo(() => {
    const start = (page - 1) * pageSize;
    return scores.slice(start, start + pageSize);
  }, [scores, page, pageSize]);

  return (
    <Stack gap="md">
      {error && (
        <Alert
          color="red"
          icon={<IconAlertCircle size={18} />}
          title="拉取失败"
          variant="light"
        >
          {error}
        </Alert>
      )}

      <Card withBorder shadow="xs" padding="md" mb="sm">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            当前成绩数量
          </Text>
          <Text fw={700}>{summary.total}</Text>
        </Group>
      </Card>

      <Card withBorder shadow="xs" padding={0}>
        <Group justify="space-between" px="md" py="sm" align="center">
          <Text size="sm" c="dimmed">
            显示 {(page - 1) * pageSize + 1} -
            {Math.min(page * pageSize, summary.total)} / {summary.total}
          </Text>
          <Group gap="sm">
            <Text size="sm" c="dimmed">
              每页
            </Text>
            <Select
              size="xs"
              value={String(pageSize)}
              onChange={(value) => {
                const next = Number(value ?? "20");
                setPageSize(next);
                setPage(1);
              }}
              data={[
                { value: "10", label: "10" },
                { value: "20", label: "20" },
                { value: "50", label: "50" },
                { value: "100", label: "100" },
              ]}
              styles={{ input: { width: 72 } }}
            />
          </Group>
        </Group>

        <ScrollArea h="70vh">
          <Table highlightOnHover striped withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>曲名</Table.Th>
                <Table.Th>封面</Table.Th>
                <Table.Th>谱面</Table.Th>
                <Table.Th>分数</Table.Th>
                <Table.Th>评价</Table.Th>
                <Table.Th>Rating</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedScores.map((score, idx) => {
                const name = score.songMetadata?.title || score.musicId;
                const artist = score.songMetadata?.artist;
                const coverUrl = `/api/cover/${score.musicId}`;
                const level = score.chartPayload?.level;
                const detailLevel =
                  typeof score.chartPayload?.detailLevel === "number"
                    ? score.chartPayload.detailLevel.toFixed(1)
                    : null;
                const scoreValue = score.score ?? score.dxScore ?? "-";
                const ratingValue =
                  typeof score.rating === "number"
                    ? score.rating.toFixed(2)
                    : "-";

                return (
                  <Table.Tr
                    key={`${score.musicId}-${score.chartIndex}-${score.cid}-${idx}`}
                  >
                    <Table.Td>
                      <Stack gap={2}>
                        <Text fw={600}>{name}</Text>
                        {artist && (
                          <Text size="xs" c="dimmed">
                            {artist}
                          </Text>
                        )}
                        <Group gap={6}>
                          {score.songMetadata?.category && (
                            <Badge size="xs" variant="light" color="blue">
                              {score.songMetadata.category}
                            </Badge>
                          )}
                          {(score.isNew || score.songMetadata?.isNew) && (
                            <Badge size="xs" color="green" variant="light">
                              新曲
                            </Badge>
                          )}
                        </Group>
                      </Stack>
                    </Table.Td>

                    <Table.Td>
                      <Image
                        src={coverUrl}
                        alt={name}
                        h={64}
                        w={64}
                        fit="cover"
                        radius="md"
                        fallbackSrc={FALLBACK_COVER}
                      />
                    </Table.Td>

                    <Table.Td>
                      <Stack gap={4}>
                        <Group gap={8}>
                          <Badge size="xs" color="grape" variant="light">
                            {score.type?.toUpperCase?.() || "-"}
                          </Badge>
                          {level && (
                            <Badge size="xs" variant="outline" color="cyan">
                              {level}
                            </Badge>
                          )}
                          {detailLevel && (
                            <Badge size="xs" variant="light" color="teal">
                              定数 {detailLevel}
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          CID {score.cid ?? "-"} · 序号 {score.chartIndex}
                        </Text>
                      </Stack>
                    </Table.Td>

                    <Table.Td>
                      <Stack gap={4}>
                        <Text fw={600}>{scoreValue}</Text>
                        <Group gap={6}>
                          {score.fs && (
                            <Badge size="xs" variant="dot" color="violet">
                              {score.fs}
                            </Badge>
                          )}
                          {score.fc && (
                            <Badge size="xs" variant="dot" color="orange">
                              {score.fc}
                            </Badge>
                          )}
                        </Group>
                      </Stack>
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm">
                        {score.dxScore ? `DX ${score.dxScore}` : "-"}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Text fw={600}>{ratingValue}</Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {scores.length === 0 && !loading && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" align="center">
                      暂无成绩数据。
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
              {loading && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Group justify="center" py="md">
                      <Loader size="sm" />
                      <Text c="dimmed">加载中...</Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        <Group justify="center" py="sm">
          <Pagination
            total={Math.max(1, Math.ceil(summary.total / pageSize))}
            value={page}
            onChange={setPage}
            size="sm"
            radius="md"
            disabled={loading || summary.total === 0}
          />
        </Group>
      </Card>
    </Stack>
  );
}
