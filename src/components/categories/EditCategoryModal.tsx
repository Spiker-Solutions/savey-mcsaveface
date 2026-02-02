"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Modal,
  TextInput,
  NumberInput,
  Select,
  Button,
  Stack,
  Group,
  ColorInput,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import * as LucideIcons from "lucide-react";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  parseMoneyToMinorUnits,
  parsePercentageToBasisPoints,
  formatMoney,
  formatPercentage,
} from "@/lib/format";

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

interface EditCategoryModalProps {
  opened: boolean;
  onClose: () => void;
  budgetId: string;
  category: Category;
  existingCategories: Category[];
  currency?: string;
  locale?: string;
  onSuccess?: () => void;
}

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

export function EditCategoryModal({
  opened,
  onClose,
  budgetId,
  category,
  existingCategories,
  onSuccess,
}: EditCategoryModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const hasOtherRemainingCategory = existingCategories.some(
    (c) => c.allocationMethod === "REMAINING" && c.id !== category.id,
  );

  const form = useForm({
    initialValues: {
      name: "",
      icon: "Folder",
      color: "#228be6",
      allocationMethod: "FIXED",
      allocationValue: 0,
      carryOverEnabled: null as boolean | null,
      editableByAll: true,
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : "Name is required"),
      allocationValue: (value, values) =>
        values.allocationMethod === "REMAINING" || value > 0
          ? null
          : "Value must be greater than 0",
    },
  });

  useEffect(() => {
    if (category && opened) {
      let displayValue = 0;
      if (category.allocationMethod === "FIXED") {
        displayValue = category.allocationValue / 100;
      } else if (category.allocationMethod === "PERCENTAGE") {
        displayValue = category.allocationValue / 100;
      }

      form.setValues({
        name: category.name,
        icon: category.icon || "Folder",
        color: category.color || "#228be6",
        allocationMethod: category.allocationMethod,
        allocationValue: displayValue,
        carryOverEnabled: category.carryOverEnabled,
        editableByAll: category.editableByAll,
      });
    }
  }, [category, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      let allocationValue = 0;
      if (values.allocationMethod === "FIXED") {
        allocationValue = parseMoneyToMinorUnits(values.allocationValue);
      } else if (values.allocationMethod === "PERCENTAGE") {
        allocationValue = parsePercentageToBasisPoints(values.allocationValue);
      }

      const response = await fetch(
        `/api/budgets/${budgetId}/categories/${category.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            icon: values.icon,
            color: values.color,
            allocationMethod: values.allocationMethod,
            allocationValue,
            carryOverEnabled: values.carryOverEnabled,
            editableByAll: values.editableByAll,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update category");
      }

      notifications.show({
        title: "Category updated",
        message: `"${values.name}" has been updated`,
        color: "green",
      });

      onClose();
      onSuccess?.();
      router.refresh();
    } catch (error) {
      notifications.show({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to update category",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const allocationOptions = [
    { value: "FIXED", label: "Fixed Amount" },
    { value: "PERCENTAGE", label: "Percentage of Budget" },
    {
      value: "REMAINING",
      label: "Remaining (absorbs leftover)",
      disabled: hasOtherRemainingCategory && category.allocationMethod !== "REMAINING",
    },
  ];

  return (
    <Modal opened={opened} onClose={onClose} title="Edit Category" size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Category Name"
            placeholder="e.g., Groceries"
            required
            {...form.getInputProps("name")}
          />

          <Group grow>
            <Select
              label="Icon"
              data={iconOptions}
              renderOption={({ option }) => (
                <IconOption value={option.value} label={option.label} />
              )}
              leftSection={<IconOption value={form.values.icon} label="" />}
              {...form.getInputProps("icon")}
            />
            <ColorInput
              label="Color"
              format="hex"
              swatches={[
                "#228be6",
                "#40c057",
                "#fab005",
                "#fa5252",
                "#7950f2",
                "#e64980",
                "#15aabf",
                "#82c91e",
              ]}
              {...form.getInputProps("color")}
            />
          </Group>

          <Tooltip
            label="Another category is already set as 'Remaining'"
            disabled={
              !hasOtherRemainingCategory ||
              form.values.allocationMethod !== "REMAINING"
            }
          >
            <Select
              label="Allocation Method"
              data={allocationOptions}
              {...form.getInputProps("allocationMethod")}
            />
          </Tooltip>

          {form.values.allocationMethod === "FIXED" && (
            <NumberInput
              label="Allocated Amount"
              placeholder="0.00"
              required
              min={0}
              decimalScale={2}
              fixedDecimalScale
              thousandSeparator=","
              prefix="$"
              {...form.getInputProps("allocationValue")}
            />
          )}

          {form.values.allocationMethod === "PERCENTAGE" && (
            <NumberInput
              label="Percentage of Budget"
              placeholder="0"
              required
              min={0}
              max={100}
              suffix="%"
              {...form.getInputProps("allocationValue")}
            />
          )}

          {form.values.allocationMethod === "REMAINING" && (
            <Text size="sm" c="dimmed">
              This category will receive any funds not allocated to other
              categories.
            </Text>
          )}

          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Settings
            </Text>
            <Switch
              label="Override budget carry-over setting"
              description="Leave off to use the budget's default"
              checked={form.values.carryOverEnabled !== null}
              onChange={(e) =>
                form.setFieldValue(
                  "carryOverEnabled",
                  e.currentTarget.checked ? false : null,
                )
              }
            />
            {form.values.carryOverEnabled !== null && (
              <Switch
                label="Enable carry-over for this category"
                ml="md"
                {...form.getInputProps("carryOverEnabled", {
                  type: "checkbox",
                })}
              />
            )}
            <Switch
              label="Allow all members to add expenses"
              description="If off, only owners can add expenses to this category"
              {...form.getInputProps("editableByAll", { type: "checkbox" })}
            />
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
