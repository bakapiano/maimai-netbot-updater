import {
  Alert,
  Box,
  Button,
  Checkbox,
  Code,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";

import { notifications } from "@mantine/notifications";
import { useAuth } from "../providers/AuthProvider";
import { useNavigate } from "react-router-dom";

type LoginRequest = { jobId: string; userId: string };

type LoginStatus = {
  status?: string;
  token?: string;
  [key: string]: unknown;
};

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init);
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T) : (null as T);
  return { ok: res.ok, status: res.status, data };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { token, setToken } = useAuth();

  const [friendCode, setFriendCode] = useState("");
  const [skipUpdateScore, setSkipUpdateScore] = useState(true);
  const [health, setHealth] = useState("");
  const [jobId, setJobId] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [polling, setPolling] = useState(false);
  const [loading, setLoading] = useState(false);

  const canLogin = useMemo(
    () => friendCode.trim().length > 0 && !loading,
    [friendCode, loading]
  );

  useEffect(() => {
    if (token) {
      navigate("/app", { replace: true });
    }
  }, [token, navigate]);

  useEffect(() => {
    (async () => {
      const res = await fetchJson<{ status?: string }>("/api/health");
      setHealth(res.ok ? JSON.stringify(res.data) : `HTTP ${res.status}`);
    })();
  }, []);

  useEffect(() => {
    if (!jobId || polling === false) return;

    const handle = setInterval(async () => {
      const res = await fetchJson<LoginStatus>(
        `/api/auth/login-status?jobId=${jobId}`
      );

      if (!res.ok) {
        setJobStatus(`HTTP ${res.status}`);
        return;
      }

      setJobStatus(JSON.stringify(res.data, null, 2));

      if (res.data?.status === "completed" && res.data?.token) {
        setToken(res.data.token);
        setPolling(false);
        notifications.show({
          title: "登录成功",
          message: "Token 已保存到本地，正在跳转...",
          color: "green",
        });
        navigate("/app", { replace: true });
      }
    }, 1400);

    return () => clearInterval(handle);
  }, [jobId, polling, setToken, navigate]);

  const startLogin = async () => {
    setLoading(true);
    setJobStatus("");
    setJobId("");
    setPolling(false);

    const res = await fetchJson<LoginRequest>("/api/auth/login-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        friendCode: friendCode.trim(),
        skipUpdateScore,
      }),
    });

    if (res.ok && res.data) {
      setJobId(res.data.jobId);
      setPolling(true);
      notifications.show({
        title: "已创建登录任务",
        message: `jobId: ${res.data.jobId}`,
      });
    } else {
      setJobStatus(`Login request failed (HTTP ${res.status})`);
    }

    setLoading(false);
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>NetBot 登录</Title>
          <Text c="dimmed" size="sm">
            输入 friendCode，创建登录任务并轮询状态，拿到 token
            后会自动保存并跳转。
          </Text>
        </div>

        <Paper shadow="xs" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <div>
              <Text fw={600}>Backend health</Text>
              <Code block>{health || "检测中..."}</Code>
            </div>

            <TextInput
              label="Friend Code"
              placeholder="例如 634142510810999"
              value={friendCode}
              onChange={(e) => setFriendCode(e.currentTarget.value)}
              required
            />

            <Checkbox
              label="Skip Update Score"
              checked={skipUpdateScore}
              onChange={(e) => setSkipUpdateScore(e.currentTarget.checked)}
            />

            <Group gap="sm">
              <Button
                onClick={startLogin}
                disabled={!canLogin}
                loading={loading}
              >
                创建登录任务
              </Button>
              {jobId && (
                <Text size="sm" c="dimmed">
                  jobId: <Code>{jobId}</Code>
                </Text>
              )}
            </Group>

            {jobStatus && (
              <Alert title="轮询状态" color="blue" radius="md">
                <Code block>{jobStatus}</Code>
              </Alert>
            )}

            {polling && !jobStatus && (
              <Box>
                <Text size="sm" c="dimmed">
                  正在轮询登录状态...
                </Text>
              </Box>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
