import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendInvitationEmail } from '@/lib/email';

async function checkBudgetAccess(budgetId: string, userId: string) {
  return db.budgetMember.findUnique({
    where: { budgetId_userId: { budgetId, userId } },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { budgetId } = await params;
    const member = await checkBudgetAccess(budgetId, session.user.id);
    if (!member || member.role !== 'OWNER') {
      return NextResponse.json({ message: 'Only owners can view invitations' }, { status: 403 });
    }

    const invitations = await db.invitation.findMany({
      where: { budgetId },
      include: {
        sentBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ budgetId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { budgetId } = await params;
    const member = await checkBudgetAccess(budgetId, session.user.id);
    if (!member || member.role !== 'OWNER') {
      return NextResponse.json({ message: 'Only owners can send invitations' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role = 'EDITOR', expiresInDays = 3 } = body;

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    // Check if user is already a member
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await db.budgetMember.findUnique({
        where: { budgetId_userId: { budgetId, userId: existingUser.id } },
      });
      if (existingMember) {
        return NextResponse.json({ message: 'User is already a member' }, { status: 400 });
      }
    }

    // Check for pending invitation
    const pendingInvitation = await db.invitation.findFirst({
      where: {
        budgetId,
        email,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });
    if (pendingInvitation) {
      return NextResponse.json({ message: 'A pending invitation already exists' }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invitation = await db.invitation.create({
      data: {
        budgetId,
        email,
        role,
        expiresAt,
        sentById: session.user.id,
      },
    });

    // Get budget and sender info for email
    const [budget, sender] = await Promise.all([
      db.budget.findUnique({ where: { id: budgetId } }),
      db.user.findUnique({ where: { id: session.user.id } }),
    ]);

    // Send invitation email
    try {
      const baseUrl = process.env.AUTH_URL || 'http://localhost:3000';
      await sendInvitationEmail({
        to: email,
        inviterName: sender?.name || sender?.email || 'Someone',
        budgetName: budget?.name || 'a budget',
        inviteUrl: `${baseUrl}/invite/${invitation.token}`,
        expiresAt,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
