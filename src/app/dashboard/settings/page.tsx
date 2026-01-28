'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Select,
  Button,
  Group,
  Divider,
} from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function SettingsPage() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [saving, setSaving] = useState(false);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'auto', label: 'System', icon: Monitor },
  ];

  return (
    <Container size="sm" py="md">
      <Title order={2} mb="xl">
        Settings
      </Title>

      <Stack gap="lg">
        <Paper withBorder p="lg" radius="md">
          <Title order={4} mb="md">
            Appearance
          </Title>
          <Select
            label="Theme"
            description="Choose your preferred color scheme"
            value={colorScheme}
            onChange={(value) => setColorScheme(value as 'light' | 'dark' | 'auto')}
            data={themeOptions.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
          />
        </Paper>

        <Paper withBorder p="lg" radius="md">
          <Title order={4} mb="md">
            Account
          </Title>
          <Text size="sm" c="dimmed" mb="md">
            Manage your account settings and preferences.
          </Text>
          <Stack gap="sm">
            <Group justify="space-between">
              <div>
                <Text fw={500}>Email Notifications</Text>
                <Text size="sm" c="dimmed">
                  Receive email updates about your budgets
                </Text>
              </div>
              <Button variant="light" size="xs">
                Coming Soon
              </Button>
            </Group>
            <Divider />
            <Group justify="space-between">
              <div>
                <Text fw={500}>Export Data</Text>
                <Text size="sm" c="dimmed">
                  Download your budget data as CSV
                </Text>
              </div>
              <Button variant="light" size="xs">
                Coming Soon
              </Button>
            </Group>
          </Stack>
        </Paper>

        <Paper withBorder p="lg" radius="md">
          <Title order={4} mb="md" c="red">
            Danger Zone
          </Title>
          <Text size="sm" c="dimmed" mb="md">
            Irreversible actions that affect your account.
          </Text>
          <Button variant="outline" color="red" disabled>
            Delete Account
          </Button>
        </Paper>
      </Stack>
    </Container>
  );
}
