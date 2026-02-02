"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Container,
  Title,
  Text,
  Group,
  Button,
  Card,
  SimpleGrid,
  Progress,
  Badge,
  Stack,
  Paper,
  ThemeIcon,
  ActionIcon,
  Menu,
  Tabs,
  Skeleton,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  Plus,
  Settings,
  Users,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Wallet,
  History,
  Trash2,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { CycleNavigator } from "@/components/budgets/CycleNavigator";
import { useUIStore } from "@/stores/ui-store";
import { CreateCategoryModal } from "@/components/categories/CreateCategoryModal";
import { CreateExpenseModal } from "@/components/expenses/CreateExpenseModal";
import { EditExpenseModal } from "@/components/expenses/EditExpenseModal";
import { InviteModal } from "@/components/invitations/InviteModal";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { CategoryCard } from "@/components/categories/CategoryCard";
import { DeleteCategoryModal } from "@/components/categories/DeleteCategoryModal";
import { EditCategoryModal } from "@/components/categories/EditCategoryModal";
import { AddSnapshotCategoryModal } from "@/components/categories/AddSnapshotCategoryModal";
import { DeletePayeeModal } from "@/components/payees/DeletePayeeModal";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  allocationMethod: string;
  allocationValue: number;
  carryOverEnabled: boolean | null;
  editableByAll: boolean;
}

interface Budget {
  id: string;
  name: string;
  description: string | null;
  totalAmount: number;
  currency: string;
  locale: string;
  cycleType: string;
  carryOverEnabled: boolean;
  allowDeleteOwnOnly: boolean;
  members: {
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
    role: string;
  }[];
  categories: Category[];
  payees: { id: string; name: string }[];
  tags: { id: string; name: string; color: string | null }[];
}

interface SnapshotCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  allocationMethod: string;
  allocationValue: number;
  sortOrder: number;
}

interface CycleSnapshot {
  budgetTotal: number;
  currency: string;
  locale: string;
  categories: SnapshotCategory[];
  totalSpent: number;
  categoryTotals: Record<string, number>;
}

interface CycleData {
  cycle: { id: string; startDate: string; endDate: string };
  categoryTotals: Record<string, number>;
  totalSpent: number;
  isCurrentCycle: boolean;
  snapshot?: CycleSnapshot;
}

interface BudgetDetailProps {
  budget: Budget;
  userRole: string;
  userId: string;
}

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

export function BudgetDetail({ budget, userRole, userId }: BudgetDetailProps) {
  const [cycleData, setCycleData] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenseRefreshKey, setExpenseRefreshKey] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newPayeeName, setNewPayeeName] = useState("");
  const [addingPayee, setAddingPayee] = useState(false);
  const [deletingPayee, setDeletingPayee] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>("categories");
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [isAddSnapshotCategoryOpen, setAddSnapshotCategoryOpen] =
    useState(false);
  const router = useRouter();
  const {
    isCreateCategoryModalOpen,
    setCreateCategoryModalOpen,
    isCreateExpenseModalOpen,
    setCreateExpenseModalOpen,
    isInviteModalOpen,
    setInviteModalOpen,
  } = useUIStore();

  useEffect(() => {
    fetchCycleData();
  }, [budget.id, selectedCycleId]);

  const fetchCycleData = async () => {
    setLoading(true);
    try {
      const url = selectedCycleId
        ? `/api/budgets/${budget.id}/cycles?cycleId=${selectedCycleId}`
        : `/api/budgets/${budget.id}/cycles`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCycleData(data);
      }
    } catch (error) {
      console.error("Error fetching cycle data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCycleChange = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setCategoryFilter(null); // Reset filter when changing cycles
  };

  const handleExpenseCreated = () => {
    fetchCycleData();
    setExpenseRefreshKey((k) => k + 1);
  };

  const handleCategoryClick = (categoryId: string) => {
    setCategoryFilter(categoryId);
    setActiveTab("expenses"); // Switch to expenses tab
  };

  const clearCategoryFilter = () => {
    setCategoryFilter(null);
  };

  const handleAddPayee = async () => {
    if (!newPayeeName.trim()) return;
    setAddingPayee(true);
    try {
      const response = await fetch(`/api/budgets/${budget.id}/payees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPayeeName.trim() }),
      });
      if (response.ok) {
        setNewPayeeName("");
        router.refresh();
      }
    } catch (error) {
      console.error("Error adding payee:", error);
    } finally {
      setAddingPayee(false);
    }
  };

  const isOwner = userRole === "OWNER";
  const canEdit = userRole !== "VIEWER";
  const hasMultipleMembers = budget.members.length > 1;
  const isCurrentCycle = cycleData?.isCurrentCycle ?? true;

  // Use snapshot data for past cycles, current budget data for current cycle
  const displayBudgetTotal =
    cycleData?.snapshot?.budgetTotal ?? budget.totalAmount;
  const displayCurrency = cycleData?.snapshot?.currency ?? budget.currency;
  const displayLocale = cycleData?.snapshot?.locale ?? budget.locale;
  const remaining = displayBudgetTotal - (cycleData?.totalSpent || 0);

  // Get categories - use snapshot for past cycles, current categories for current cycle
  const categoriesToDisplay: Category[] = isCurrentCycle
    ? budget.categories
    : (cycleData?.snapshot?.categories ?? budget.categories).map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        allocationMethod: c.allocationMethod,
        allocationValue: c.allocationValue,
        carryOverEnabled: (c as Category).carryOverEnabled ?? null,
        editableByAll: (c as Category).editableByAll ?? true,
      }));

  // Sort categories so REMAINING is always last
  const sortedCategories = [...categoriesToDisplay].sort((a, b) => {
    if (
      a.allocationMethod === "REMAINING" &&
      b.allocationMethod !== "REMAINING"
    )
      return 1;
    if (
      a.allocationMethod !== "REMAINING" &&
      b.allocationMethod === "REMAINING"
    )
      return -1;
    return 0;
  });

  // Calculate the remaining allocation for REMAINING category type
  // This is budget total minus all other categories' allocations
  const otherCategoriesAllocation = categoriesToDisplay
    .filter((c) => c.allocationMethod !== "REMAINING")
    .reduce((sum, c) => {
      if (c.allocationMethod === "PERCENTAGE") {
        return (
          sum + Math.round((c.allocationValue / 10000) * displayBudgetTotal)
        );
      }
      return sum + c.allocationValue; // FIXED
    }, 0);
  const remainingAllocation = Math.max(
    0,
    displayBudgetTotal - otherCategoriesAllocation,
  );

  const percentUsed =
    displayBudgetTotal > 0
      ? ((cycleData?.totalSpent || 0) / displayBudgetTotal) * 100
      : 0;

  return (
    <Container size="lg" py="md">
      {/* Historical Cycle Banner */}
      {!isCurrentCycle && (
        <Paper
          withBorder
          p="sm"
          mb="md"
          bg="yellow.0"
          style={{ borderColor: "var(--mantine-color-yellow-4)" }}
        >
          <Group gap="xs">
            <History size={16} color="var(--mantine-color-yellow-8)" />
            <Text size="sm" c="yellow.8" fw={500}>
              Viewing historical cycle data. Categories and budget shown are
              from when this cycle ended.
            </Text>
            <Button
              size="xs"
              variant="light"
              color="yellow"
              ml="auto"
              onClick={() => setSelectedCycleId(null)}
            >
              Return to Current Cycle
            </Button>
          </Group>
        </Paper>
      )}

      <Group justify="space-between" mb="xl" wrap="wrap">
        <div>
          <Group gap="sm" mb={4}>
            <Title order={2}>{budget.name}</Title>
            <Badge variant="light">
              {budget.cycleType.charAt(0) +
                budget.cycleType.slice(1).toLowerCase()}
            </Badge>
          </Group>
          {cycleData && (
            <CycleNavigator
              budgetId={budget.id}
              currentCycleId={cycleData.cycle.id}
              cycleStartDate={cycleData.cycle.startDate}
              cycleEndDate={cycleData.cycle.endDate}
              isCurrentCycle={cycleData.isCurrentCycle}
              locale={displayLocale}
              onCycleChange={handleCycleChange}
            />
          )}
        </div>
        <Group gap="sm">
          {canEdit && isCurrentCycle && (
            <>
              <Button
                variant="light"
                leftSection={<Plus size={16} />}
                onClick={() => setCreateExpenseModalOpen(true)}
              >
                Add Expense
              </Button>
              <Button
                variant="light"
                leftSection={<Plus size={16} />}
                onClick={() => setCreateCategoryModalOpen(true)}
              >
                Add Category
              </Button>
            </>
          )}
          {canEdit && !isCurrentCycle && cycleData?.snapshot && (
            <Button
              variant="light"
              leftSection={<Plus size={16} />}
              onClick={() => setAddSnapshotCategoryOpen(true)}
            >
              Add Category to Cycle
            </Button>
          )}
          {isOwner && (
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="default" size="lg">
                  <MoreVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<Users size={14} />}
                  onClick={() => setInviteModalOpen(true)}
                >
                  Invite Members
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  href={`/dashboard/budgets/${budget.id}/settings`}
                  leftSection={<Settings size={14} />}
                >
                  Budget Settings
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>

      {/* Budget Overview */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Budget
              </Text>
              <Text fw={700} size="xl">
                {formatMoney(
                  displayBudgetTotal,
                  displayCurrency,
                  displayLocale,
                )}
              </Text>
            </div>
            <ThemeIcon color="blue" variant="light" size={38} radius="md">
              <Wallet size={20} />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Spent
              </Text>
              {loading ? (
                <Skeleton height={28} width={100} />
              ) : (
                <Text fw={700} size="xl">
                  {formatMoney(
                    cycleData?.totalSpent || 0,
                    displayCurrency,
                    displayLocale,
                  )}
                </Text>
              )}
            </div>
            <ThemeIcon color="orange" variant="light" size={38} radius="md">
              <TrendingUp size={20} />
            </ThemeIcon>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Remaining
              </Text>
              {loading ? (
                <Skeleton height={28} width={100} />
              ) : (
                <Text fw={700} size="xl" c={remaining < 0 ? "red" : undefined}>
                  {formatMoney(remaining, displayCurrency, displayLocale)}
                </Text>
              )}
            </div>
            <ThemeIcon
              color={remaining < 0 ? "red" : "green"}
              variant="light"
              size={38}
              radius="md"
            >
              {remaining < 0 ? (
                <TrendingDown size={20} />
              ) : (
                <TrendingUp size={20} />
              )}
            </ThemeIcon>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Progress Bar */}
      <Paper withBorder p="md" radius="md" mb="xl">
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>
            Budget Usage
          </Text>
          <Text size="sm" c="dimmed">
            {percentUsed.toFixed(1)}%
          </Text>
        </Group>
        <Progress
          value={Math.min(percentUsed, 100)}
          size="lg"
          radius="xl"
          color={
            percentUsed > 100 ? "red" : percentUsed > 80 ? "orange" : "blue"
          }
        />
        {percentUsed > 100 && (
          <Text size="xs" c="red" mt="xs">
            Over budget by{" "}
            {formatMoney(Math.abs(remaining), displayCurrency, displayLocale)}
          </Text>
        )}
      </Paper>

      {/* Tabs for Categories and Expenses */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="categories">
            Categories ({sortedCategories.length})
          </Tabs.Tab>
          <Tabs.Tab value="expenses">Expenses</Tabs.Tab>
          <Tabs.Tab value="payees">Payees ({budget.payees.length})</Tabs.Tab>
          <Tabs.Tab value="members">Members ({budget.members.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="categories">
          {sortedCategories.length === 0 ? (
            <Paper withBorder p="xl" ta="center">
              <Text c="dimmed" mb="md">
                No categories yet. Create your first category to start
                organizing your budget.
              </Text>
              {canEdit && (
                <Button
                  leftSection={<Plus size={16} />}
                  onClick={() => setCreateCategoryModalOpen(true)}
                >
                  Create Category
                </Button>
              )}
            </Paper>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              {sortedCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  budget={budget}
                  spent={cycleData?.categoryTotals[category.id] || 0}
                  remainingAllocation={remainingAllocation}
                  canEdit={canEdit}
                  isOwner={isOwner}
                  onClick={() => handleCategoryClick(category.id)}
                  onEdit={() => setEditingCategory(category)}
                  onDelete={() =>
                    setDeletingCategory({
                      id: category.id,
                      name: category.name,
                    })
                  }
                />
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="expenses">
          {categoryFilter && (
            <Group mb="md">
              <Badge
                size="lg"
                variant="light"
                rightSection={
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    onClick={clearCategoryFilter}
                  >
                    ×
                  </ActionIcon>
                }
              >
                Filtered:{" "}
                {sortedCategories.find((c) => c.id === categoryFilter)?.name}
              </Badge>
            </Group>
          )}
          <ExpenseList
            budgetId={budget.id}
            budget={budget}
            canEdit={canEdit}
            userId={userId}
            refreshTrigger={expenseRefreshKey}
            categoryFilter={categoryFilter}
            onEditExpense={setEditingExpense}
            showCreator={hasMultipleMembers}
            cycleStart={cycleData?.cycle.startDate}
            cycleEnd={cycleData?.cycle.endDate}
            categories={budget.categories}
            payees={budget.payees}
            members={budget.members}
          />
        </Tabs.Panel>

        <Tabs.Panel value="payees">
          <Stack gap="md">
            {canEdit && (
              <Group>
                <TextInput
                  placeholder="New payee name"
                  value={newPayeeName}
                  onChange={(e) => setNewPayeeName(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPayee()}
                  style={{ flex: 1 }}
                />
                <Button
                  onClick={handleAddPayee}
                  loading={addingPayee}
                  disabled={!newPayeeName.trim()}
                >
                  Add Payee
                </Button>
              </Group>
            )}
            {budget.payees.length === 0 ? (
              <Paper withBorder p="xl" ta="center">
                <Text c="dimmed">
                  No payees yet. Add a payee above to get started.
                </Text>
              </Paper>
            ) : (
              <Stack gap="sm">
                {budget.payees.map((payee) => (
                  <Paper key={payee.id} withBorder p="md" radius="md">
                    <Group justify="space-between">
                      <Text fw={500}>{payee.name}</Text>
                      {isOwner && (
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() =>
                            setDeletingPayee({ id: payee.id, name: payee.name })
                          }
                        >
                          <Trash2 size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="members">
          <Stack gap="sm">
            {budget.members.map((member) => (
              <Paper key={member.user.id} withBorder p="md" radius="md">
                <Group justify="space-between">
                  <Group>
                    <div>
                      <Text fw={500}>
                        {member.user.name || member.user.email}
                      </Text>
                      {member.user.name && (
                        <Text size="xs" c="dimmed">
                          {member.user.email}
                        </Text>
                      )}
                    </div>
                  </Group>
                  <Badge
                    variant="light"
                    color={
                      member.role === "OWNER"
                        ? "blue"
                        : member.role === "EDITOR"
                          ? "green"
                          : "gray"
                    }
                  >
                    {member.role}
                  </Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modals */}
      <CreateCategoryModal
        opened={isCreateCategoryModalOpen}
        onClose={() => setCreateCategoryModalOpen(false)}
        budgetId={budget.id}
        existingCategories={budget.categories}
        onSuccess={fetchCycleData}
      />

      <CreateExpenseModal
        opened={isCreateExpenseModalOpen}
        onClose={() => setCreateExpenseModalOpen(false)}
        budget={budget}
        onSuccess={handleExpenseCreated}
      />

      {editingExpense && (
        <EditExpenseModal
          opened={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          budget={budget}
          expense={editingExpense}
          onSuccess={handleExpenseCreated}
          snapshotCategories={
            !isCurrentCycle && cycleData?.snapshot?.categories
              ? cycleData.snapshot.categories.map((c) => ({
                  id: c.id,
                  name: c.name,
                }))
              : undefined
          }
        />
      )}

      {isOwner && (
        <InviteModal
          opened={isInviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          budgetId={budget.id}
          budgetName={budget.name}
        />
      )}

      {deletingCategory && (
        <DeleteCategoryModal
          opened={!!deletingCategory}
          onClose={() => setDeletingCategory(null)}
          budgetId={budget.id}
          category={deletingCategory}
          otherCategories={budget.categories.filter(
            (c) => c.id !== deletingCategory.id,
          )}
          onSuccess={() => {
            setDeletingCategory(null);
            router.refresh();
            fetchCycleData(); // Refresh category spent amounts
            setExpenseRefreshKey((k) => k + 1); // Refresh expense list
          }}
        />
      )}

      {cycleData && !isCurrentCycle && (
        <AddSnapshotCategoryModal
          opened={isAddSnapshotCategoryOpen}
          onClose={() => setAddSnapshotCategoryOpen(false)}
          budgetId={budget.id}
          cycleId={cycleData.cycle.id}
          onSuccess={fetchCycleData}
        />
      )}

      {editingCategory && (
        <EditCategoryModal
          opened={!!editingCategory}
          onClose={() => setEditingCategory(null)}
          budgetId={budget.id}
          category={editingCategory}
          existingCategories={budget.categories}
          onSuccess={() => {
            setEditingCategory(null);
            router.refresh();
            fetchCycleData();
          }}
        />
      )}

      {deletingPayee && (
        <DeletePayeeModal
          opened={!!deletingPayee}
          onClose={() => setDeletingPayee(null)}
          budgetId={budget.id}
          payee={deletingPayee}
          otherPayees={budget.payees.filter((p) => p.id !== deletingPayee.id)}
          onSuccess={() => {
            setDeletingPayee(null);
            router.refresh();
          }}
        />
      )}
    </Container>
  );
}
