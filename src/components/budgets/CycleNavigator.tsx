"use client";

import { useState, useEffect } from "react";
import { Group, ActionIcon, Menu, Text, Badge } from "@mantine/core";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatDateRange } from "@/lib/format";

interface Cycle {
  id: string;
  startDate: string;
  endDate: string;
  hasSnapshot: boolean;
}

interface CycleNavigatorProps {
  budgetId: string;
  currentCycleId: string;
  cycleStartDate: string;
  cycleEndDate: string;
  isCurrentCycle: boolean;
  locale: string;
  onCycleChange: (cycleId: string) => void;
}

export function CycleNavigator({
  budgetId,
  currentCycleId,
  cycleStartDate,
  cycleEndDate,
  isCurrentCycle,
  locale,
  onCycleChange,
}: CycleNavigatorProps) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchCycles() {
      setLoading(true);
      try {
        const response = await fetch(`/api/budgets/${budgetId}/cycles/list`);
        if (response.ok) {
          const data = await response.json();
          setCycles(data.cycles);
        }
      } catch (error) {
        console.error("Error fetching cycles:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCycles();
  }, [budgetId]);

  // Find current cycle index in the list
  const currentIndex = cycles.findIndex((c) => c.id === currentCycleId);
  const hasPrevious = currentIndex < cycles.length - 1; // Older cycles are later in the list (desc order)
  const hasNext = currentIndex > 0 && !isCurrentCycle; // Can only go forward if not on current cycle

  const handlePrevious = () => {
    if (hasPrevious && currentIndex < cycles.length - 1) {
      onCycleChange(cycles[currentIndex + 1].id);
    }
  };

  const handleNext = () => {
    if (hasNext && currentIndex > 0) {
      onCycleChange(cycles[currentIndex - 1].id);
    }
  };

  return (
    <Group gap="xs">
      <ActionIcon
        variant="subtle"
        size="sm"
        onClick={handlePrevious}
        disabled={!hasPrevious || loading}
        aria-label="Previous cycle"
      >
        <ChevronLeft size={18} />
      </ActionIcon>

      <Menu shadow="md" width={220}>
        <Menu.Target>
          <Group
            gap={4}
            style={{ cursor: "pointer" }}
            className="hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded"
          >
            <Calendar size={14} style={{ display: "inline", marginRight: 4 }} />
            <Text size="sm" fw={500}>
              {formatDateRange(cycleStartDate, cycleEndDate, locale)}
            </Text>
            {isCurrentCycle && (
              <Badge size="xs" variant="light" color="blue" ml={4}>
                Current
              </Badge>
            )}
          </Group>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Select Cycle</Menu.Label>
          {cycles.length === 0 && (
            <Menu.Item disabled>No cycles available</Menu.Item>
          )}
          {cycles.map((cycle, index) => {
            const isCurrent = index === 0; // First in desc order is most recent
            const isSelected = cycle.id === currentCycleId;
            return (
              <Menu.Item
                key={cycle.id}
                onClick={() => onCycleChange(cycle.id)}
                style={{
                  backgroundColor: isSelected
                    ? "var(--mantine-color-blue-light)"
                    : undefined,
                }}
              >
                <Group justify="space-between" w="100%">
                  <Text size="sm">
                    {formatDateRange(cycle.startDate, cycle.endDate, locale)}
                  </Text>
                  {isCurrent && (
                    <Badge size="xs" variant="light" color="blue">
                      Current
                    </Badge>
                  )}
                </Group>
              </Menu.Item>
            );
          })}
        </Menu.Dropdown>
      </Menu>

      <ActionIcon
        variant="subtle"
        size="sm"
        onClick={handleNext}
        disabled={!hasNext || loading || isCurrentCycle}
        aria-label="Next cycle"
      >
        <ChevronRight size={18} />
      </ActionIcon>
    </Group>
  );
}
