import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function checkBudgetAccess(budgetId: string, userId: string) {
  const member = await db.budgetMember.findUnique({
    where: {
      budgetId_userId: { budgetId, userId },
    },
  });
  return member;
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
      where: { id: budgetId, isDeleted: false },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        categories: {
          where: { isDeleted: false },
          orderBy: { sortOrder: "asc" },
        },
        cycles: {
          orderBy: { startDate: "desc" },
          take: 1,
        },
        payees: {
          where: { isDeleted: false },
          orderBy: { name: "asc" },
        },
        tags: {
          where: { isDeleted: false },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!budget) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ...budget, userRole: member.role });
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    if (member.role === "VIEWER") {
      return NextResponse.json(
        { message: "Permission denied" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const allowedFields = [
      "name",
      "description",
      "totalAmount",
      "currency",
      "locale",
      "cycleType",
      "cycleStartDay",
      "carryOverEnabled",
      "carryOverNegative",
      "allowDeleteOwnOnly",
      "startDate",
      "endDate",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Convert date strings to Date objects (parse as UTC noon to avoid timezone issues)
        if ((field === "startDate" || field === "endDate") && body[field]) {
          // Parse YYYY-MM-DD as UTC noon to avoid day shift
          const dateStr = body[field];
          if (
            typeof dateStr === "string" &&
            dateStr.match(/^\d{4}-\d{2}-\d{2}$/)
          ) {
            updateData[field] = new Date(`${dateStr}T12:00:00.000Z`);
          } else {
            updateData[field] = new Date(body[field]);
          }
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const budget = await db.budget.update({
      where: { id: budgetId },
      data: updateData,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
    if (!member || member.role !== "OWNER") {
      return NextResponse.json(
        { message: "Only owners can delete budgets" },
        { status: 403 },
      );
    }

    await db.budget.update({
      where: { id: budgetId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Budget deleted" });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
