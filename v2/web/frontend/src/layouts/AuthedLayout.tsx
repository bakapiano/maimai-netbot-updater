import {
  AppShell,
  Box,
  Burger,
  Divider,
  Group,
  Image,
  NavLink,
  Stack,
  Text,
  ThemeIcon,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconBug,
  IconHome,
  IconMusic,
  IconRefresh,
  IconSettings,
} from "@tabler/icons-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import {
  HeaderProfileCard,
  type MiniProfile,
} from "../components/MiniProfileCard";
import { PageHeader } from "../components/PageHeader";
import { SettingsPanel } from "../components/SettingsPanel";
import { useAuth } from "../providers/AuthProvider";
import { useDisclosure } from "@mantine/hooks";

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  try {
    const res = await fetch(input, init);
    const data: T = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null as T | null };
  }
}

type PageMeta = {
  label: string;
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color?: string;
  hidden?: boolean;
};

const pages: PageMeta[] = [
  {
    label: "首页",
    to: "/app",
    title: "首页",
    description: "开始使用 maimai Score Hub",
    icon: <IconHome size={18} />,
    color: "teal",
  },
  {
    label: "同步数据",
    to: "/app/sync",
    title: "同步数据",
    description: "从 maimai DX NET 同步游戏成绩",
    icon: <IconRefresh size={18} />,
    color: "blue",
  },
  {
    label: "乐曲成绩",
    to: "/app/scores",
    title: "乐曲成绩",
    description: "查看和分析你的游戏成绩数据",
    icon: <IconMusic size={18} />,
    color: "grape",
  },
  {
    label: "Debug",
    to: "/app/debug",
    title: "调试工具",
    description: "用于开发和调试的内部工具页面",
    icon: <IconBug size={18} />,
    color: "orange",
    hidden: true,
  },
];

export default function AuthedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, clearToken } = useAuth();
  const [opened, { toggle, close }] = useDisclosure(false);
  const [settingsOpened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);
  const { colorScheme } = useMantineColorScheme();
  const [profile, setProfile] = useState<MiniProfile | null>(null);
  const touchStartX = useRef<number | null>(null);

  const currentPage = pages.find((p) => p.to === location.pathname);

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

  // Load profile for mini card
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      const res = await fetchJson<{ profile: MiniProfile | null }>(
        "/api/users/profile",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (cancelled) return;

      if (res.ok && res.data?.profile) {
        setProfile({
          avatarUrl: res.data.profile.avatarUrl,
          username: res.data.profile.username,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const headerBg =
    colorScheme === "dark"
      ? "var(--mantine-color-dark-6)"
      : "var(--mantine-color-gray-0)";

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 220,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding={0}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm" wrap="nowrap">
            <Image
              src="/favicon.png"
              alt="app icon"
              width={42}
              height={42}
              radius="sm"
            />
            <Text fw={700} style={{ whiteSpace: "nowrap" }}>
              maimai Score Hub
            </Text>
          </Group>
          <Group>
            <HeaderProfileCard profile={profile} onLogout={handleLogout} />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="md"
        withBorder
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const startX = touchStartX.current;
          touchStartX.current = null;
          if (startX === null) return;
          const endX = event.changedTouches[0]?.clientX ?? startX;
          if (startX - endX > 50) {
            close();
          }
        }}
      >
        <Stack h="100%">
          {/* Top: Navigation links */}
          <Group gap={4}>
            {pages
              .filter((page) => !page.hidden)
              .map((page) => (
                <NavLink
                  key={page.to}
                  component={Link}
                  to={page.to}
                  label={page.label}
                  leftSection={
                    <ThemeIcon size={28} radius="md" color={page.color}>
                      {page.icon}
                    </ThemeIcon>
                  }
                  active={location.pathname === page.to}
                  onClick={close}
                />
              ))}

              <div>
                test
              </div>



            <Divider />

            <NavLink
              label="设置"
              leftSection={
                <ThemeIcon size={28} radius="md" color="gray">
                  <IconSettings size={18} />
                </ThemeIcon>
              }
              onClick={() => {
                close();
                openSettings();
              }}
            />
          </Group>
        </Stack>
      </AppShell.Navbar>

      <SettingsPanel opened={settingsOpened} onClose={closeSettings} />

      <AppShell.Main>
        <Box
          hiddenFrom="sm"
          style={{
            position: "fixed",
            left: 16,
            bottom: 16,
            zIndex: 2000,
          }}
        >
          <Burger opened={opened} onClick={toggle} size="sm" />
        </Box>
        {currentPage && (
          <Box
            py={"lg"}
            px="md"
            style={{
              backgroundColor: headerBg,
            }}
          >
            <div style={{ maxWidth: 912, margin: "0 auto" }}>
              <PageHeader
                title={currentPage.title}
                description={currentPage.description}
              />
            </div>
          </Box>
        )}
        <Box p="md">
          <div
            style={{
              maxWidth: 912,
              margin: "0 auto",
              width: "100%",
              overflowX: "hidden",
            }}
          >
            <Outlet />
          </div>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
