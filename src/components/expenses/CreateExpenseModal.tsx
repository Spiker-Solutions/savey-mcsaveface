"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Modal,
  TextInput,
  NumberInput,
  Select,
  Button,
  Stack,
  Group,
  Textarea,
  MultiSelect,
  Autocomplete,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { parseMoneyToMinorUnits } from "@/lib/format";

interface Budget {
  id: string;
  currency: string;
  categories: { id: string; name: string }[];
  payees: { id: string; name: string }[];
  tags: { id: string; name: string }[];
}

interface CreateExpenseModalProps {
  opened: boolean;
  onClose: () => void;
  budget: Budget;
  onSuccess?: () => void;
}

export function CreateExpenseModal({
  opened,
  onClose,
  budget,
  onSuccess,
}: CreateExpenseModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      amount: 0,
      date: new Date(),
      categoryId: "",
      payee: "",
      description: "",
      tagIds: [] as string[],
    },
    validate: {
      amount: (value) => (value > 0 ? null : "Amount must be greater than 0"),
      categoryId: (value) => (value ? null : "Category is required"),
      date: (value) => (value ? null : "Date is required"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      // Check if the selected payee matches an existing one by name
      const existingPayee = budget.payees.find((p) => p.name === values.payee);

      const response = await fetch(`/api/budgets/${budget.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseMoneyToMinorUnits(values.amount),
          date: values.date.toISOString(),
          payeeId: existingPayee?.id || null,
          payeeName: !existingPayee && values.payee ? values.payee : null,
          description: values.description || null,
          tagIds: values.tagIds,
          splits: [
            {
              categoryId: values.categoryId,
              allocationMethod: "FIXED",
              allocationValue: parseMoneyToMinorUnits(values.amount),
            },
          ],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create expense");
      }

      notifications.show({
        title: "Expense added",
        message: "Your expense has been recorded",
        color: "green",
      });

      form.reset();
      onClose();
      onSuccess?.();
      router.refresh();
    } catch (error) {
      notifications.show({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to create expense",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = budget.categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const payeeOptions = budget.payees.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const tagOptions = budget.tags.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  return (
    <Modal opened={opened} onClose={onClose} title="Add Expense" size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <NumberInput
            label="Amount"
            placeholder="0.00"
            required
            min={0}
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator=","
            prefix={budget.currency === "USD" ? "$" : ""}
            {...form.getInputProps("amount")}
          />

          <DatePickerInput
            label="Date"
            placeholder="Select date"
            required
            maxDate={new Date()}
            {...form.getInputProps("date")}
          />

          <Select
            label="Category"
            placeholder="Select category"
            required
            data={categoryOptions}
            searchable
            {...form.getInputProps("categoryId")}
          />

          <Autocomplete
            label="Payee"
            placeholder="Type or select payee"
            data={payeeOptions.map((p) => p.label)}
            {...form.getInputProps("payee")}
          />

          <Textarea
            label="Description"
            placeholder="Optional notes about this expense"
            autosize
            minRows={2}
            maxRows={4}
            {...form.getInputProps("description")}
          />

          {tagOptions.length > 0 && (
            <MultiSelect
              label="Tags"
              placeholder="Select tags"
              data={tagOptions}
              searchable
              clearable
              {...form.getInputProps("tagIds")}
            />
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add Expense
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
