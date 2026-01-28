import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;

    const invitation = await db.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json({ message: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ message: 'Invitation already used' }, { status: 400 });
    }

    if (invitation.expiresAt < new Date()) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json({ message: 'Invitation expired' }, { status: 400 });
    }

    // Check if already a member
    const existingMember = await db.budgetMember.findUnique({
      where: {
        budgetId_userId: {
          budgetId: invitation.budgetId,
          userId: session.user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ message: 'Already a member' }, { status: 400 });
    }

    // Accept invitation in a transaction
    await db.$transaction([
      db.budgetMember.create({
        data: {
          budgetId: invitation.budgetId,
          userId: session.user.id,
          role: invitation.role,
          addedById: invitation.sentById,
        },
      }),
      db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    return NextResponse.json({ message: 'Invitation accepted', budgetId: invitation.budgetId });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
