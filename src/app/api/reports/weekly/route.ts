import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pipelineSummary = await sql`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'to_contact' THEN 1 END) as to_contact,
        COUNT(CASE WHEN status = 'dm_sent' THEN 1 END) as dm_sent,
        COUNT(CASE WHEN status = 'replied' THEN 1 END) as replied,
        COUNT(CASE WHEN status = 'follow_up' THEN 1 END) as follow_up,
        COUNT(CASE WHEN status = 'booked' THEN 1 END) as booked,
        COUNT(CASE WHEN status = 'not_interested' THEN 1 END) as not_interested
      FROM contractor_leads;
    `;

    const weekStats = await sql`
      SELECT 
        COUNT(CASE WHEN action_type = 'status_change' AND to_value = 'dm_sent' THEN 1 END) as dms_sent_week,
        COUNT(CASE WHEN action_type = 'status_change' AND to_value = 'replied' THEN 1 END) as replies_week,
        COUNT(CASE WHEN action_type = 'status_change' AND to_value = 'booked' THEN 1 END) as booked_week,
        COUNT(CASE WHEN action_type = 'note_added' THEN 1 END) as notes_week
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '7 days';
    `;

    const repStats = await sql`
      SELECT 
        assigned_to as rep,
        COUNT(*) as total_assigned,
        COUNT(CASE WHEN status = 'dm_sent' THEN 1 END) as dms_sent,
        COUNT(CASE WHEN status = 'replied' THEN 1 END) as replied,
        COUNT(CASE WHEN status = 'follow_up' THEN 1 END) as follow_up,
        COUNT(CASE WHEN status = 'booked' THEN 1 END) as booked
      FROM contractor_leads
      GROUP BY assigned_to;
    `;

    const dailyActivity = await sql`
      SELECT 
        TO_CHAR(created_at, 'Dy (MM/DD)') as day_label,
        DATE(created_at) as date_val,
        COUNT(CASE WHEN action_type = 'status_change' AND to_value = 'dm_sent' THEN 1 END) as dms_sent,
        COUNT(CASE WHEN action_type = 'status_change' AND to_value = 'replied' THEN 1 END) as replied,
        COUNT(CASE WHEN action_type = 'status_change' AND to_value = 'booked' THEN 1 END) as booked
      FROM activity_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at), TO_CHAR(created_at, 'Dy (MM/DD)')
      ORDER BY date_val ASC;
    `;

    const recentActivity = await sql`
      SELECT 
        id, lead_id, company_name, action_type, from_value, to_value, rep_name,
        created_at
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT 30;
    `;

    return NextResponse.json({
      success: true,
      data: {
        pipeline: pipelineSummary[0],
        weekly: weekStats[0],
        reps: repStats,
        daily: dailyActivity,
        recent: recentActivity
      }
    });
  } catch (error: any) {
    console.error('Error generating weekly report:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
