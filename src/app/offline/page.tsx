import { Container, Title, Text, Button, Center, Stack, ThemeIcon } from '@mantine/core';
import { WifiOff } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <Container size="sm" py={80}>
      <Center>
        <Stack align="center" gap="lg">
          <ThemeIcon size={80} radius="xl" color="gray" variant="light">
            <WifiOff size={40} />
          </ThemeIcon>
          <Title order={2} ta="center">
            You&apos;re Offline
          </Title>
          <Text c="dimmed" ta="center" maw={400}>
            It looks like you&apos;ve lost your internet connection. Please check your
            connection and try again.
          </Text>
          <Button component={Link} href="/dashboard" variant="light">
            Try Again
          </Button>
        </Stack>
      </Center>
    </Container>
  );
}
