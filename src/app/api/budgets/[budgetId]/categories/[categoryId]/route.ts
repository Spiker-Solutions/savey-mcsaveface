import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function checkBudgetAccess(budgetId: string, userId: string) {
  return db.budgetMember.findUnique({
    where: { budgetId_userId: { budgetId, userId } },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ budgetId: string; categoryId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { budgetId, categoryId } = await params;
    const member = await checkBudgetAccess(budgetId, session.user.id);
    if (!member) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 },
      );
    }

    if (member.role !== "OWNER") {
      return NextResponse.json(
        { message: "Only owners can delete categories" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { reassignCategoryId } = body;

    // Check if this is the last category
    const categoryCount = await db.category.count({
      where: { budgetId, isDeleted: false },
    });

    if (categoryCount <= 1) {
      return NextResponse.json(
        { message: "Cannot delete the last category in a budget" },
        { status: 400 },
      );
    }

    // Check if category exists
    const category = await db.category.findUnique({
      where: { id: categoryId, budgetId },
    });

    if (!category || category.isDeleted) {
      return NextResponse.json(
        { message: "Category not found" },
        { status: 404 },
      );
    }

    // Check for expenses
    const expenseCount = await db.expenseSplit.count({
      where: {
        categoryId,
        expense: { budgetId, isDeleted: false },
      },
    });

    if (expenseCount > 0) {
      if (!reassignCategoryId) {
        return NextResponse.json(
          { message: "Must provide a category to reassign expenses to" },
          { status: 400 },
        );
      }

      // Verify reassign category exists
      const reassignCategory = await db.category.findUnique({
        where: { id: reassignCategoryId, budgetId },
      });

      if (!reassignCategory || reassignCategory.isDeleted) {
        return NextResponse.json(
          { message: "Reassign category not found" },
          { status: 400 },
        );
      }

      // Reassign all expense splits to the new category
      await db.expenseSplit.updateMany({
        where: {
          categoryId,
          expense: { budgetId, isDeleted: false },
        },
        data: { categoryId: reassignCategoryId },
      });
    }

    // Soft delete the category (rename to avoid unique constraint issues)
    await db.category.update({
      where: { id: categoryId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        name: `${category.name}_deleted_${Date.now()}`,
      },
    });

    return NextResponse.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ budgetId: string; categoryId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { budgetId, categoryId } = await params;
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
      icon,
      color,
      allocationMethod,
      allocationValue,
      carryOverEnabled,
    } = body;

    const category = await db.category.update({
      where: { id: categoryId, budgetId, isDeleted: false },
      data: {
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(allocationMethod !== undefined && { allocationMethod }),
        ...(allocationValue !== undefined && { allocationValue }),
        ...(carryOverEnabled !== undefined && { carryOverEnabled }),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
