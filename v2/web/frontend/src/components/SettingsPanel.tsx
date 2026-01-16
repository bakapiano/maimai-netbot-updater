import {
  Box,
  Drawer,
  Group,
  SegmentedControl,
  Stack,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import { IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react";

import { useRef } from "react";

type Props = {
  opened: boolean;
  onClose: () => void;
};

export function SettingsPanel({ opened, onClose }: Props) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const touchStartX = useRef<number | null>(null);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="网站设置"
      position="right"
      size="sm"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const startX = touchStartX.current;
        touchStartX.current = null;
        if (startX === null) return;
        const endX = event.changedTouches[0]?.clientX ?? startX;
        if (endX - startX > 50) {
          onClose();
        }
      }}
    >
      <Box style={{ height: "100%" }}>
        <Stack gap="lg">
          <div>
            <Text size="sm" fw={500} mb="xs">
              外观
            </Text>
            <SegmentedControl
              fullWidth
              value={colorScheme}
              onChange={(value) =>
                setColorScheme(value as "light" | "dark" | "auto")
              }
              data={[
                {
                  value: "light",
                  label: (
                    <Group gap={6} justify="center">
                      <IconSun size={16} />
                      <span>浅色</span>
                    </Group>
                  ),
                },
                {
                  value: "dark",
                  label: (
                    <Group gap={6} justify="center">
                      <IconMoon size={16} />
                      <span>深色</span>
                    </Group>
                  ),
                },
                {
                  value: "auto",
                  label: (
                    <Group gap={6} justify="center">
                      <IconDeviceDesktop size={16} />
                      <span>跟随系统</span>
                    </Group>
                  ),
                },
              ]}
            />
          </div>
        </Stack>
      </Box>
    </Drawer>
  );
}
