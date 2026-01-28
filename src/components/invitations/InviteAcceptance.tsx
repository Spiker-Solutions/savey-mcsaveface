'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Center,
  ThemeIcon,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Mail, CheckCircle, XCircle, Clock, Users } from 'lucide-react';

interface Invitation {
  id: string;
  token: string;
  email: string;
  role: string;
  expiresAt: Date;
  budget: { id: string; name: string };
  sentBy: { name: string | null; email: string };
}

interface InviteAcceptanceProps {
  invitation: Invitation;
  status: 'pending' | 'expired' | 'already_used' | 'already_member';
  userId?: string;
}

export function InviteAcceptance({ invitation, status, userId }: InviteAcceptanceProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/invitations/${invitation.token}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to accept invitation');
      }

      notifications.show({
        title: 'Invitation accepted',
        message: `You've joined "${invitation.budget.name}"`,
        color: 'green',
      });

      router.push(`/dashboard/budgets/${invitation.budget.id}`);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to accept invitation',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'expired') {
    return (
      <Container size={420} py={80}>
        <Paper withBorder p={30} radius="md">
          <Center mb="md">
            <ThemeIcon size={60} radius="xl" color="orange" variant="light">
              <Clock size={30} />
            </ThemeIcon>
          </Center>
          <Title order={3} ta="center" mb="xs">
            Invitation Expired
          </Title>
          <Text c="dimmed" ta="center" mb="lg">
            This invitation to join &quot;{invitation.budget.name}&quot; has expired.
            Please ask the budget owner to send a new invitation.
          </Text>
          <Button fullWidth onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </Paper>
      </Container>
    );
  }

  if (status === 'already_used') {
    return (
      <Container size={420} py={80}>
        <Paper withBorder p={30} radius="md">
          <Center mb="md">
            <ThemeIcon size={60} radius="xl" color="gray" variant="light">
              <XCircle size={30} />
            </ThemeIcon>
          </Center>
          <Title order={3} ta="center" mb="xs">
            Invitation Already Used
          </Title>
          <Text c="dimmed" ta="center" mb="lg">
            This invitation has already been accepted or revoked.
          </Text>
          <Button fullWidth onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </Paper>
      </Container>
    );
  }

  if (status === 'already_member') {
    return (
      <Container size={420} py={80}>
        <Paper withBorder p={30} radius="md">
          <Center mb="md">
            <ThemeIcon size={60} radius="xl" color="green" variant="light">
              <Users size={30} />
            </ThemeIcon>
          </Center>
          <Title order={3} ta="center" mb="xs">
            Already a Member
          </Title>
          <Text c="dimmed" ta="center" mb="lg">
            You&apos;re already a member of &quot;{invitation.budget.name}&quot;.
          </Text>
          <Button fullWidth onClick={() => router.push(`/dashboard/budgets/${invitation.budget.id}`)}>
            Go to Budget
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size={420} py={80}>
      <Paper withBorder p={30} radius="md">
        <Center mb="md">
          <ThemeIcon size={60} radius="xl" color="blue" variant="light">
            <Mail size={30} />
          </ThemeIcon>
        </Center>
        <Title order={3} ta="center" mb="xs">
          You&apos;re Invited!
        </Title>
        <Text c="dimmed" ta="center" mb="lg">
          <strong>{invitation.sentBy.name || invitation.sentBy.email}</strong> has invited you
          to collaborate on the budget:
        </Text>
        <Alert variant="light" color="blue" mb="lg">
          <Text fw={500} size="lg" ta="center">
            {invitation.budget.name}
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            Role: {invitation.role.charAt(0) + invitation.role.slice(1).toLowerCase()}
          </Text>
        </Alert>
        <Stack>
          <Button fullWidth loading={loading} onClick={handleAccept}>
            Accept Invitation
          </Button>
          <Button variant="subtle" fullWidth onClick={() => router.push('/dashboard')}>
            Decline
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
