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

    const url = new URL(request.url);
    const categoryId = url.searchParams.get("categoryId");
    const payeeId = url.searchParams.get("payeeId");
    const createdById = url.searchParams.get("createdById");
    const dateStart = url.searchParams.get("dateStart");
    const dateEnd = url.searchParams.get("dateEnd");
    const minAmount = url.searchParams.get("minAmount");
    const maxAmount = url.searchParams.get("maxAmount");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {
      budgetId,
      isDeleted: false,
    };

    if (categoryId) {
      where.splits = { some: { categoryId } };
    }

    if (payeeId) {
      where.payeeId = payeeId;
    }

    if (createdById) {
      where.createdById = createdById;
    }

    if (dateStart || dateEnd) {
      where.date = {};
      if (dateStart)
        (where.date as Record<string, unknown>).gte = new Date(dateStart);
      if (dateEnd)
        (where.date as Record<string, unknown>).lte = new Date(dateEnd);
    }

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount)
        (where.amount as Record<string, unknown>).gte = parseInt(minAmount);
      if (maxAmount)
        (where.amount as Record<string, unknown>).lte = parseInt(maxAmount);
    }

    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        include: {
          payee: true,
          splits: {
            include: { category: true },
          },
          tags: {
            include: { tag: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      }),
      db.expense.count({ where }),
    ]);

    return NextResponse.json({ expenses, total, limit, offset });
  } catch (error) {
    console.error("Error fetching expenses:", error);
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
    const { payeeId, payeeName, amount, date, description, splits, tagIds } =
      body;

    if (!amount || !date || !splits || splits.length === 0) {
      return NextResponse.json(
        {
          message: "Amount, date, and at least one category split are required",
        },
        { status: 400 },
      );
    }

    // Handle payee - create new if payeeName provided, otherwise use payeeId
    let finalPayeeId = payeeId || null;
    if (!payeeId && payeeName) {
      // Check if payee with this name already exists for this budget
      let existingPayee = await db.payee.findFirst({
        where: { budgetId, name: payeeName, isDeleted: false },
      });

      if (!existingPayee) {
        // Create new payee
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

    // Check category permissions
    for (const split of splits) {
      const category = await db.category.findUnique({
        where: { id: split.categoryId },
      });
      if (!category || category.budgetId !== budgetId) {
        return NextResponse.json(
          { message: "Invalid category" },
          { status: 400 },
        );
      }
      if (!category.editableByAll && member.role !== "OWNER") {
        return NextResponse.json(
          {
            message: `You don't have permission to add expenses to "${category.name}"`,
          },
          { status: 403 },
        );
      }
    }

    const expense = await db.expense.create({
      data: {
        budgetId,
        payeeId: finalPayeeId,
        amount,
        date: new Date(date),
        description,
        createdById: session.user.id,
        splits: {
          create: splits.map(
            (split: {
              categoryId: string;
              allocationMethod: string;
              allocationValue: number;
            }) => ({
              categoryId: split.categoryId,
              allocationMethod: split.allocationMethod || "FIXED",
              allocationValue: split.allocationValue,
              createdById: session.user.id,
            }),
          ),
        },
        tags: tagIds?.length
          ? {
              create: tagIds.map((tagId: string) => ({ tagId })),
            }
          : undefined,
      },
      include: {
        payee: true,
        splits: {
          include: { category: true },
        },
        tags: {
          include: { tag: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
