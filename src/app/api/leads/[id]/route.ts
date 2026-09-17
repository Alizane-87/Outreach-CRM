import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import contractorsData from '../../../../../data/contractors.json';

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
    let currentLead = existing && existing.length > 0 ? existing[0] : null;

    if (!currentLead) {
      const fallbackLead = (contractorsData as any[]).find((c: any) => c.id === id);
      if (!fallbackLead) {
        return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
      }
      await sql`
        INSERT INTO contractor_leads (
          id, company_name, location, domain, offer_type, active_ads_count,
          earliest_start_date, ad_format, primary_headline, primary_cta,
          primary_hook, destination_url, ad_library_url, media_url,
          page_id, ig_handle, ig_profile_url, ig_dm_url, fb_messenger_url,
          linkedin_search_url, dm_pitch_script, status, assigned_to
        ) VALUES (
          ${fallbackLead.id},
          ${fallbackLead.companyName || fallbackLead.company_name || ''},
          ${fallbackLead.location || 'USA Regional'},
          ${fallbackLead.domain || 'N/A'},
          ${fallbackLead.offerType || fallbackLead.offer_type || 'Restoration'},
          ${fallbackLead.activeAdsCount || fallbackLead.active_ads_count || 1},
          ${fallbackLead.earliestStartDate || fallbackLead.earliest_start_date || 'Active'},
          ${fallbackLead.format || fallbackLead.ad_format || 'Image'},
          ${fallbackLead.primaryHeadline || fallbackLead.primary_headline || ''},
          ${fallbackLead.primaryCta || fallbackLead.primary_cta || 'See details'},
          ${fallbackLead.primaryHook || fallbackLead.primary_hook || ''},
          ${fallbackLead.destinationUrl || fallbackLead.destination_url || ''},
          ${fallbackLead.adLibraryUrl || fallbackLead.ad_library_url || ''},
          ${fallbackLead.mediaUrl || ''},
          ${fallbackLead.pageId || ''},
          ${fallbackLead.igHandle || fallbackLead.ig_handle || ''},
          ${fallbackLead.igProfileUrl || fallbackLead.ig_profile_url || ''},
          ${fallbackLead.igDmUrl || fallbackLead.ig_dm_url || ''},
          ${fallbackLead.fbMessengerUrl || fallbackLead.fb_messenger_url || ''},
          ${fallbackLead.linkedInSearchUrl || fallbackLead.linkedin_search_url || ''},
          ${fallbackLead.dmPitchScript || fallbackLead.dm_pitch_script || ''},
          ${status || 'to_contact'},
          ${assigned_to || 'unassigned'}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      currentLead = {
        id: fallbackLead.id,
        company_name: fallbackLead.companyName || fallbackLead.company_name || '',
        status: status || 'to_contact',
        assigned_to: assigned_to || 'unassigned',
      };
    }

    if (status !== undefined) {
      if (status === 'dm_sent') {
        await sql`UPDATE contractor_leads SET status = ${status}, last_contacted_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
      } else if (status === 'to_contact') {
        await sql`UPDATE contractor_leads SET status = ${status}, last_contacted_at = NULL, updated_at = NOW() WHERE id = ${id}`;
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
