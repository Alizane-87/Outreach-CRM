import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import contractorsData from '../../../../data/contractors.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let synced = 0;
    const batchSize = 25;
    for (let i = 0; i < contractorsData.length; i += batchSize) {
      const chunk = (contractorsData as any[]).slice(i, i + batchSize);
      await Promise.all(
        chunk.map((c: any) => sql`
          INSERT INTO contractor_leads (
            id, company_name, location, domain, offer_type, active_ads_count,
            earliest_start_date, ad_format, primary_headline, primary_cta,
            primary_hook, destination_url, ad_library_url, media_url,
            page_id, ig_handle, ig_profile_url, ig_dm_url, fb_messenger_url,
            linkedin_search_url, dm_pitch_script, status, assigned_to
          ) VALUES (
            ${c.id},
            ${c.companyName || c.company_name || ''},
            ${c.location || 'USA Regional'},
            ${c.domain || 'N/A'},
            ${c.offerType || c.offer_type || 'Restoration'},
            ${c.activeAdsCount || c.active_ads_count || 1},
            ${c.earliestStartDate || c.earliest_start_date || 'Active'},
            ${c.format || c.ad_format || 'Image'},
            ${c.primaryHeadline || c.primary_headline || ''},
            ${c.primaryCta || c.primary_cta || 'See details'},
            ${c.primaryHook || c.primary_hook || ''},
            ${c.destinationUrl || c.destination_url || ''},
            ${c.adLibraryUrl || c.ad_library_url || ''},
            ${c.mediaUrl || ''},
            ${c.pageId || ''},
            ${c.igHandle || c.ig_handle || ''},
            ${c.igProfileUrl || c.ig_profile_url || ''},
            ${c.igDmUrl || c.ig_dm_url || ''},
            ${c.fbMessengerUrl || c.fb_messenger_url || ''},
            ${c.linkedInSearchUrl || c.linkedin_search_url || ''},
            ${c.dmPitchScript || c.dm_pitch_script || ''},
            ${c.status || 'to_contact'},
            ${c.assigned_to || 'unassigned'}
          )
          ON CONFLICT (id) DO UPDATE SET
            company_name = EXCLUDED.company_name,
            location = EXCLUDED.location,
            domain = EXCLUDED.domain,
            offer_type = EXCLUDED.offer_type,
            active_ads_count = EXCLUDED.active_ads_count,
            earliest_start_date = EXCLUDED.earliest_start_date,
            ad_format = EXCLUDED.ad_format,
            primary_headline = EXCLUDED.primary_headline,
            primary_cta = EXCLUDED.primary_cta,
            primary_hook = EXCLUDED.primary_hook,
            destination_url = EXCLUDED.destination_url,
            ad_library_url = EXCLUDED.ad_library_url,
            dm_pitch_script = EXCLUDED.dm_pitch_script,
            updated_at = NOW()
        `)
      );
      synced += chunk.length;
    }
    return NextResponse.json({
      success: true,
      message: `Successfully synchronized and upserted ${synced} contractors in Neon Postgres!`,
      total: contractorsData.length
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
