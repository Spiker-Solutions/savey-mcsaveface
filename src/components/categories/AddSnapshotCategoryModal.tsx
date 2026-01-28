"use client";

import { useState } from "react";
import {
  Modal,
  TextInput,
  Select,
  NumberInput,
  Button,
  Stack,
  Group,
  ColorInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import * as LucideIcons from "lucide-react";

const iconOptions = [
  { value: "Baby", label: "Baby" },
  { value: "Bike", label: "Bike" },
  { value: "Briefcase", label: "Briefcase" },
  { value: "Car", label: "Car" },
  { value: "Coffee", label: "Coffee" },
  { value: "CreditCard", label: "Credit Card" },
  { value: "Dog", label: "Dog" },
  { value: "Dumbbell", label: "Dumbbell" },
  { value: "Folder", label: "Folder" },
  { value: "Gamepad2", label: "Gaming" },
  { value: "Gift", label: "Gift" },
  { value: "GraduationCap", label: "Graduation" },
  { value: "Heart", label: "Heart" },
  { value: "Home", label: "Home" },
  { value: "Lightbulb", label: "Lightbulb" },
  { value: "Music", label: "Music" },
  { value: "PiggyBank", label: "Piggy Bank" },
  { value: "Plane", label: "Plane" },
  { value: "Shirt", label: "Shirt" },
  { value: "ShoppingCart", label: "Shopping" },
  { value: "Smartphone", label: "Smartphone" },
  { value: "Stethoscope", label: "Stethoscope" },
  { value: "Tv", label: "TV" },
  { value: "Utensils", label: "Utensils" },
  { value: "Wrench", label: "Wrench" },
].sort((a, b) => a.label.localeCompare(b.label));

function IconOption({ value, label }: { value: string; label: string }) {
  const IconComponent = (
    LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ size?: number }>
    >
  )[value];
  return (
    <Group gap="xs">
      {IconComponent && <IconComponent size={16} />}
      <span>{label}</span>
    </Group>
  );
}

interface AddSnapshotCategoryModalProps {
  opened: boolean;
  onClose: () => void;
  budgetId: string;
  cycleId: string;
  onSuccess: () => void;
}

export function AddSnapshotCategoryModal({
  opened,
  onClose,
  budgetId,
  cycleId,
  onSuccess,
}: AddSnapshotCategoryModalProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      icon: "",
      color: "",
      allocationMethod: "FIXED",
      allocationValue: 0,
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : "Name is required"),
      allocationValue: (value, values) => {
        if (values.allocationMethod === "PERCENTAGE") {
          return value >= 0 && value <= 100
            ? null
            : "Percentage must be between 0 and 100";
        }
        return value >= 0 ? null : "Amount must be positive";
      },
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      // Convert percentage to basis points, or dollars to cents
      const allocationValue =
        values.allocationMethod === "PERCENTAGE"
          ? Math.round(values.allocationValue * 100) // basis points
          : Math.round(values.allocationValue * 100); // cents

      const response = await fetch(
        `/api/budgets/${budgetId}/cycles/${cycleId}/categories`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            icon: values.icon || null,
            color: values.color || null,
            allocationMethod: values.allocationMethod,
            allocationValue,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to add category");
      }

      notifications.show({
        title: "Category added",
        message: `"${values.name}" has been added to this cycle`,
        color: "green",
      });

      form.reset();
      onClose();
      onSuccess();
    } catch (error) {
      notifications.show({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to add category",
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
      title="Add Category to Historical Cycle"
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Category Name"
            placeholder="e.g., Groceries"
            required
            {...form.getInputProps("name")}
          />

          <Select
            label="Icon"
            placeholder="Select an icon"
            data={iconOptions}
            searchable
            clearable
            {...form.getInputProps("icon")}
          />

          <ColorInput
            label="Color"
            placeholder="Pick a color"
            {...form.getInputProps("color")}
          />

          <Select
            label="Allocation Method"
            data={[
              { value: "FIXED", label: "Fixed Amount" },
              { value: "PERCENTAGE", label: "Percentage of Budget" },
            ]}
            {...form.getInputProps("allocationMethod")}
          />

          <NumberInput
            label={
              form.values.allocationMethod === "PERCENTAGE"
                ? "Percentage"
                : "Amount"
            }
            placeholder={
              form.values.allocationMethod === "PERCENTAGE" ? "25" : "500.00"
            }
            min={0}
            max={
              form.values.allocationMethod === "PERCENTAGE" ? 100 : undefined
            }
            decimalScale={form.values.allocationMethod === "PERCENTAGE" ? 1 : 2}
            prefix={
              form.values.allocationMethod === "PERCENTAGE" ? undefined : "$"
            }
            suffix={
              form.values.allocationMethod === "PERCENTAGE" ? "%" : undefined
            }
            {...form.getInputProps("allocationValue")}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add Category
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
