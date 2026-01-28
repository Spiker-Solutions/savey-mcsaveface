'use client';

import { useState } from 'react';
import {
  Modal,
  TextInput,
  Select,
  NumberInput,
  Button,
  Stack,
  Group,
  Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

interface InviteModalProps {
  opened: boolean;
  onClose: () => void;
  budgetId: string;
  budgetName: string;
}

export function InviteModal({ opened, onClose, budgetId, budgetName }: InviteModalProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
      role: 'EDITOR',
      expiresInDays: 3,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/budgets/${budgetId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to send invitation');
      }

      notifications.show({
        title: 'Invitation sent',
        message: `An invitation has been sent to ${values.email}`,
        color: 'green',
      });

      form.reset();
      onClose();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to send invitation',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Invite to Budget" size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Text size="sm" c="dimmed">
            Invite someone to collaborate on <strong>{budgetName}</strong>
          </Text>

          <TextInput
            label="Email Address"
            placeholder="colleague@example.com"
            required
            {...form.getInputProps('email')}
          />

          <Select
            label="Role"
            description="Choose the level of access for this user"
            data={[
              { value: 'EDITOR', label: 'Editor - Can add and edit expenses' },
              { value: 'VIEWER', label: 'Viewer - Can only view the budget' },
            ]}
            {...form.getInputProps('role')}
          />

          <NumberInput
            label="Expires In (days)"
            description="How long the invitation will be valid"
            min={1}
            max={30}
            {...form.getInputProps('expiresInDays')}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Send Invitation
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
