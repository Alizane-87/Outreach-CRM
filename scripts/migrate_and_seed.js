const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_G0YbKCch1JlQ@ep-little-dream-a5dfnw2y-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
const sql = neon(databaseUrl);

async function main() {
  console.log('⚡ Connecting to Neon Postgres...');

  await sql`
    CREATE TABLE IF NOT EXISTS contractor_leads (
      id VARCHAR(255) PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL,
      location VARCHAR(255),
      domain VARCHAR(255),
      offer_type VARCHAR(255),
      active_ads_count INTEGER DEFAULT 1,
      earliest_start_date VARCHAR(50),
      ad_format VARCHAR(50),
      primary_headline TEXT,
      primary_cta VARCHAR(100),
      primary_hook TEXT,
      destination_url TEXT,
      ad_library_url TEXT,
      media_url TEXT,
      page_id VARCHAR(100),
      ig_handle VARCHAR(100),
      ig_profile_url TEXT,
      ig_dm_url TEXT,
      fb_messenger_url TEXT,
      linkedin_search_url TEXT,
      dm_pitch_script TEXT,
      status VARCHAR(50) DEFAULT 'to_contact',
      assigned_to VARCHAR(100) DEFAULT 'unassigned',
      notes TEXT DEFAULT '',
      last_contacted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_leads_status ON contractor_leads(status);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_assigned ON contractor_leads(assigned_to);`;

  // Read the HTML dashboard to extract the embedded contractors JSON
  const htmlPath = 'd:/Alizane Labs/Alizane Labs - Antigravity/restoration_ads_exact_match_sheet.html';
  const html = fs.readFileSync(htmlPath, 'utf8');
  const match = html.match(/const contractors = (\[.*?\]);/s);
  
  if (!match) {
    console.error('Could not find contractors JSON in dashboard HTML');
    process.exit(1);
  }

  const contractors = JSON.parse(match[1]);
  console.log(`Loaded ${contractors.length} contractors from master intelligence dataset!`);

  let inserted = 0;
  for (const c of contractors) {
    const id = c.id || c.companyName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const companyName = c.companyName || '';
    const location = c.location || 'USA Regional';
    const domain = c.domain || 'N/A';
    const offerType = c.offerType || 'Restoration';
    const activeAdsCount = c.activeAdsCount || 1;
    const earliestStartDate = c.earliestStartDate || 'Active';
    const adFormat = c.format || 'IMAGE';
    const primaryHeadline = c.primaryHeadline || '';
    const primaryCta = c.primaryCta || 'See details';
    const primaryHook = c.primaryHook || '';
    const destinationUrl = c.destinationUrl || '';
    const adLibraryUrl = c.adLibraryUrl || '';
    const mediaUrl = c.mediaUrl || '';
    const pageId = c.pageId || '';
    const igHandle = c.igHandle || '';
    const igProfileUrl = c.igProfileUrl || `https://www.instagram.com/${igHandle}/`;
    const igDmUrl = c.igDmUrl || `https://ig.me/m/${igHandle}`;
    const fbMessengerUrl = c.fbMessengerUrl || (pageId ? `https://m.me/${pageId}` : `https://m.me/${igHandle}`);
    const linkedInSearchUrl = c.linkedInSearchUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(companyName + ' Owner OR Founder')}`;
    const dmPitchScript = c.dmPitchScript || '';

    await sql`
      INSERT INTO contractor_leads (
        id, company_name, location, domain, offer_type, active_ads_count,
        earliest_start_date, ad_format, primary_headline, primary_cta,
        primary_hook, destination_url, ad_library_url, media_url,
        page_id, ig_handle, ig_profile_url, ig_dm_url, fb_messenger_url,
        linkedin_search_url, dm_pitch_script
      ) VALUES (
        ${id}, ${companyName}, ${location}, ${domain}, ${offerType}, ${activeAdsCount},
        ${earliestStartDate}, ${adFormat}, ${primaryHeadline}, ${primaryCta},
        ${primaryHook}, ${destinationUrl}, ${adLibraryUrl}, ${mediaUrl},
        ${pageId}, ${igHandle}, ${igProfileUrl}, ${igDmUrl}, ${fbMessengerUrl},
        ${linkedInSearchUrl}, ${dmPitchScript}
      )
      ON CONFLICT (id) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        location = EXCLUDED.location,
        domain = EXCLUDED.domain,
        offer_type = EXCLUDED.offer_type,
        active_ads_count = EXCLUDED.active_ads_count,
        earliest_start_date = EXCLUDED.earliest_start_date,
        primary_headline = EXCLUDED.primary_headline,
        primary_cta = EXCLUDED.primary_cta,
        primary_hook = EXCLUDED.primary_hook,
        destination_url = EXCLUDED.destination_url,
        ad_library_url = EXCLUDED.ad_library_url,
        media_url = EXCLUDED.media_url,
        ig_handle = EXCLUDED.ig_handle,
        ig_profile_url = EXCLUDED.ig_profile_url,
        ig_dm_url = EXCLUDED.ig_dm_url,
        fb_messenger_url = EXCLUDED.fb_messenger_url,
        linkedin_search_url = EXCLUDED.linkedin_search_url,
        dm_pitch_script = EXCLUDED.dm_pitch_script,
        updated_at = NOW();
    `;
    inserted++;
  }

  console.log(`🎉 SUCCESS! Seeded and synchronized ${inserted} contractors in Neon Postgres!`);
  const count = await sql`SELECT COUNT(*) FROM contractor_leads;`;
  console.log(`⚡ LIVE DATABASE COUNT: ${count[0].count} contractor leads ready for outreach!`);
  process.exit(0);
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
