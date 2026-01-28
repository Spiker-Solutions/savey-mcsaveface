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
  Switch,
  Text,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { parseMoneyToMinorUnits } from "@/lib/format";

interface CreateBudgetModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "MXN", label: "MXN - Mexican Peso" },
];

const cycleTypes = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

const locales = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "es-MX", label: "Spanish (Mexico)" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "ja-JP", label: "Japanese" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
];

export function CreateBudgetModal({
  opened,
  onClose,
  onSuccess,
}: CreateBudgetModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      totalAmount: 0,
      currency: "USD",
      locale: "en-US",
      cycleType: "MONTHLY",
      startDate: new Date(),
      carryOverEnabled: false,
      carryOverNegative: false,
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : "Name is required"),
      totalAmount: (value) =>
        value > 0 ? null : "Amount must be greater than 0",
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          totalAmount: parseMoneyToMinorUnits(values.totalAmount),
          // Use YYYY-MM-DD format to avoid timezone issues
          startDate: `${values.startDate.getFullYear()}-${String(values.startDate.getMonth() + 1).padStart(2, "0")}-${String(values.startDate.getDate()).padStart(2, "0")}`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create budget");
      }

      const budget = await response.json();
      notifications.show({
        title: "Budget created",
        message: `"${values.name}" has been created successfully`,
        color: "green",
      });
      form.reset();
      onClose();
      onSuccess?.();
      router.push(`/dashboard/budgets/${budget.id}`);
    } catch (error) {
      notifications.show({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to create budget",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create New Budget"
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Budget Name"
            placeholder="e.g., Household Budget"
            required
            {...form.getInputProps("name")}
          />

          <NumberInput
            label="Total Amount"
            placeholder="0.00"
            required
            min={0}
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator=","
            prefix={form.values.currency === "USD" ? "$" : ""}
            {...form.getInputProps("totalAmount")}
          />

          <Group grow>
            <Select
              label="Currency"
              data={currencies}
              {...form.getInputProps("currency")}
            />
            <Select
              label="Locale"
              data={locales}
              {...form.getInputProps("locale")}
            />
          </Group>

          <Select
            label="Budget Cycle"
            description="How often the budget resets"
            data={cycleTypes}
            {...form.getInputProps("cycleType")}
          />

          <DatePickerInput
            label="Cycle Start Date"
            description="When your first budget cycle begins"
            {...form.getInputProps("startDate")}
          />

          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Carry-over Settings
            </Text>
            <Switch
              label="Enable carry-over"
              description="Unused funds carry over to the next cycle"
              {...form.getInputProps("carryOverEnabled", { type: "checkbox" })}
            />
            <Switch
              label="Allow negative carry-over"
              description="Negative balances also carry over"
              disabled={!form.values.carryOverEnabled}
              {...form.getInputProps("carryOverNegative", { type: "checkbox" })}
            />
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Budget
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
