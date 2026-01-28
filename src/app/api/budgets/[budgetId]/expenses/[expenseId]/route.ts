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
  { params }: { params: Promise<{ budgetId: string; expenseId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { budgetId, expenseId } = await params;
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

    const expense = await db.expense.findUnique({
      where: { id: expenseId, budgetId },
    });

    if (!expense || expense.isDeleted) {
      return NextResponse.json(
        { message: "Expense not found" },
        { status: 404 },
      );
    }

    // Check delete permission
    const budget = await db.budget.findUnique({
      where: { id: budgetId },
    });

    if (budget?.allowDeleteOwnOnly && expense.createdById !== session.user.id) {
      return NextResponse.json(
        { message: "You can only delete expenses you created" },
        { status: 403 },
      );
    }

    // Soft delete
    await db.expense.update({
      where: { id: expenseId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Expense deleted" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ budgetId: string; expenseId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { budgetId, expenseId } = await params;
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
    const { amount, date, payeeId, payeeName, description, splits, tagIds } =
      body;

    // Handle payee - create new if payeeName provided
    let finalPayeeId = payeeId;
    if (!payeeId && payeeName) {
      let existingPayee = await db.payee.findFirst({
        where: { budgetId, name: payeeName, isDeleted: false },
      });

      if (!existingPayee) {
        existingPayee = await db.payee.create({
          data: {
            budgetId,
            name: payeeName,
            createdById: session.user.id,
          },
        });
      }
      finalPayeeId = existingPayee.id;
    }

    // Update expense
    const expense = await db.expense.update({
      where: { id: expenseId, budgetId, isDeleted: false },
      data: {
        ...(amount !== undefined && { amount }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(finalPayeeId !== undefined && { payeeId: finalPayeeId }),
        ...(description !== undefined && { description }),
      },
    });

    // Update splits if provided
    if (splits && splits.length > 0) {
      // Delete existing splits
      await db.expenseSplit.deleteMany({ where: { expenseId } });

      // Create new splits
      await db.expenseSplit.createMany({
        data: splits.map(
          (split: {
            categoryId: string;
            allocationMethod: string;
            allocationValue: number;
          }) => ({
            expenseId,
            categoryId: split.categoryId,
            allocationMethod: split.allocationMethod || "FIXED",
            allocationValue: split.allocationValue,
            createdById: session.user.id,
          }),
        ),
      });
    }

    // Update tags if provided
    if (tagIds !== undefined) {
      // Delete existing tags
      await db.expenseTag.deleteMany({ where: { expenseId } });

      // Create new tags
      if (tagIds.length > 0) {
        await db.expenseTag.createMany({
          data: tagIds.map((tagId: string) => ({ expenseId, tagId })),
        });
      }
    }

    // Fetch updated expense with relations
    const updatedExpense = await db.expense.findUnique({
      where: { id: expenseId },
      include: {
        payee: true,
        splits: { include: { category: true } },
        tags: { include: { tag: true } },
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
