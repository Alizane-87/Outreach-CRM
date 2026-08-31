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

    if (status !== undefined) {
      if (status === 'dm_sent') {
        await sql`UPDATE contractor_leads SET status = ${status}, last_contacted_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
      } else {
        await sql`UPDATE contractor_leads SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
      }

      try {
        await sql`
          INSERT INTO activity_logs (lead_id, company_name, action_type, from_value, to_value, rep_name)
          VALUES (${id}, ${currentLead.company_name}, 'status_change', ${currentLead.status || 'to_contact'}, ${status}, ${assigned_to || currentLead.assigned_to || 'unassigned'});
        `;
      } catch (logErr) {
        console.warn('Activity log write notice:', logErr);
      }
    }

    if (notes !== undefined) {
      await sql`UPDATE contractor_leads SET notes = ${notes}, updated_at = NOW() WHERE id = ${id}`;
      
      if (notes.trim().length > 0) {
        try {
          await sql`
            INSERT INTO activity_logs (lead_id, company_name, action_type, from_value, to_value, rep_name)
            VALUES (${id}, ${currentLead.company_name}, 'note_added', '', ${notes.slice(0, 100)}, ${currentLead.assigned_to || 'unassigned'});
          `;
        } catch (logErr) {
          console.warn('Activity log note notice:', logErr);
        }
      }
    }

    if (assigned_to !== undefined) {
      await sql`UPDATE contractor_leads SET assigned_to = ${assigned_to}, updated_at = NOW() WHERE id = ${id}`;

      try {
        await sql`
          INSERT INTO activity_logs (lead_id, company_name, action_type, from_value, to_value, rep_name)
          VALUES (${id}, ${currentLead.company_name}, 'rep_assigned', ${currentLead.assigned_to || 'unassigned'}, ${assigned_to}, ${assigned_to});
        `;
      } catch (logErr) {
        console.warn('Activity log rep notice:', logErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
