"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  TextInput,
  NumberInput,
  Select,
  Switch,
  Button,
  Group,
  Divider,
  LoadingOverlay,
  Alert,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { AlertTriangle, ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatMoney, parseMoneyToMinorUnits } from "@/lib/format";

interface Budget {
  id: string;
  name: string;
  totalAmount: number;
  currency: string;
  locale: string;
  cycleType: string;
  startDate: string | null;
  carryOverEnabled: boolean;
  carryOverNegative: boolean;
  allowMemberExpenseEdit: boolean;
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

export default function BudgetSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const budgetId = params.budgetId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      name: "",
      totalAmount: 0,
      currency: "USD",
      locale: "en-US",
      cycleType: "MONTHLY",
      startDate: new Date() as Date | null,
      carryOverEnabled: false,
      carryOverNegative: false,
      allowMemberExpenseEdit: true,
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : "Name is required"),
      totalAmount: (value) =>
        value > 0 ? null : "Amount must be greater than 0",
    },
  });

  useEffect(() => {
    async function fetchBudget() {
      try {
        const response = await fetch(`/api/budgets/${budgetId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Budget not found");
          } else if (response.status === 403) {
            setError("You do not have permission to view this budget");
          } else {
            setError("Failed to load budget");
          }
          return;
        }

        const data = await response.json();
        setBudget(data);
        form.setValues({
          name: data.name,
          totalAmount: data.totalAmount / 100,
          currency: data.currency,
          locale: data.locale,
          cycleType: data.cycleType,
          // Parse UTC date and create local date with same calendar date
          startDate: data.startDate
            ? (() => {
                const utc = new Date(data.startDate);
                return new Date(
                  utc.getUTCFullYear(),
                  utc.getUTCMonth(),
                  utc.getUTCDate(),
                );
              })()
            : null,
          carryOverEnabled: data.carryOverEnabled,
          carryOverNegative: data.carryOverNegative,
          allowMemberExpenseEdit: data.allowMemberExpenseEdit,
        });
      } catch (err) {
        setError("Failed to load budget");
      } finally {
        setLoading(false);
      }
    }

    fetchBudget();
  }, [budgetId]);

  const handleSubmit = async (values: typeof form.values) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/budgets/${budgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          totalAmount: parseMoneyToMinorUnits(values.totalAmount),
          // Use YYYY-MM-DD format to avoid timezone issues
          startDate: values.startDate
            ? `${values.startDate.getFullYear()}-${String(values.startDate.getMonth() + 1).padStart(2, "0")}-${String(values.startDate.getDate()).padStart(2, "0")}`
            : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update budget");
      }

      notifications.show({
        title: "Settings saved",
        message: "Budget settings have been updated",
        color: "green",
      });

      router.refresh();
    } catch (error) {
      notifications.show({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to save settings",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this budget? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/budgets/${budgetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete budget");
      }

      notifications.show({
        title: "Budget deleted",
        message: "The budget has been deleted",
        color: "green",
      });

      router.push("/dashboard");
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to delete budget",
        color: "red",
      });
    }
  };

  if (loading) {
    return (
      <Container size="sm" py="xl">
        <Paper withBorder p="xl" pos="relative" mih={400}>
          <LoadingOverlay visible />
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="sm" py="xl">
        <Alert color="red" title="Error" icon={<AlertTriangle size={16} />}>
          {error}
        </Alert>
        <Button
          component={Link}
          href="/dashboard"
          variant="subtle"
          leftSection={<ArrowLeft size={16} />}
          mt="md"
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container size="sm" py="md">
      <Group mb="xl">
        <Button
          component={Link}
          href={`/dashboard/budgets/${budgetId}`}
          variant="subtle"
          leftSection={<ArrowLeft size={16} />}
          px={0}
        >
          Back to Budget
        </Button>
      </Group>

      <Title order={2} mb="xs">
        Budget Settings
      </Title>
      <Text c="dimmed" mb="xl">
        Manage settings for &quot;{budget?.name}&quot;
      </Text>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          <Paper withBorder p="lg">
            <Title order={4} mb="md">
              General
            </Title>
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
                description="When your budget cycles begin (affects cycle boundaries)"
                clearable
                {...form.getInputProps("startDate")}
              />
            </Stack>
          </Paper>

          <Paper withBorder p="lg">
            <Title order={4} mb="md">
              Carry-over Settings
            </Title>
            <Stack>
              <Switch
                label="Enable carry-over"
                description="Unused funds carry over to the next cycle"
                {...form.getInputProps("carryOverEnabled", {
                  type: "checkbox",
                })}
              />
              <Switch
                label="Allow negative carry-over"
                description="Negative balances also carry over"
                disabled={!form.values.carryOverEnabled}
                {...form.getInputProps("carryOverNegative", {
                  type: "checkbox",
                })}
              />
            </Stack>
          </Paper>

          <Paper withBorder p="lg">
            <Title order={4} mb="md">
              Permissions
            </Title>
            <Switch
              label="Allow members to edit expenses"
              description="If enabled, all members can edit any expense"
              {...form.getInputProps("allowMemberExpenseEdit", {
                type: "checkbox",
              })}
            />
          </Paper>

          <Group justify="flex-end">
            <Button
              type="submit"
              leftSection={<Save size={16} />}
              loading={saving}
            >
              Save Changes
            </Button>
          </Group>

          <Divider />

          <Paper
            withBorder
            p="lg"
            style={{ borderColor: "var(--mantine-color-red-4)" }}
          >
            <Title order={4} mb="xs" c="red">
              Danger Zone
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              Once you delete a budget, there is no going back. Please be
              certain.
            </Text>
            <Button
              color="red"
              variant="outline"
              leftSection={<Trash2 size={16} />}
              onClick={handleDelete}
            >
              Delete Budget
            </Button>
          </Paper>
        </Stack>
      </form>
    </Container>
  );
}
