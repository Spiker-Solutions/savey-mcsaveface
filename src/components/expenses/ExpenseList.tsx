"use client";

import { useState, useEffect } from "react";
import {
  Paper,
  Text,
  Group,
  Badge,
  Stack,
  ActionIcon,
  Menu,
  Skeleton,
  Center,
  Button,
  Select,
  NumberInput,
  Collapse,
  Grid,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { Filter, X } from "lucide-react";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { MoreVertical, Trash2, Edit, Receipt } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/format";

interface Expense {
  id: string;
  amount: number;
  date: string;
  description: string | null;
  payee: { id: string; name: string } | null;
  splits: { category: { id: string; name: string; color: string | null } }[];
  tags: { tag: { id: string; name: string; color: string | null } }[];
  createdBy: { id: string; name: string | null; email: string };
}

interface Budget {
  currency: string;
  locale: string;
  allowDeleteOwnOnly: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Payee {
  id: string;
  name: string;
}

interface Member {
  user: { id: string; name: string | null; email: string };
  role: string;
}

interface ExpenseListProps {
  budgetId: string;
  budget: Budget;
  canEdit: boolean;
  userId: string;
  refreshTrigger?: number;
  categoryFilter?: string | null;
  onEditExpense?: (expense: Expense) => void;
  showCreator?: boolean;
  cycleStart?: string;
  cycleEnd?: string;
  categories?: Category[];
  payees?: Payee[];
  members?: Member[];
}

export function ExpenseList({
  budgetId,
  budget,
  canEdit,
  userId,
  refreshTrigger,
  categoryFilter,
  onEditExpense,
  showCreator = false,
  cycleStart,
  cycleEnd,
  categories = [],
  payees = [],
  members = [],
}: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filterCategory, setFilterCategory] = useState<string | null>(
    categoryFilter || null,
  );
  const [filterPayee, setFilterPayee] = useState<string | null>(null);
  const [filterCreator, setFilterCreator] = useState<string | null>(null);
  const [filterDateStart, setFilterDateStart] = useState<Date | null>(null);
  const [filterDateEnd, setFilterDateEnd] = useState<Date | null>(null);
  const [filterMinAmount, setFilterMinAmount] = useState<number | string>("");
  const [filterMaxAmount, setFilterMaxAmount] = useState<number | string>("");

  // Sync external categoryFilter with internal state
  useEffect(() => {
    setFilterCategory(categoryFilter || null);
  }, [categoryFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [
    budgetId,
    refreshTrigger,
    filterCategory,
    filterPayee,
    filterCreator,
    filterDateStart,
    filterDateEnd,
    filterMinAmount,
    filterMaxAmount,
  ]);

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set("categoryId", filterCategory);
      if (filterPayee) params.set("payeeId", filterPayee);
      if (filterCreator) params.set("createdById", filterCreator);
      if (filterDateStart)
        params.set("dateStart", filterDateStart.toISOString());
      if (filterDateEnd) params.set("dateEnd", filterDateEnd.toISOString());
      if (filterMinAmount)
        params.set("minAmount", String(Number(filterMinAmount) * 100));
      if (filterMaxAmount)
        params.set("maxAmount", String(Number(filterMaxAmount) * 100));
      const url = `/api/budgets/${budgetId}/expenses${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    modals.openConfirmModal({
      title: "Delete Expense",
      children: (
        <Text size="sm">
          Are you sure you want to delete this expense of{" "}
          <strong>
            {formatMoney(expense.amount, budget.currency, budget.locale)}
          </strong>
          {expense.payee && ` from ${expense.payee.name}`}? This action cannot
          be undone.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          const response = await fetch(
            `/api/budgets/${budgetId}/expenses/${expense.id}`,
            { method: "DELETE" },
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Failed to delete expense");
          }

          notifications.show({
            title: "Expense deleted",
            message: "The expense has been removed",
            color: "green",
          });

          fetchExpenses();
        } catch (error) {
          notifications.show({
            title: "Error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to delete expense",
            color: "red",
          });
        }
      },
    });
  };

  const canDeleteExpense = (expense: Expense) => {
    if (!canEdit) return false;
    if (!budget.allowDeleteOwnOnly) return true;
    return expense.createdBy.id === userId;
  };

  if (loading) {
    return (
      <Stack gap="sm">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={80} radius="md" />
        ))}
      </Stack>
    );
  }

  const clearFilters = () => {
    setFilterCategory(null);
    setFilterPayee(null);
    setFilterCreator(null);
    setFilterDateStart(null);
    setFilterDateEnd(null);
    setFilterMinAmount("");
    setFilterMaxAmount("");
  };

  const hasActiveFilters =
    filterCategory ||
    filterPayee ||
    filterCreator ||
    filterDateStart ||
    filterDateEnd ||
    filterMinAmount ||
    filterMaxAmount;

  const cycleStartDate = cycleStart ? new Date(cycleStart) : undefined;
  const cycleEndDate = cycleEnd ? new Date(cycleEnd) : undefined;

  const filterUI = (
    <Paper withBorder p="md" mb="md">
      <Group justify="space-between" mb="sm">
        <Text fw={500} size="sm">
          Filters
        </Text>
        {hasActiveFilters && (
          <Button
            variant="subtle"
            size="xs"
            leftSection={<X size={14} />}
            onClick={clearFilters}
          >
            Clear all
          </Button>
        )}
      </Group>
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Select
            label="Category"
            placeholder="All categories"
            clearable
            data={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={filterCategory}
            onChange={setFilterCategory}
            size="sm"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Select
            label="Payee"
            placeholder="All payees"
            clearable
            searchable
            data={payees.map((p) => ({ value: p.id, label: p.name }))}
            value={filterPayee}
            onChange={setFilterPayee}
            size="sm"
          />
        </Grid.Col>
        {members.length > 1 && (
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Select
              label="Added by"
              placeholder="Anyone"
              clearable
              data={members.map((m) => ({
                value: m.user.id,
                label: m.user.name || m.user.email,
              }))}
              value={filterCreator}
              onChange={setFilterCreator}
              size="sm"
            />
          </Grid.Col>
        )}
        <Grid.Col span={{ base: 6, sm: 6, md: 3 }}>
          <DatePickerInput
            label="From date"
            placeholder="Start"
            clearable
            value={filterDateStart}
            onChange={setFilterDateStart}
            minDate={cycleStartDate}
            maxDate={filterDateEnd || cycleEndDate}
            size="sm"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 6, md: 3 }}>
          <DatePickerInput
            label="To date"
            placeholder="End"
            clearable
            value={filterDateEnd}
            onChange={setFilterDateEnd}
            minDate={filterDateStart || cycleStartDate}
            maxDate={cycleEndDate}
            size="sm"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 6, md: 3 }}>
          <NumberInput
            label="Min amount"
            placeholder="0.00"
            min={0}
            decimalScale={2}
            value={filterMinAmount}
            onChange={setFilterMinAmount}
            size="sm"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 6, sm: 6, md: 3 }}>
          <NumberInput
            label="Max amount"
            placeholder="0.00"
            min={0}
            decimalScale={2}
            value={filterMaxAmount}
            onChange={setFilterMaxAmount}
            size="sm"
          />
        </Grid.Col>
      </Grid>
    </Paper>
  );

  if (expenses.length === 0 && !hasActiveFilters) {
    return (
      <>
        <Group mb="md">
          <Button
            variant={showFilters ? "light" : "subtle"}
            leftSection={<Filter size={16} />}
            onClick={() => setShowFilters(!showFilters)}
            size="sm"
          >
            Filters
          </Button>
        </Group>
        <Collapse in={showFilters}>{filterUI}</Collapse>
        <Paper withBorder p="xl" ta="center">
          <Receipt size={48} color="var(--mantine-color-dimmed)" />
          <Text c="dimmed" mt="md">
            No expenses recorded yet
          </Text>
        </Paper>
      </>
    );
  }

  return (
    <Stack gap="sm">
      <Group>
        <Button
          variant={showFilters ? "light" : "subtle"}
          leftSection={<Filter size={16} />}
          onClick={() => setShowFilters(!showFilters)}
          size="sm"
        >
          Filters {hasActiveFilters && `(active)`}
        </Button>
      </Group>
      <Collapse in={showFilters}>{filterUI}</Collapse>
      {expenses.length === 0 && hasActiveFilters ? (
        <Paper withBorder p="xl" ta="center">
          <Text c="dimmed">No expenses match the current filters</Text>
          <Button variant="subtle" mt="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </Paper>
      ) : (
        <>
          {expenses.map((expense) => (
            <Paper key={expense.id} withBorder p="md" radius="md">
              <Group justify="space-between" wrap="nowrap">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Group gap="xs" mb={4}>
                    <Text fw={500} truncate>
                      {expense.payee?.name || "No payee"}
                    </Text>
                    {expense.splits.map((split, i) => (
                      <Badge
                        key={i}
                        size="sm"
                        variant="light"
                        color={split.category.color || "blue"}
                      >
                        {split.category.name}
                      </Badge>
                    ))}
                  </Group>
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      {formatDate(expense.date, budget.locale)}
                    </Text>
                    {expense.description && (
                      <Text size="sm" c="dimmed" truncate>
                        • {expense.description}
                      </Text>
                    )}
                    {showCreator && (
                      <Text size="sm" c="dimmed">
                        • {expense.createdBy.name || expense.createdBy.email}
                      </Text>
                    )}
                  </Group>
                  {expense.tags.length > 0 && (
                    <Group gap={4} mt={4}>
                      {expense.tags.map((t) => (
                        <Badge
                          key={t.tag.name}
                          size="xs"
                          variant="outline"
                          color={t.tag.color || "gray"}
                        >
                          {t.tag.name}
                        </Badge>
                      ))}
                    </Group>
                  )}
                </div>
                <Group gap="sm" wrap="nowrap">
                  <Text fw={600} size="lg">
                    {formatMoney(
                      expense.amount,
                      budget.currency,
                      budget.locale,
                    )}
                  </Text>
                  {canEdit && (
                    <Menu shadow="md" width={150}>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray">
                          <MoreVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<Edit size={14} />}
                          onClick={() => onEditExpense?.(expense)}
                        >
                          Edit
                        </Menu.Item>
                        {canDeleteExpense(expense) && (
                          <Menu.Item
                            color="red"
                            leftSection={<Trash2 size={14} />}
                            onClick={() => handleDelete(expense)}
                          >
                            Delete
                          </Menu.Item>
                        )}
                      </Menu.Dropdown>
                    </Menu>
                  )}
                </Group>
              </Group>
            </Paper>
          ))}
          {total > expenses.length && (
            <Center>
              <Button variant="subtle" onClick={() => {}}>
                Load more ({total - expenses.length} remaining)
              </Button>
            </Center>
          )}
        </>
      )}
    </Stack>
  );
}
