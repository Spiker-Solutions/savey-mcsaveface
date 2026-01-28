import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { InviteAcceptance } from '@/components/invitations/InviteAcceptance';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  
  const invitation = await db.invitation.findUnique({
    where: { token },
    include: {
      budget: { select: { id: true, name: true } },
      sentBy: { select: { name: true, email: true } },
    },
  });

  if (!invitation) {
    notFound();
  }

  if (invitation.status !== 'PENDING') {
    return <InviteAcceptance invitation={invitation} status="already_used" />;
  }

  if (invitation.expiresAt < new Date()) {
    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    return <InviteAcceptance invitation={invitation} status="expired" />;
  }

  const session = await auth();

  if (!session) {
    redirect(`/auth/signin?callbackUrl=/invite/${token}`);
  }

  // Check if user is already a member
  const existingMember = await db.budgetMember.findUnique({
    where: {
      budgetId_userId: {
        budgetId: invitation.budgetId,
        userId: session.user.id,
      },
    },
  });

  if (existingMember) {
    return <InviteAcceptance invitation={invitation} status="already_member" />;
  }

  return (
    <InviteAcceptance
      invitation={invitation}
      status="pending"
      userId={session.user.id}
    />
  );
}
