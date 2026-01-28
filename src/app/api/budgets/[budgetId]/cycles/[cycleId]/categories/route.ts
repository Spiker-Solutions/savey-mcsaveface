import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function checkBudgetAccess(budgetId: string, userId: string) {
  return db.budgetMember.findUnique({
    where: { budgetId_userId: { budgetId, userId } },
  });
}

interface SnapshotCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  allocationMethod: string;
  allocationValue: number;
  sortOrder: number;
}

interface CycleSnapshot {
  budgetTotal: number;
  currency: string;
  locale: string;
  categories: SnapshotCategory[];
  totalSpent: number;
  categoryTotals: Record<string, number>;
}

// POST - Add a category to a past cycle's snapshot
export async function POST(
  request: Request,
  { params }: { params: Promise<{ budgetId: string; cycleId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { budgetId, cycleId } = await params;
    const member = await checkBudgetAccess(budgetId, session.user.id);
    if (!member || member.role === "VIEWER") {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const cycle = await db.budgetCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle || cycle.budgetId !== budgetId) {
      return NextResponse.json({ message: "Cycle not found" }, { status: 404 });
    }

    if (!cycle.snapshot) {
      return NextResponse.json(
        { message: "Cannot add categories to a cycle without a snapshot" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { name, icon, color, allocationMethod, allocationValue } = body;

    if (!name || !allocationMethod || allocationValue === undefined) {
      return NextResponse.json(
        {
          message: "Name, allocation method, and allocation value are required",
        },
        { status: 400 },
      );
    }

    const snapshot = cycle.snapshot as unknown as CycleSnapshot;

    // Check if category name already exists in snapshot
    if (
      snapshot.categories.some(
        (c) => c.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      return NextResponse.json(
        { message: "A category with this name already exists in this cycle" },
        { status: 400 },
      );
    }

    // Generate a unique ID for the snapshot-only category (prefixed to distinguish)
    const newCategoryId = `snapshot_${cycleId}_${Date.now()}`;

    const newCategory: SnapshotCategory = {
      id: newCategoryId,
      name,
      icon: icon || null,
      color: color || null,
      allocationMethod,
      allocationValue,
      sortOrder: snapshot.categories.length,
    };

    // Add category to snapshot
    const updatedSnapshot: CycleSnapshot = {
      ...snapshot,
      categories: [...snapshot.categories, newCategory],
    };

    await db.budgetCycle.update({
      where: { id: cycleId },
      data: { snapshot: JSON.parse(JSON.stringify(updatedSnapshot)) },
    });

    return NextResponse.json({ category: newCategory });
  } catch (error) {
    console.error("Error adding category to cycle snapshot:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
