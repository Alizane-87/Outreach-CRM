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

    const existing = await sql`SELECT * FROM contractor_leads WHERE id = ${id}`;
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }
    const currentLead = existing[0];

    const updates = [];
    if (status !== undefined) {
      updates.push(`status = '${status.replace(/'/g, "''")}'`);
      if (status === 'dm_sent') {
        updates.push(`last_contacted_at = NOW()`);
      }

      await sql`
        INSERT INTO activity_logs (lead_id, company_name, action_type, from_value, to_value, rep_name)
        VALUES (${id}, ${currentLead.company_name}, 'status_change', ${currentLead.status || 'to_contact'}, ${status}, ${assigned_to || currentLead.assigned_to || 'unassigned'});
      `;
    }

    if (notes !== undefined) {
      updates.push(`notes = '${notes.replace(/'/g, "''")}'`);
      
      if (notes.trim().length > 0) {
        await sql`
          INSERT INTO activity_logs (lead_id, company_name, action_type, from_value, to_value, rep_name)
          VALUES (${id}, ${currentLead.company_name}, 'note_added', '', ${notes.slice(0, 100)}, ${currentLead.assigned_to || 'unassigned'});
        `;
      }
    }

    if (assigned_to !== undefined) {
      updates.push(`assigned_to = '${assigned_to.replace(/'/g, "''")}'`);

      await sql`
        INSERT INTO activity_logs (lead_id, company_name, action_type, from_value, to_value, rep_name)
        VALUES (${id}, ${currentLead.company_name}, 'rep_assigned', ${currentLead.assigned_to || 'unassigned'}, ${assigned_to}, ${assigned_to});
      `;
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
