import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, assigned_to } = body;

    const updates = [];
    if (status !== undefined) {
      updates.push(`status = '${status.replace(/'/g, "''")}'`);
      if (status === 'dm_sent') {
        updates.push(`last_contacted_at = NOW()`);
      }
    }
    if (notes !== undefined) {
      updates.push(`notes = '${notes.replace(/'/g, "''")}'`);
    }
    if (assigned_to !== undefined) {
      updates.push(`assigned_to = '${assigned_to.replace(/'/g, "''")}'`);
    }

    updates.push(`updated_at = NOW()`);

    const updateQuery = `
      UPDATE contractor_leads 
      SET ${updates.join(', ')} 
      WHERE id = '${id.replace(/'/g, "''")}'
      RETURNING *
    `;

    const result = await sql(updateQuery);
    return NextResponse.json({ success: true, lead: result[0] });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
