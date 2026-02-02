"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Modal,
  Text,
  Button,
  Stack,
  Group,
  Select,
  Alert,
  Loader,
  Center,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { AlertCircle } from "lucide-react";

interface Payee {
  id: string;
  name: string;
}

interface DeletePayeeModalProps {
  opened: boolean;
  onClose: () => void;
  budgetId: string;
  payee: Payee;
  otherPayees: Payee[];
  onSuccess?: () => void;
}

export function DeletePayeeModal({
  opened,
  onClose,
  budgetId,
  payee,
  otherPayees,
  onSuccess,
}: DeletePayeeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [expenseCount, setExpenseCount] = useState(0);
  const [reassignPayeeId, setReassignPayeeId] = useState<string | null>(null);

  useEffect(() => {
    if (opened && payee) {
      checkExpenses();
    }
  }, [opened, payee]);

  const checkExpenses = async () => {
    setChecking(true);
    try {
      const response = await fetch(
        `/api/budgets/${budgetId}/payees/${payee.id}`,
      );
      if (response.ok) {
        const data = await response.json();
        setExpenseCount(data.expenseCount);
      }
    } catch (error) {
      console.error("Error checking expenses:", error);
    } finally {
      setChecking(false);
    }
  };

  const handleDelete = async () => {
    if (expenseCount > 0 && !reassignPayeeId) {
      notifications.show({
        title: "Error",
        message: "Please select a payee to reassign expenses to",
        color: "red",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/budgets/${budgetId}/payees/${payee.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reassignPayeeId }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete payee");
      }

      notifications.show({
        title: "Payee deleted",
        message: `"${payee.name}" has been deleted`,
        color: "green",
      });

      onClose();
      onSuccess?.();
      router.refresh();
    } catch (error) {
      notifications.show({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to delete payee",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const payeeOptions = otherPayees.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  return (
    <Modal opened={opened} onClose={onClose} title="Delete Payee" size="md">
      <Stack>
        {checking ? (
          <Center py="md">
            <Loader size="sm" />
          </Center>
        ) : (
          <>
            {expenseCount > 0 ? (
              <>
                <Alert icon={<AlertCircle size={16} />} color="orange">
                  This payee has {expenseCount} expense
                  {expenseCount === 1 ? "" : "s"} associated with it. Please
                  select another payee to reassign these expenses to.
                </Alert>
                <Select
                  label="Reassign expenses to"
                  placeholder="Select a payee"
                  data={payeeOptions}
                  value={reassignPayeeId}
                  onChange={setReassignPayeeId}
                  required
                />
              </>
            ) : (
              <Text>
                Are you sure you want to delete &quot;{payee.name}&quot;? This
                action cannot be undone.
              </Text>
            )}
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleDelete}
            loading={loading}
            disabled={checking || (expenseCount > 0 && !reassignPayeeId)}
          >
            Delete Payee
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
