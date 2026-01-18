import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Pagination,
  PasswordInput,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import {
  IconDatabase,
  IconMusic,
  IconPhoto,
  IconRefresh,
  IconUsers,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface AdminStats {
  userCount: number;
  musicCount: number;
  syncCount: number;
  coverCount: number;
}

interface AdminUser {
  id: string;
  friendCode: string;
  username: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

const ADMIN_PASSWORD_KEY = "admin_password";

function useAdminPassword() {
  const [password, setPassword] = useState<string>(() => {
    try {
      return localStorage.getItem(ADMIN_PASSWORD_KEY) || "";
    } catch {
      return "";
    }
  });

  const savePassword = useCallback((pwd: string) => {
    setPassword(pwd);
    try {
      if (pwd) {
        localStorage.setItem(ADMIN_PASSWORD_KEY, pwd);
      } else {
        localStorage.removeItem(ADMIN_PASSWORD_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  return { password, savePassword };
}

async function adminFetch<T>(
  url: string,
  password: string,
  options?: RequestInit,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        "X-Admin-Password": password,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${text}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card withBorder shadow="sm" padding="lg" radius="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text size="xl" fw={700} mt={4}>
            {value}
          </Text>
        </div>
        <Box
          style={{
            backgroundColor: `var(--mantine-color-${color}-light)`,
            borderRadius: "var(--mantine-radius-md)",
            padding: 8,
          }}
        >
          {icon}
        </Box>
      </Group>
    </Card>
  );
}

export default function AdminPage() {
  const { password, savePassword } = useAdminPassword();
  const [inputPassword, setInputPassword] = useState(password);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [coverSyncing, setCoverSyncing] = useState(false);
  const [coverSyncResult, setCoverSyncResult] = useState<string>("");

  const [musicSyncing, setMusicSyncing] = useState(false);
  const [musicSyncResult, setMusicSyncResult] = useState<string>("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 20;

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * usersPerPage;
    return users.slice(start, start + usersPerPage);
  }, [users, userPage]);

  const totalUserPages = useMemo(
    () => Math.ceil(users.length / usersPerPage),
    [users.length],
  );

  const verifyPassword = useCallback(async () => {
    if (!inputPassword.trim()) {
      setError("请输入管理员密码");
      return;
    }
    setVerifying(true);
    setError("");

    const res = await adminFetch<AdminStats>(
      "/api/admin/stats",
      inputPassword.trim(),
    );
    setVerifying(false);

    if (res.ok) {
      savePassword(inputPassword.trim());
      setVerified(true);
      setStats(res.data ?? null);
    } else {
      setError(res.error || "验证失败");
    }
  }, [inputPassword, savePassword]);

  const loadStats = useCallback(async () => {
    if (!password) return;
    setStatsLoading(true);
    const res = await adminFetch<AdminStats>("/api/admin/stats", password);
    setStatsLoading(false);
    if (res.ok) {
      setStats(res.data ?? null);
    }
  }, [password]);

  const syncCovers = useCallback(async () => {
    if (!password) return;
    setCoverSyncing(true);
    setCoverSyncResult("");
    const res = await adminFetch<{
      ok: boolean;
      total: number;
      saved: number;
      skipped: number;
      failed: number;
    }>("/api/admin/sync-covers", password, { method: "POST" });
    setCoverSyncing(false);
    if (res.ok && res.data) {
      setCoverSyncResult(
        `完成: 总计 ${res.data.total}, 保存 ${res.data.saved}, 跳过 ${res.data.skipped}, 失败 ${res.data.failed}`,
      );
      void loadStats();
    } else {
      setCoverSyncResult(`失败: ${res.error}`);
    }
  }, [password, loadStats]);

  const syncMusic = useCallback(async () => {
    if (!password) return;
    setMusicSyncing(true);
    setMusicSyncResult("");
    const res = await adminFetch<{
      ok: boolean;
      total: number;
      added: number;
      updated: number;
    }>("/api/admin/sync-music", password, { method: "POST" });
    setMusicSyncing(false);
    if (res.ok && res.data) {
      setMusicSyncResult(
        `完成: 总计 ${res.data.total}, 新增 ${res.data.added}, 更新 ${res.data.updated}`,
      );
      void loadStats();
    } else {
      setMusicSyncResult(`失败: ${res.error}`);
    }
  }, [password, loadStats]);

  const loadUsers = useCallback(async () => {
    if (!password) return;
    setUsersLoading(true);
    const res = await adminFetch<AdminUser[]>("/api/admin/users", password);
    setUsersLoading(false);
    if (res.ok && res.data) {
      setUsers(res.data);
      setUserPage(1);
    }
  }, [password]);

  // Auto verify if password is stored
  useEffect(() => {
    if (password && !verified) {
      setInputPassword(password);
      (async () => {
        setVerifying(true);
        const res = await adminFetch<AdminStats>("/api/admin/stats", password);
        setVerifying(false);
        if (res.ok) {
          setVerified(true);
          setStats(res.data ?? null);
        }
      })();
    }
  }, [password, verified]);

  // Load users when verified
  useEffect(() => {
    if (verified && password && users.length === 0) {
      void loadUsers();
    }
  }, [verified, password, users.length, loadUsers]);

  if (!verified) {
    return (
      <Container size="xs" py="xl">
        <Card withBorder shadow="sm" padding="xl" radius="md">
          <Stack gap="md">
            <Title order={3} ta="center">
              管理员登录
            </Title>
            <PasswordInput
              label="管理员密码"
              placeholder="输入密码"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void verifyPassword();
                }
              }}
            />
            {error && (
              <Text size="sm" c="red">
                {error}
              </Text>
            )}
            <Button onClick={verifyPassword} loading={verifying} fullWidth>
              登录
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={3}>管理后台</Title>
          <Button
            variant="subtle"
            size="xs"
            onClick={() => {
              savePassword("");
              setVerified(false);
              setInputPassword("");
            }}
          >
            退出
          </Button>
        </Group>

        <div>
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={600}>统计数据</Text>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconRefresh size={14} />}
              onClick={loadStats}
              loading={statsLoading}
            >
              刷新
            </Button>
          </Group>
          <Grid>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <StatCard
                title="用户数"
                value={stats?.userCount ?? "-"}
                icon={
                  <IconUsers size={20} color="var(--mantine-color-blue-6)" />
                }
                color="blue"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <StatCard
                title="歌曲数"
                value={stats?.musicCount ?? "-"}
                icon={
                  <IconMusic size={20} color="var(--mantine-color-teal-6)" />
                }
                color="teal"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <StatCard
                title="同步记录"
                value={stats?.syncCount ?? "-"}
                icon={
                  <IconDatabase
                    size={20}
                    color="var(--mantine-color-grape-6)"
                  />
                }
                color="grape"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 6, md: 3 }}>
              <StatCard
                title="封面数"
                value={stats?.coverCount ?? "-"}
                icon={
                  <IconPhoto size={20} color="var(--mantine-color-orange-6)" />
                }
                color="orange"
              />
            </Grid.Col>
          </Grid>
        </div>

        <Card withBorder shadow="sm" padding="lg" radius="md">
          <Stack gap="md">
            <Text fw={600}>数据同步</Text>

            <div>
              <Group gap="sm" mb={4}>
                <Button
                  variant="light"
                  leftSection={<IconPhoto size={16} />}
                  onClick={syncCovers}
                  loading={coverSyncing}
                >
                  同步封面
                </Button>
              </Group>
              {coverSyncResult && (
                <Text size="sm" c="dimmed">
                  {coverSyncResult}
                </Text>
              )}
            </div>

            <div>
              <Group gap="sm" mb={4}>
                <Button
                  variant="light"
                  leftSection={<IconMusic size={16} />}
                  onClick={syncMusic}
                  loading={musicSyncing}
                >
                  同步歌曲数据
                </Button>
              </Group>
              {musicSyncResult && (
                <Text size="sm" c="dimmed">
                  {musicSyncResult}
                </Text>
              )}
            </div>
          </Stack>
        </Card>

        <Card withBorder shadow="sm" padding="lg" radius="md">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Text fw={600}>用户列表 ({users.length})</Text>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconRefresh size={14} />}
                onClick={loadUsers}
                loading={usersLoading}
              >
                刷新
              </Button>
            </Group>

            {users.length > 0 ? (
              <>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>好友码</Table.Th>
                      <Table.Th>用户名</Table.Th>
                      <Table.Th>Rating</Table.Th>
                      <Table.Th>注册时间</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {paginatedUsers.map((user) => (
                      <Table.Tr key={user.id}>
                        <Table.Td>
                          <Text size="sm" ff="monospace">
                            {user.friendCode}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{user.username ?? "-"}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{user.rating ?? "-"}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {new Date(user.createdAt).toLocaleString("zh-CN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>

                {totalUserPages > 1 && (
                  <Group justify="center">
                    <Pagination
                      total={totalUserPages}
                      value={userPage}
                      onChange={setUserPage}
                      size="sm"
                    />
                  </Group>
                )}
              </>
            ) : (
              <Text size="sm" c="dimmed" ta="center">
                {usersLoading ? "加载中..." : "暂无用户数据"}
              </Text>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
