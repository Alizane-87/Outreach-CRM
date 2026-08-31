import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'to_contact' THEN 1 END) as to_contact,
        COUNT(CASE WHEN status = 'dm_sent' THEN 1 END) as dm_sent,
        COUNT(CASE WHEN status = 'replied' THEN 1 END) as replied,
        COUNT(CASE WHEN status = 'follow_up' THEN 1 END) as follow_up,
        COUNT(CASE WHEN status = 'booked' THEN 1 END) as booked,
        COUNT(CASE WHEN status = 'not_interested' THEN 1 END) as not_interested,
        COUNT(CASE WHEN status != 'to_contact' AND DATE(last_contacted_at) = CURRENT_DATE THEN 1 END) as sent_today
      FROM contractor_leads;
    `;
    return NextResponse.json({ success: true, stats: result[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
