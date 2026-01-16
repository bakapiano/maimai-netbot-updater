import { Avatar, Group, Menu, Text, UnstyledButton } from "@mantine/core";

import { IconLogout } from "@tabler/icons-react";
import { normalizeMaimaiImgUrl } from "../utils/maimaiImages";

export type MiniProfile = {
  avatarUrl: string | null;
  username: string | null;
};

type Props = {
  profile: MiniProfile | null;
};

type HeaderProps = Props & {
  onLogout?: () => void;
};

// Compact version for header with dropdown menu
export function HeaderProfileCard({ profile, onLogout }: HeaderProps) {
  if (!profile) {
    return null;
  }

  return (
    <Menu shadow="md" width={160} position="bottom-end">
      <Menu.Target>
        <UnstyledButton>
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" fw={500} lineClamp={1} style={{ maxWidth: 120 }}>
              {profile.username ?? "未知用户"}
            </Text>
            <Avatar
              src={
                profile.avatarUrl
                  ? normalizeMaimaiImgUrl(profile.avatarUrl)
                  : null
              }
              alt={profile.username ?? "avatar"}
              size={42}
              radius="0"
              imageProps={{ referrerPolicy: "no-referrer" }}
            />
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          color="red"
          leftSection={<IconLogout size={16} />}
          onClick={onLogout}
        >
          退出登录
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
