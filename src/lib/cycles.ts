import { BudgetCycleType } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

interface CycleConfig {
  cycleType: BudgetCycleType;
  cycleStartDay?: number | null;
  customCycleDays?: number | null;
  startDate?: Date | null;
}

interface CycleBounds {
  startDate: Date;
  endDate: Date;
}

/**
 * Calculate the cycle bounds for a given date based on budget configuration
 */
export function getCycleBoundsForDate(
  date: Date,
  config: CycleConfig,
): CycleBounds {
  const d = dayjs.utc(date);

  switch (config.cycleType) {
    case "WEEKLY": {
      // Use budget start date if provided, otherwise fall back to day-of-week
      if (config.startDate) {
        const budgetStart = dayjs.utc(config.startDate).startOf("day");
        const daysSinceStart = d.diff(budgetStart, "day");
        if (daysSinceStart < 0) {
          // Date is before budget start, use budget start as cycle start
          return {
            startDate: budgetStart.toDate(),
            endDate: budgetStart.add(6, "day").endOf("day").toDate(),
          };
        }
        const cycleNumber = Math.floor(daysSinceStart / 7);
        const cycleStart = budgetStart
          .add(cycleNumber * 7, "day")
          .startOf("day");
        const cycleEnd = cycleStart.add(6, "day").endOf("day");
        return {
          startDate: cycleStart.toDate(),
          endDate: cycleEnd.toDate(),
        };
      }
      // Fallback: use day of week
      const startDay = config.cycleStartDay ?? 0; // Default to Sunday
      const currentDay = d.day();
      const daysToStart = (currentDay - startDay + 7) % 7;
      const cycleStart = d.subtract(daysToStart, "day").startOf("day");
      const cycleEnd = cycleStart.add(6, "day").endOf("day");
      return {
        startDate: cycleStart.toDate(),
        endDate: cycleEnd.toDate(),
      };
    }

    case "BIWEEKLY": {
      const startDay = config.cycleStartDay ?? 0;
      const budgetStart = config.startDate
        ? dayjs.utc(config.startDate)
        : d.startOf("year");
      const daysSinceStart = d.diff(budgetStart, "day");
      const cycleNumber = Math.floor(daysSinceStart / 14);
      const cycleStart = budgetStart
        .add(cycleNumber * 14, "day")
        .startOf("day");
      const cycleEnd = cycleStart.add(13, "day").endOf("day");
      return {
        startDate: cycleStart.toDate(),
        endDate: cycleEnd.toDate(),
      };
    }

    case "MONTHLY": {
      // Use budget start date if provided to determine the day of month
      if (config.startDate) {
        const budgetStart = dayjs.utc(config.startDate).startOf("day");
        const startDayOfMonth = budgetStart.date();
        const currentDayOfMonth = Math.min(startDayOfMonth, d.daysInMonth());

        let cycleStart: dayjs.Dayjs;
        if (d.date() >= currentDayOfMonth) {
          cycleStart = d.date(currentDayOfMonth).startOf("day");
        } else {
          const prevMonth = d.subtract(1, "month");
          cycleStart = prevMonth
            .date(Math.min(startDayOfMonth, prevMonth.daysInMonth()))
            .startOf("day");
        }

        const nextMonth = cycleStart.add(1, "month");
        const cycleEnd = nextMonth
          .date(Math.min(startDayOfMonth, nextMonth.daysInMonth()))
          .subtract(1, "day")
          .endOf("day");

        return {
          startDate: cycleStart.toDate(),
          endDate: cycleEnd.toDate(),
        };
      }
      // Fallback: use cycleStartDay or default to 1st
      const startDay = Math.min(config.cycleStartDay ?? 1, d.daysInMonth());
      let cycleStart: dayjs.Dayjs;

      if (d.date() >= startDay) {
        cycleStart = d.date(startDay).startOf("day");
      } else {
        cycleStart = d
          .subtract(1, "month")
          .date(Math.min(startDay, d.subtract(1, "month").daysInMonth()))
          .startOf("day");
      }

      const nextMonth = cycleStart.add(1, "month");
      const cycleEnd = nextMonth
        .date(Math.min(startDay, nextMonth.daysInMonth()))
        .subtract(1, "day")
        .endOf("day");

      return {
        startDate: cycleStart.toDate(),
        endDate: cycleEnd.toDate(),
      };
    }

    case "QUARTERLY": {
      const quarter = Math.floor(d.month() / 3);
      const cycleStart = d
        .month(quarter * 3)
        .date(1)
        .startOf("day");
      const cycleEnd = cycleStart
        .add(3, "month")
        .subtract(1, "day")
        .endOf("day");
      return {
        startDate: cycleStart.toDate(),
        endDate: cycleEnd.toDate(),
      };
    }

    case "YEARLY": {
      const cycleStart = d.month(0).date(1).startOf("day");
      const cycleEnd = d.month(11).date(31).endOf("day");
      return {
        startDate: cycleStart.toDate(),
        endDate: cycleEnd.toDate(),
      };
    }

    case "CUSTOM": {
      const customDays = config.customCycleDays ?? 30;
      const budgetStart = config.startDate
        ? dayjs.utc(config.startDate)
        : d.startOf("year");
      const daysSinceStart = d.diff(budgetStart, "day");
      const cycleNumber = Math.floor(daysSinceStart / customDays);
      const cycleStart = budgetStart
        .add(cycleNumber * customDays, "day")
        .startOf("day");
      const cycleEnd = cycleStart.add(customDays - 1, "day").endOf("day");
      return {
        startDate: cycleStart.toDate(),
        endDate: cycleEnd.toDate(),
      };
    }

    default:
      throw new Error(`Unknown cycle type: ${config.cycleType}`);
  }
}

/**
 * Get the next cycle bounds after a given cycle
 */
export function getNextCycleBounds(
  currentCycleEnd: Date,
  config: CycleConfig,
): CycleBounds {
  const nextStart = dayjs.utc(currentCycleEnd).add(1, "day").toDate();
  return getCycleBoundsForDate(nextStart, config);
}

/**
 * Get the previous cycle bounds before a given cycle
 */
export function getPreviousCycleBounds(
  currentCycleStart: Date,
  config: CycleConfig,
): CycleBounds {
  const prevEnd = dayjs.utc(currentCycleStart).subtract(1, "day").toDate();
  return getCycleBoundsForDate(prevEnd, config);
}

/**
 * Check if a date falls within a cycle
 */
export function isDateInCycle(
  date: Date,
  cycleStart: Date,
  cycleEnd: Date,
): boolean {
  const d = dayjs.utc(date);
  const start = dayjs.utc(cycleStart);
  const end = dayjs.utc(cycleEnd);
  return (
    d.isSame(start, "day") ||
    d.isSame(end, "day") ||
    (d.isAfter(start) && d.isBefore(end))
  );
}
