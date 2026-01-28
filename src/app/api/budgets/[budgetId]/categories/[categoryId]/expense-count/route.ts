import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

async function checkBudgetAccess(budgetId: string, userId: string) {
  return db.budgetMember.findUnique({
    where: { budgetId_userId: { budgetId, userId } },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ budgetId: string; categoryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { budgetId, categoryId } = await params;
    const member = await checkBudgetAccess(budgetId, session.user.id);
    if (!member) {
      return NextResponse.json({ message: 'Budget not found' }, { status: 404 });
    }

    // Count expenses that have splits in this category
    const count = await db.expenseSplit.count({
      where: {
        categoryId,
        expense: {
          budgetId,
          isDeleted: false,
        },
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error counting expenses:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
