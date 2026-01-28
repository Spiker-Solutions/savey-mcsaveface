"use client";

import {
  Card,
  Text,
  Group,
  Progress,
  ThemeIcon,
  Badge,
  Tooltip,
  ActionIcon,
  Menu,
} from "@mantine/core";
import { MoreVertical, Trash2, Edit } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { formatMoney, formatPercentage } from "@/lib/format";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  allocationMethod: string;
  allocationValue: number;
}

interface Budget {
  totalAmount: number;
  currency: string;
  locale: string;
}

interface CategoryCardProps {
  category: Category;
  budget: Budget;
  spent: number;
  remainingAllocation?: number;
  canEdit: boolean;
  isOwner?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

export function CategoryCard({
  category,
  budget,
  spent,
  remainingAllocation = 0,
  canEdit,
  isOwner,
  onClick,
  onDelete,
}: CategoryCardProps) {
  // Calculate allocated amount based on allocation method
  const allocated =
    category.allocationMethod === "PERCENTAGE"
      ? Math.round((category.allocationValue / 10000) * budget.totalAmount)
      : category.allocationMethod === "REMAINING"
        ? remainingAllocation // Budget minus other categories' allocations
        : category.allocationValue; // FIXED

  const remaining = allocated - spent;
  const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0;

  // Get icon component
  const IconComponent = category.icon
    ? (
        LucideIcons as unknown as Record<
          string,
          React.ComponentType<{ size?: number }>
        >
      )[category.icon] || LucideIcons.Folder
    : LucideIcons.Folder;

  const getAllocationLabel = () => {
    switch (category.allocationMethod) {
      case "PERCENTAGE":
        return formatPercentage(category.allocationValue, budget.locale);
      case "REMAINING":
        return "Remaining";
      default:
        return formatMoney(
          category.allocationValue,
          budget.currency,
          budget.locale,
        );
    }
  };

  return (
    <Card
      withBorder
      padding="lg"
      radius="md"
      style={{ cursor: onClick ? "pointer" : undefined }}
      onClick={onClick}
    >
      <Group justify="space-between" mb="xs">
        <Group gap="sm">
          <ThemeIcon
            size={32}
            radius="md"
            variant="light"
            style={{
              backgroundColor: category.color
                ? `${category.color}20`
                : undefined,
            }}
            color={category.color || "blue"}
          >
            <IconComponent size={18} />
          </ThemeIcon>
          <div>
            <Text fw={500}>{category.name}</Text>
            <Text size="xs" c="dimmed">
              {getAllocationLabel()}
            </Text>
          </div>
        </Group>
        <Group gap="xs">
          {category.allocationMethod === "REMAINING" && (
            <Tooltip label="This category receives leftover funds">
              <Badge variant="outline" size="sm">
                Flex
              </Badge>
            </Tooltip>
          )}
          {isOwner && (
            <Menu shadow="md" width={150} position="bottom-end">
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                <Menu.Item
                  color="red"
                  leftSection={<Trash2 size={14} />}
                  onClick={onDelete}
                >
                  Delete
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Group>

      {category.allocationMethod !== "REMAINING" && (
        <>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed">
              Spent
            </Text>
            <Text size="sm" fw={500}>
              {formatMoney(spent, budget.currency, budget.locale)}
            </Text>
          </Group>

          <Progress
            value={Math.min(percentUsed, 100)}
            size="sm"
            radius="xl"
            color={
              percentUsed > 100
                ? "red"
                : percentUsed > 80
                  ? "orange"
                  : category.color || "blue"
            }
            mb="xs"
          />

          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Remaining
            </Text>
            <Text size="xs" c={remaining < 0 ? "red" : "dimmed"} fw={500}>
              {formatMoney(remaining, budget.currency, budget.locale)}
            </Text>
          </Group>
        </>
      )}

      {category.allocationMethod === "REMAINING" && (
        <>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed">
              Spent
            </Text>
            <Text size="sm" fw={500}>
              {formatMoney(spent, budget.currency, budget.locale)}
            </Text>
          </Group>

          <Progress
            value={allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0}
            size="sm"
            radius="xl"
            color={
              spent > allocated
                ? "red"
                : spent > allocated * 0.8
                  ? "orange"
                  : category.color || "blue"
            }
            mb="xs"
          />

          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Remaining
            </Text>
            <Text size="xs" c={remaining < 0 ? "red" : "dimmed"} fw={500}>
              {formatMoney(remaining, budget.currency, budget.locale)}
            </Text>
          </Group>
        </>
      )}
    </Card>
  );
}
