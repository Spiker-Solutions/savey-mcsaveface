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
  { params }: { params: Promise<{ budgetId: string; payeeId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { budgetId, payeeId } = await params;
    const member = await checkBudgetAccess(budgetId, session.user.id);
    if (!member) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 },
      );
    }

    if (member.role !== "OWNER") {
      return NextResponse.json(
        { message: "Only owners can delete payees" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { reassignPayeeId } = body;

    // Check if payee exists
    const payee = await db.payee.findUnique({
      where: { id: payeeId, budgetId },
    });

    if (!payee) {
      return NextResponse.json(
        { message: "Payee not found" },
        { status: 404 },
      );
    }

    // Check for expenses with this payee
    const expenseCount = await db.expense.count({
      where: {
        payeeId,
        budgetId,
        isDeleted: false,
      },
    });

    if (expenseCount > 0) {
      if (!reassignPayeeId) {
        return NextResponse.json(
          { 
            message: "Must provide a payee to reassign expenses to",
            expenseCount,
          },
          { status: 400 },
        );
      }

      // Verify reassign payee exists
      const reassignPayee = await db.payee.findUnique({
        where: { id: reassignPayeeId, budgetId },
      });

      if (!reassignPayee) {
        return NextResponse.json(
          { message: "Reassign payee not found" },
          { status: 400 },
        );
      }

      // Reassign all expenses to the new payee
      await db.expense.updateMany({
        where: {
          payeeId,
          budgetId,
          isDeleted: false,
        },
        data: { payeeId: reassignPayeeId },
      });
    }

    // Delete the payee
    await db.payee.delete({
      where: { id: payeeId },
    });

    return NextResponse.json({ message: "Payee deleted" });
  } catch (error) {
    console.error("Error deleting payee:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ budgetId: string; payeeId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { budgetId, payeeId } = await params;
    const member = await checkBudgetAccess(budgetId, session.user.id);
    if (!member) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 },
      );
    }

    // Get expense count for this payee
    const expenseCount = await db.expense.count({
      where: {
        payeeId,
        budgetId,
        isDeleted: false,
      },
    });

    return NextResponse.json({ expenseCount });
  } catch (error) {
    console.error("Error getting payee info:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
