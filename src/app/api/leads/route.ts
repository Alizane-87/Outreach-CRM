import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import contractorsData from '../../../../data/contractors.json';

export const dynamic = 'force-dynamic';

const freshMap = new Map(
  contractorsData.map((c: any) => [
    c.id,
    {
      location: c.location,
      dm_pitch_script: c.dmPitchScript || c.dm_pitch_script,
    },
  ])
);

export async function GET(request: Request) {
  try {
    try {
      const leads = await sql`SELECT * FROM contractor_leads ORDER BY active_ads_count DESC, id ASC`;
      if (leads && leads.length > 0) {
        const dbLeadMap = new Map(leads.map((l: any) => [l.id, l]));

        // Overlay authoritative fresh pitch script and enriched location on existing DB leads
        const enrichedLeads = leads.map((l: any) => {
          const fresh = freshMap.get(l.id);
          return {
            ...l,
            location: fresh?.location || l.location,
            dm_pitch_script: fresh?.dm_pitch_script || l.dm_pitch_script,
          };
        });

        // Detect any contractors from contractors.json missing from PostgreSQL
        const missingFromDb = (contractorsData as any[]).filter((c: any) => !dbLeadMap.has(c.id));

        const formattedMissing = missingFromDb.map((c: any) => ({
          id: c.id,
          company_name: c.companyName || c.company_name,
          location: c.location,
          domain: c.domain,
          offer_type: c.offerType || c.offer_type,
          active_ads_count: c.activeAdsCount || c.active_ads_count || 1,
          earliest_start_date: c.earliestStartDate || c.earliest_start_date || 'Active',
          ad_format: c.format || c.ad_format || 'Image',
          primary_headline: c.primaryHeadline || c.primary_headline || '',
          primary_cta: c.primaryCta || c.primary_cta || '',
          primary_hook: c.primaryHook || c.primary_hook || '',
          destination_url: c.destinationUrl || c.destination_url || '',
          ad_library_url: c.adLibraryUrl || c.ad_library_url || '',
          media_url: c.mediaUrl || '',
          page_id: c.pageId || '',
          ig_handle: c.igHandle || c.ig_handle || '',
          ig_profile_url: c.igProfileUrl || c.ig_profile_url || '',
          ig_dm_url: c.igDmUrl || c.ig_dm_url || '',
          fb_messenger_url: c.fbMessengerUrl || c.fb_messenger_url || '',
          linkedin_search_url: c.linkedInSearchUrl || c.linkedin_search_url || '',
          dm_pitch_script: c.dmPitchScript || c.dm_pitch_script || '',
          status: c.status || 'to_contact',
          assigned_to: c.assigned_to || 'unassigned',
          notes: c.notes || '',
          last_contacted_at: c.last_contacted_at || null,
        }));

        const allLeads = [...enrichedLeads, ...formattedMissing];
        allLeads.sort((a: any, b: any) => (b.active_ads_count || 0) - (a.active_ads_count || 0));

        // Background update Neon Postgres: sync missing leads and update pitch scripts
        (async () => {
          try {
            // 1. Insert missing leads in non-blocking batches of 25
            if (missingFromDb.length > 0) {
              const batchSize = 25;
              for (let i = 0; i < missingFromDb.length; i += batchSize) {
                const chunk = missingFromDb.slice(i, i + batchSize);
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
                    ON CONFLICT (id) DO NOTHING
                  `)
                );
              }
            }

            // 2. Update pitch scripts for existing leads if changed
            for (const l of leads) {
              const fresh = freshMap.get(l.id);
              if (
                fresh &&
                (l.dm_pitch_script !== fresh.dm_pitch_script || l.location !== fresh.location)
              ) {
                await sql`
                  UPDATE contractor_leads 
                  SET dm_pitch_script = ${fresh.dm_pitch_script}, location = ${fresh.location}, updated_at = NOW() 
                  WHERE id = ${l.id}
                `;
              }
            }
          } catch (syncErr) {
            console.warn('Background Neon DB sync notice:', syncErr);
          }
        })();

        return NextResponse.json({ success: true, leads: allLeads, source: 'postgres_enriched' });
      }
    } catch (dbError: any) {
      console.warn('Postgres query notice, using local dataset fallback:', dbError.message);
    }

    // High-availability JSON Fallback
    const filePath = path.join(process.cwd(), 'data', 'contractors.json');
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      const rawLeads = JSON.parse(fileData);
      const formattedLeads = rawLeads.map((c: any) => ({
        id: c.id,
        company_name: c.companyName || c.company_name,
        location: c.location,
        domain: c.domain,
        offer_type: c.offerType || c.offer_type,
        active_ads_count: c.activeAdsCount || c.active_ads_count || 1,
        earliest_start_date: c.earliestStartDate || c.earliest_start_date,
        ad_format: c.format || c.ad_format || 'Image',
        primary_headline: c.primaryHeadline || c.primary_headline || '',
        primary_cta: c.primaryCta || c.primary_cta || '',
        primary_hook: c.primaryHook || c.primary_hook || '',
        destination_url: c.destinationUrl || c.destination_url || '',
        ad_library_url: c.adLibraryUrl || c.ad_library_url || '',
        ig_handle: c.igHandle || c.ig_handle || '',
        ig_profile_url: c.igProfileUrl || c.ig_profile_url || '',
        ig_dm_url: c.igDmUrl || c.ig_dm_url || '',
        fb_messenger_url: c.fbMessengerUrl || c.fb_messenger_url || '',
        linkedin_search_url: c.linkedInSearchUrl || c.linkedin_search_url || '',
        dm_pitch_script: c.dmPitchScript || c.dm_pitch_script || '',
        status: c.status || 'to_contact',
        assigned_to: c.assigned_to || 'unassigned',
        notes: c.notes || '',
        last_contacted_at: c.last_contacted_at || null,
      }));
      return NextResponse.json({ success: true, leads: formattedLeads, source: 'fallback_json' });
    }

    return NextResponse.json({ success: false, error: 'No leads found' }, { status: 404 });
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

