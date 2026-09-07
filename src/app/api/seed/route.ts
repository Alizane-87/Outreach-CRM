import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import contractorsData from '../../../../data/contractors.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let updated = 0;
    for (const c of contractorsData) {
      await sql`
        UPDATE contractor_leads 
        SET location = ${c.location}, dm_pitch_script = ${c.dmPitchScript || c.dm_pitch_script}, updated_at = NOW() 
        WHERE id = ${c.id}
      `;
      updated++;
    }
    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${updated} contractors in Neon Postgres!`,
      total: contractorsData.length
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
