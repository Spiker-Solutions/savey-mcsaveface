import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function checkBudgetAccess(budgetId: string, userId: string) {
  return db.budgetMember.findUnique({
    where: { budgetId_userId: { budgetId, userId } },
  });
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
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { message: "Payee name is required" },
        { status: 400 },
      );
    }

    // Check if payee already exists
    const existingPayee = await db.payee.findFirst({
      where: { budgetId, name: name.trim() },
    });

    if (existingPayee) {
      return NextResponse.json(
        { message: "A payee with this name already exists" },
        { status: 400 },
      );
    }

    const payee = await db.payee.create({
      data: {
        budgetId,
        name: name.trim(),
        createdById: session.user.id,
      },
    });

    return NextResponse.json(payee, { status: 201 });
  } catch (error) {
    console.error("Error creating payee:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
