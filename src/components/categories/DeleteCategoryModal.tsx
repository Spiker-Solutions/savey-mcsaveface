"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Text,
  Select,
  Button,
  Stack,
  Group,
  Alert,
  Loader,
  Center,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { AlertTriangle } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface DeleteCategoryModalProps {
  opened: boolean;
  onClose: () => void;
  budgetId: string;
  category: Category;
  otherCategories: Category[];
  onSuccess?: () => void;
}

export function DeleteCategoryModal({
  opened,
  onClose,
  budgetId,
  category,
  otherCategories,
  onSuccess,
}: DeleteCategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [checkingExpenses, setCheckingExpenses] = useState(true);
  const [expenseCount, setExpenseCount] = useState(0);
  const [reassignCategoryId, setReassignCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      checkExpenses();
    }
  }, [opened, category.id]);

  const checkExpenses = async () => {
    setCheckingExpenses(true);
    try {
      const response = await fetch(
        `/api/budgets/${budgetId}/categories/${category.id}/expense-count`
      );
      if (response.ok) {
        const data = await response.json();
        setExpenseCount(data.count);
      }
    } catch (error) {
      console.error("Error checking expenses:", error);
    } finally {
      setCheckingExpenses(false);
    }
  };

  const handleDelete = async () => {
    if (expenseCount > 0 && !reassignCategoryId) {
      notifications.show({
        title: "Select a category",
        message: "Please select a category to reassign expenses to",
        color: "orange",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/budgets/${budgetId}/categories/${category.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reassignCategoryId: expenseCount > 0 ? reassignCategoryId : null,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete category");
      }

      notifications.show({
        title: "Category deleted",
        message: expenseCount > 0
          ? `"${category.name}" deleted and ${expenseCount} expense(s) reassigned`
          : `"${category.name}" has been deleted`,
        color: "green",
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      notifications.show({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to delete category",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = otherCategories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const isLastCategory = otherCategories.length === 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Delete "${category.name}"`}
      size="md"
    >
      {checkingExpenses ? (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      ) : isLastCategory ? (
        <Stack>
          <Alert color="orange" icon={<AlertTriangle size={16} />}>
            <Text fw={500}>Cannot delete the last category</Text>
            <Text size="sm" mt="xs">
              You must have at least one category in your budget. Create another
              category first before deleting this one.
            </Text>
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Close
            </Button>
          </Group>
        </Stack>
      ) : (
        <Stack>
          {expenseCount > 0 ? (
            <>
              <Alert color="orange" icon={<AlertTriangle size={16} />}>
                <Text fw={500}>
                  This category has {expenseCount} expense
                  {expenseCount !== 1 ? "s" : ""}
                </Text>
                <Text size="sm" mt="xs">
                  Before deleting, you must choose another category to reassign
                  these expenses to.
                </Text>
              </Alert>

              <Select
                label="Reassign expenses to"
                placeholder="Select a category"
                data={categoryOptions}
                value={reassignCategoryId}
                onChange={setReassignCategoryId}
                required
              />
            </>
          ) : (
            <Text>
              Are you sure you want to delete &quot;{category.name}&quot;? This
              action cannot be undone.
            </Text>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDelete}
              loading={loading}
              disabled={expenseCount > 0 && !reassignCategoryId}
            >
              Delete Category
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
