import { Stack, Text, Title } from "@mantine/core";

interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <Stack gap={4}>
      <Title order={2}>{title}</Title>
      <Text size="sm">{description}</Text>
    </Stack>
  );
}
