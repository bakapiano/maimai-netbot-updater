import { Card, Stack, Text, Title } from "@mantine/core";

export default function HomePage() {
  return (
    <Stack gap="md">
      <Title order={3}>欢迎回来</Title>
      <Card shadow="xs" padding="lg" withBorder>
        <Text c="dimmed" size="sm">
          登录成功后看到的占位页面。后续功能可在这里继续扩展。
        </Text>
      </Card>
    </Stack>
  );
}
