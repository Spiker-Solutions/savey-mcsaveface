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
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 },
      );
    }

    const categories = await db.category.findMany({
      where: { budgetId, isDeleted: false },
      orderBy: { sortOrder: "asc" },
    });

    // Sort so REMAINING categories are always last
    const sortedCategories = categories.sort((a, b) => {
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
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    return NextResponse.json(sortedCategories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
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
    const {
      name,
      description,
      icon,
      color,
      allocationMethod = "FIXED",
      allocationValue,
      carryOverEnabled,
      carryOverNegative,
      editableByAll = true,
    } = body;

    if (!name) {
      return NextResponse.json(
        { message: "Name is required" },
        { status: 400 },
      );
    }

    // Check if REMAINING method is already used
    if (allocationMethod === "REMAINING") {
      const existingRemaining = await db.category.findFirst({
        where: {
          budgetId,
          allocationMethod: "REMAINING",
          isDeleted: false,
        },
      });
      if (existingRemaining) {
        return NextResponse.json(
          { message: 'A category with "Remaining" allocation already exists' },
          { status: 400 },
        );
      }
    }

    // Get max sort order
    const maxSortOrder = await db.category.aggregate({
      where: { budgetId },
      _max: { sortOrder: true },
    });

    const category = await db.category.create({
      data: {
        budgetId,
        name,
        description,
        icon,
        color,
        allocationMethod,
        allocationValue: allocationValue || 0,
        carryOverEnabled,
        carryOverNegative,
        editableByAll,
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
