import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { LoadingOverlay } from '@mantine/core';

async function getDashboardData(userId: string) {
  const budgets = await db.budget.findMany({
    where: {
      isDeleted: false,
      members: {
        some: { userId },
      },
    },
    include: {
      members: {
        include: { user: true },
      },
      categories: {
        where: { isDeleted: false },
      },
      _count: {
        select: {
          expenses: { where: { isDeleted: false } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return { budgets };
}

export default async function DashboardPage() {
  const session = await auth();
  const { budgets } = await getDashboardData(session!.user.id);

  return (
    <Suspense fallback={<LoadingOverlay visible />}>
      <DashboardContent budgets={budgets} />
    </Suspense>
  );
}
