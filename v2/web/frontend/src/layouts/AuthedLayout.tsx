import {
  AppShell,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  NavLink,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconHome,
  IconMusic,
  IconRefresh,
  IconSettings,
} from "@tabler/icons-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { ColorSchemeToggle } from "../components/ColorSchemeToggle";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../providers/AuthProvider";
import { useDisclosure } from "@mantine/hooks";

type PageMeta = {
  label: string;
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const pages: PageMeta[] = [
  {
    label: "首页",
    to: "/app",
    title: "首页",
    description: "欢迎回来！",
    icon: <IconHome size={18} />,
  },
  {
    label: "同步数据",
    to: "/app/sync",
    title: "同步数据",
    description: "从 maimai DX NET 同步游戏成绩",
    icon: <IconRefresh size={18} />,
  },
  {
    label: "乐曲成绩",
    to: "/app/scores",
    title: "乐曲成绩",
    description: "查看和分析你的游戏成绩数据",
    icon: <IconMusic size={18} />,
  },
  {
    label: "Debug",
    to: "/app/debug",
    title: "调试工具",
    description: "用于开发和调试的内部工具页面",
    icon: <IconSettings size={18} />,
  },
];

export default function AuthedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearToken } = useAuth();
  const [opened, { toggle, close }] = useDisclosure(false);
  const { colorScheme } = useMantineColorScheme();

  const currentPage = pages.find((p) => p.to === location.pathname);

  const handleLogout = () => {
    clearToken();
    navigate("/login", { replace: true });
  };

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
          <Group gap="sm">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Text fw={700}>maimai DX Copilot</Text>
          </Group>
          <Group>
            <ColorSchemeToggle />
            <Button variant="light" onClick={handleLogout} size="xs">
              退出登录
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" withBorder>
        {pages.map((page) => (
          <NavLink
            key={page.to}
            component={Link}
            to={page.to}
            label={page.label}
            leftSection={page.icon}
            active={location.pathname === page.to}
            onClick={close}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        {currentPage && (
          <Box
            py={"lg"}
            px="md"
            style={{
              backgroundColor: headerBg,
            }}
          >
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
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
              maxWidth: 800,
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
