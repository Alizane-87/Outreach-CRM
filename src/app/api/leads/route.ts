import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const rep = searchParams.get('rep');
    const niche = searchParams.get('niche');
    const search = searchParams.get('search')?.toLowerCase();

    let query = `SELECT * FROM contractor_leads`;
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push(`status = '${status.replace(/'/g, "''")}'`);
    }

    if (rep && rep !== 'all') {
      conditions.push(`assigned_to = '${rep.replace(/'/g, "''")}'`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY active_ads_count DESC, id ASC`;

    const leads = await sql(query);
    return NextResponse.json({ success: true, leads });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
