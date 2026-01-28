import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCycleBoundsForDate, getPreviousCycleBounds } from "@/lib/cycles";

async function checkBudgetAccess(budgetId: string, userId: string) {
  return db.budgetMember.findUnique({
    where: { budgetId_userId: { budgetId, userId } },
  });
}

interface CycleSnapshot {
  budgetTotal: number;
  currency: string;
  locale: string;
  categories: Array<{
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    allocationMethod: string;
    allocationValue: number;
    sortOrder: number;
  }>;
  totalSpent: number;
  categoryTotals: Record<string, number>;
}

async function createCycleSnapshot(
  budgetId: string,
  cycleStartDate: Date,
  cycleEndDate: Date,
): Promise<CycleSnapshot> {
  // Get budget details
  const budget = await db.budget.findUnique({
    where: { id: budgetId },
    include: {
      categories: {
        where: { isDeleted: false },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!budget) throw new Error("Budget not found");

  // Get expenses for the cycle
  const expenses = await db.expense.findMany({
    where: {
      budgetId,
      isDeleted: false,
      date: {
        gte: cycleStartDate,
        lte: cycleEndDate,
      },
    },
    include: { splits: true },
  });

  // Calculate category totals
  const categoryTotals: Record<string, number> = {};
  for (const expense of expenses) {
    for (const split of expense.splits) {
      const amount = split.calculatedAmount ?? split.allocationValue;
      categoryTotals[split.categoryId] =
        (categoryTotals[split.categoryId] || 0) + amount;
    }
  }

  // Sort categories so REMAINING is last
  const sortedCategories = [...budget.categories].sort((a, b) => {
    if (
      a.allocationMethod === "REMAINING" &&
      b.allocationMethod !== "REMAINING"
    )
      return 1;
    if (
      a.allocationMethod !== "REMAINING" &&
      b.allocationMethod === "REMAINING"
    )
      return -1;
    return a.sortOrder - b.sortOrder;
  });

  return {
    budgetTotal: budget.totalAmount,
    currency: budget.currency,
    locale: budget.locale,
    categories: sortedCategories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      allocationMethod: c.allocationMethod,
      allocationValue: c.allocationValue,
      sortOrder: c.sortOrder,
    })),
    totalSpent: expenses.reduce((sum, e) => sum + e.amount, 0),
    categoryTotals,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ budgetId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { budgetId } = await params;
    const member = await checkBudgetAccess(budgetId, session.user.id);
    if (!member) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 },
      );
    }

    const budget = await db.budget.findUnique({
      where: { id: budgetId },
      include: {
        categories: {
          where: { isDeleted: false },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!budget) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 },
      );
    }

    const url = new URL(request.url);
    const cycleId = url.searchParams.get("cycleId");
    const cycleDate = url.searchParams.get("date");

    const cycleConfig = {
      cycleType: budget.cycleType,
      cycleStartDay: budget.cycleStartDay,
      customCycleDays: budget.customCycleDays,
      startDate: budget.startDate,
    };

    // Determine which cycle to fetch
    let targetCycle;
    const now = new Date();
    const currentCycleBounds = getCycleBoundsForDate(now, cycleConfig);

    if (cycleId) {
      // Fetch specific cycle by ID
      targetCycle = await db.budgetCycle.findUnique({
        where: { id: cycleId },
      });
    } else if (cycleDate) {
      // Fetch cycle for a specific date
      const requestedDate = new Date(cycleDate);
      const requestedBounds = getCycleBoundsForDate(requestedDate, cycleConfig);
      targetCycle = await db.budgetCycle.findFirst({
        where: { budgetId, startDate: requestedBounds.startDate },
      });
    } else {
      // Get or create current cycle
      targetCycle = await db.budgetCycle.findFirst({
        where: { budgetId, startDate: currentCycleBounds.startDate },
      });

      if (!targetCycle) {
        // Check if there's a previous cycle that needs snapshotting
        const previousBounds = getPreviousCycleBounds(
          currentCycleBounds.startDate,
          cycleConfig,
        );
        const previousCycle = await db.budgetCycle.findFirst({
          where: { budgetId, startDate: previousBounds.startDate },
        });

        if (previousCycle && !previousCycle.snapshot) {
          // Snapshot the previous cycle before creating the new one
          const snapshot = await createCycleSnapshot(
            budgetId,
            previousCycle.startDate,
            previousCycle.endDate,
          );
          await db.budgetCycle.update({
            where: { id: previousCycle.id },
            data: { snapshot },
          });
        }

        // Create the current cycle
        targetCycle = await db.budgetCycle.create({
          data: {
            budgetId,
            startDate: currentCycleBounds.startDate,
            endDate: currentCycleBounds.endDate,
          },
        });
      }
    }

    if (!targetCycle) {
      return NextResponse.json({ message: "Cycle not found" }, { status: 404 });
    }

    // Determine if this is the current cycle
    const isCurrentCycle =
      targetCycle.startDate.getTime() ===
      currentCycleBounds.startDate.getTime();

    // For past cycles with snapshots, return snapshot data
    if (!isCurrentCycle && targetCycle.snapshot) {
      const snapshot = targetCycle.snapshot as CycleSnapshot;
      return NextResponse.json({
        cycle: targetCycle,
        categoryTotals: snapshot.categoryTotals,
        totalSpent: snapshot.totalSpent,
        isCurrentCycle: false,
        snapshot,
      });
    }

    // For current cycle or cycles without snapshots, calculate live data
    const expenses = await db.expense.findMany({
      where: {
        budgetId,
        isDeleted: false,
        date: {
          gte: targetCycle.startDate,
          lte: targetCycle.endDate,
        },
      },
      include: { splits: true },
    });

    const categoryTotals: Record<string, number> = {};
    for (const expense of expenses) {
      for (const split of expense.splits) {
        const amount = split.calculatedAmount ?? split.allocationValue;
        categoryTotals[split.categoryId] =
          (categoryTotals[split.categoryId] || 0) + amount;
      }
    }

    return NextResponse.json({
      cycle: targetCycle,
      categoryTotals,
      totalSpent: expenses.reduce((sum, e) => sum + e.amount, 0),
      isCurrentCycle,
    });
  } catch (error) {
    console.error("Error fetching cycles:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
