"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  Group,
  Badge,
  Button,
  Stack,
  Progress,
  ThemeIcon,
  Paper,
} from "@mantine/core";
import { Plus, PiggyBank, Users, TrendingUp, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { useUIStore } from "@/stores/ui-store";
import { CreateBudgetModal } from "@/components/budgets/CreateBudgetModal";

interface Budget {
  id: string;
  name: string;
  totalAmount: number;
  currency: string;
  locale: string;
  members: { user: { name: string | null; email: string } }[];
  categories: { id: string }[];
  _count: { expenses: number };
}

interface DashboardContentProps {
  budgets: Budget[];
}

export function DashboardContent({ budgets }: DashboardContentProps) {
  const router = useRouter();
  const { isCreateBudgetModalOpen, setCreateBudgetModalOpen } = useUIStore();

  const totalBudgetAmount = budgets.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalExpenses = budgets.reduce((sum, b) => sum + b._count.expenses, 0);
  const totalCollaborators = new Set(
    budgets.flatMap((b) => b.members.map((m) => m.user.email)),
  ).size;

  return (
    <Container size="lg" py="md">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Dashboard</Title>
          <Text c="dimmed" size="sm">
            Overview of your budgets and spending
          </Text>
        </div>
        <Button
          leftSection={<Plus size={16} />}
          onClick={() => setCreateBudgetModalOpen(true)}
        >
          New Budget
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <StatsCard
          title="Total Budgets"
          value={budgets.length.toString()}
          icon={<PiggyBank size={20} />}
          color="blue"
        />
        <StatsCard
          title="Total Budget Amount"
          value={formatMoney(totalBudgetAmount, "USD")}
          icon={<Wallet size={20} />}
          color="green"
        />
        <StatsCard
          title="Total Expenses"
          value={totalExpenses.toString()}
          icon={<TrendingUp size={20} />}
          color="orange"
        />
        <StatsCard
          title="Collaborators"
          value={totalCollaborators.toString()}
          icon={<Users size={20} />}
          color="violet"
        />
      </SimpleGrid>

      <Title order={3} mb="md">
        Your Budgets
      </Title>

      {budgets.length === 0 ? (
        <Paper withBorder p="xl" ta="center">
          <ThemeIcon size={48} radius="xl" mb="md" variant="light">
            <PiggyBank size={24} />
          </ThemeIcon>
          <Title order={4} mb="xs">
            No budgets yet
          </Title>
          <Text c="dimmed" mb="md">
            Create your first budget to start tracking your expenses
          </Text>
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => setCreateBudgetModalOpen(true)}
          >
            Create Budget
          </Button>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {budgets.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} />
          ))}
        </SimpleGrid>
      )}

      <CreateBudgetModal
        opened={isCreateBudgetModalOpen}
        onClose={() => setCreateBudgetModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </Container>
  );
}

function StatsCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text fw={700} size="xl">
            {value}
          </Text>
        </div>
        <ThemeIcon color={color} variant="light" size={38} radius="md">
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

function BudgetCard({ budget }: { budget: Budget }) {
  return (
    <Card
      withBorder
      padding="lg"
      radius="md"
      component={Link}
      href={`/dashboard/budgets/${budget.id}`}
    >
      <Group justify="space-between" mb="xs">
        <Text fw={500}>{budget.name}</Text>
        <Badge variant="light">{budget.members.length} members</Badge>
      </Group>

      <Text size="xl" fw={700} mb="xs">
        {formatMoney(budget.totalAmount, budget.currency, budget.locale)}
      </Text>

      <Group gap="xs" mb="md">
        <Badge variant="outline" size="sm">
          {budget.categories.length} categories
        </Badge>
        <Badge variant="outline" size="sm">
          {budget._count.expenses} expenses
        </Badge>
      </Group>

      <Progress value={0} size="sm" radius="xl" />
      <Text size="xs" c="dimmed" mt="xs">
        No expenses recorded yet
      </Text>
    </Card>
  );
}
