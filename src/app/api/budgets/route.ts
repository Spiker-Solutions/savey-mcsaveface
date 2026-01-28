import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const budgets = await db.budget.findMany({
      where: {
        isDeleted: false,
        members: {
          some: { userId: session.user.id },
        },
      },
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
        _count: {
          select: { expenses: { where: { isDeleted: false } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      totalAmount,
      currency = "USD",
      locale = "en-US",
      cycleType = "MONTHLY",
      cycleStartDay,
      startDate,
      carryOverEnabled = false,
      carryOverNegative = false,
    } = body;

    if (!name || totalAmount === undefined) {
      return NextResponse.json(
        { message: "Name and total amount are required" },
        { status: 400 },
      );
    }

    const budget = await db.budget.create({
      data: {
        name,
        totalAmount,
        currency,
        locale,
        cycleType,
        cycleStartDay,
        // Parse YYYY-MM-DD as UTC noon to avoid timezone day shift
        startDate: startDate
          ? typeof startDate === "string" &&
            startDate.match(/^\d{4}-\d{2}-\d{2}$/)
            ? new Date(`${startDate}T12:00:00.000Z`)
            : new Date(startDate)
          : null,
        carryOverEnabled,
        carryOverNegative,
        createdById: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
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

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
