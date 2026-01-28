import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function checkBudgetAccess(budgetId: string, userId: string) {
  return db.budgetMember.findUnique({
    where: { budgetId_userId: { budgetId, userId } },
  });
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
      return NextResponse.json({ message: "Budget not found" }, { status: 404 });
    }

    // Get all cycles for this budget, ordered by start date descending (newest first)
    const cycles = await db.budgetCycle.findMany({
      where: { budgetId },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        snapshot: true,
        createdAt: true,
      },
    });

    // Return cycles with a flag indicating if they have snapshots
    const cyclesWithMeta = cycles.map((cycle) => ({
      id: cycle.id,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      hasSnapshot: !!cycle.snapshot,
      createdAt: cycle.createdAt,
    }));

    return NextResponse.json({ cycles: cyclesWithMeta });
  } catch (error) {
    console.error("Error listing cycles:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
