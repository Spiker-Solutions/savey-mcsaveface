import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { BudgetDetail } from '@/components/budgets/BudgetDetail';

interface BudgetPageProps {
  params: Promise<{ budgetId: string }>;
}

export default async function BudgetPage({ params }: BudgetPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const { budgetId } = await params;

  const member = await db.budgetMember.findUnique({
    where: {
      budgetId_userId: { budgetId, userId: session.user.id },
    },
  });

  if (!member) {
    notFound();
  }

  const budget = await db.budget.findUnique({
    where: { id: budgetId, isDeleted: false },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      categories: {
        where: { isDeleted: false },
        orderBy: { sortOrder: 'asc' },
      },
      payees: {
        where: { isDeleted: false },
        orderBy: { name: 'asc' },
      },
      tags: {
        where: { isDeleted: false },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!budget) {
    notFound();
  }

  return <BudgetDetail budget={budget} userRole={member.role} userId={session.user.id} />;
}
