const fs = require('fs');
const path = require('path');

const SCRAPES_DIR = path.join(__dirname, '..', 'data', 'scrapes');
const CONTRACTORS_FILE = path.join(__dirname, '..', 'data', 'contractors.json');

// Blacklist filter (purges B2B agencies, franchise pitches, e-com dehumidifier stores, and non-restoration)
function isBlacklisted(fullText, pageName) {
  const t = fullText.toLowerCase();
  const p = pageName.toLowerCase();
  
  const blacklistedTerms = [
    'franchise', 'franchising', 'business opportunity',
    'abestorm', 'alorair', 'commercial dehumidifier', 'dehumidifier - $', 'air scrubber - $',
    'shane o dazier', 'cardone', 'northeast water remediation', 'prosperity ppc', 'max systems',
    'eliodore', 'water restoration marketing', 'growth framework', 'stop paying angi',
    'chatgpt', 'gas media digital', 'howdy rv', 'techy tradition', 'phone repair',
    'rv repair', 'finest watches', 'watch repair', 'the tgc', 'marketing agency', 'lead generation for contractors',
    'seo agency', 'smma'
  ];

  if (blacklistedTerms.some(term => t.includes(term) || p.includes(term))) {
    return true;
  }

  if (t.includes('dehumidifier') && (t.includes('shop now') || t.includes('add to cart') || t.includes('$450') || t.includes('$200'))) {
    return true;
  }

  return false;
}

// Enhanced Geographic Metro & Territory Detector
function detectLocation(text) {
  const t = text.toLowerCase();
  
  if (t.includes('orange county')) return 'Orange County, CA';
  if (t.includes('san diego') || t.includes('palomar')) return 'San Diego, CA';
  if (t.includes('los angeles') || t.includes('south bay') || t.includes('long beach')) return 'Los Angeles, CA';
  if (t.includes('atwater') || t.includes('merced') || t.includes('fresno') || t.includes('central valley')) return 'Central Valley, CA';
  if (t.includes('san francisco') || t.includes('bay area') || t.includes('oakland') || t.includes('san jose')) return 'Bay Area, CA';
  if (t.includes('sacramento')) return 'Sacramento, CA';

  if (t.includes('nyc') || t.includes('new york city') || t.includes('manhattan') || t.includes('brooklyn') || t.includes('queens') || t.includes('bronx') || t.includes('staten island')) return 'New York City, NY';
  if (t.includes('long island') || t.includes('nassau') || t.includes('suffolk')) return 'Long Island, NY';
  if (t.includes('morris') || t.includes('bergen') || t.includes('passaic') || t.includes('jersey city') || t.includes('newark') || t.includes('pdq') || t.includes('mold men nj')) return 'Northern New Jersey';
  if (t.includes('cape may') || t.includes('atlantic county') || t.includes('south jersey')) return 'South Jersey / Cape May';

  if (t.includes('dfw') || t.includes('denton') || t.includes('frisco') || t.includes('dallas') || t.includes('fort worth') || t.includes('arlington, tx') || t.includes('plano')) return 'Dallas-Fort Worth, TX';
  if (t.includes('houston') || t.includes('woodlands') || t.includes('katy, tx') || t.includes('sugar land')) return 'Houston, TX';
  if (t.includes('austin') || t.includes('round rock')) return 'Austin, TX';
  if (t.includes('san antonio')) return 'San Antonio, TX';
  if (t.includes('el paso')) return 'El Paso, TX';

  if (t.includes('oviedo') || t.includes('orlando') || t.includes('kissimmee') || t.includes('central florida')) return 'Orlando / Central FL';
  if (t.includes('tampa') || t.includes('st. petersburg') || t.includes('clearwater') || t.includes('tampa bay')) return 'Tampa Bay, FL';
  if (t.includes('port st. lucie') || t.includes('treasure coast') || t.includes('st. lucie')) return 'Port St. Lucie, FL';
  if (t.includes('miami') || t.includes('broward') || t.includes('fort lauderdale') || t.includes('south florida') || t.includes('palm beach')) return 'Miami / South FL';
  if (t.includes('jacksonville')) return 'Jacksonville, FL';

  if (t.includes('edmonds') || t.includes('seattle') || t.includes('snohomish') || t.includes('tacoma') || t.includes('bellevue')) return 'Seattle / Puget Sound, WA';
  if (t.includes('vancouver, wa') || t.includes('clark county')) return 'Vancouver, WA';
  if (t.includes('portland')) return 'Portland, OR';
  if (t.includes('brookings') || t.includes('grants pass') || t.includes('southern oregon')) return 'Southern Oregon';

  if (t.includes('phoenix') || t.includes('scottsdale') || t.includes('mesa, az') || t.includes('chandler')) return 'Phoenix Metro, AZ';
  if (t.includes('tucson')) return 'Tucson, AZ';

  if (t.includes('atlanta') || t.includes('marietta') || t.includes('alpharetta') || t.includes('gwinnett')) return 'Atlanta Metro, GA';
  if (t.includes('northeast georgia') || t.includes('gainesville, ga')) return 'Northeast Georgia';

  if (t.includes('charlotte') || t.includes('mecklenburg')) return 'Charlotte, NC';
  if (t.includes('raleigh') || t.includes('durham') || t.includes('cary, nc') || t.includes('triangle')) return 'Raleigh-Durham, NC';
  if (t.includes('salisbury') || /\bnc\b/.test(t) || t.includes('north carolina')) return 'North Carolina';

  if (t.includes('charleston') || t.includes('lowcountry')) return 'Charleston, SC';
  if (t.includes('greenville') || t.includes('spartanburg') || t.includes('anderson, sc') || t.includes('clemson') || t.includes('upstate sc')) return 'Upstate SC';

  if (t.includes('nashville') || t.includes('davidson county') || t.includes('murfreesboro')) return 'Nashville, TN';
  if (t.includes('memphis') || t.includes('mid-south')) return 'Memphis, TN';
  if (t.includes('knoxville')) return 'Knoxville, TN';

  if (t.includes('indianapolis') || t.includes('pendleton') || t.includes('anderson, in') || t.includes('muncie') || t.includes('noblesville') || t.includes('central indiana')) return 'Central Indiana';
  if (t.includes('chicago') || t.includes('chicagoland') || t.includes('naperville') || t.includes('cook county')) return 'Chicago Metro, IL';
  if (t.includes('milwaukee') || t.includes('wisconsin')) return 'Wisconsin';
  if (t.includes('minneapolis') || t.includes('st. paul') || t.includes('twin cities')) return 'Twin Cities, MN';
  if (t.includes('detroit') || t.includes('oakland county') || t.includes('wayne county')) return 'Detroit Metro, MI';
  if (t.includes('columbus, oh') || t.includes('cleveland') || t.includes('cincinnati')) return 'Ohio Metro';
  if (t.includes('st. louis') || t.includes('kansas city') || t.includes('missouri')) return 'Missouri Metro';

  if (t.includes('denver') || t.includes('aurora, co') || t.includes('boulder') || t.includes('colorado springs')) return 'Denver Metro, CO';
  if (t.includes('salt lake city') || t.includes('utah county')) return 'Salt Lake City, UT';
  if (t.includes('las vegas') || t.includes('clark county, nv') || t.includes('henderson')) return 'Las Vegas, NV';
  if (t.includes('albuquerque') || t.includes('new mexico')) return 'New Mexico';
  if (t.includes('oklahoma city') || t.includes('okc') || t.includes('tulsa')) return 'Oklahoma';
  if (t.includes('omaha') || t.includes('nebraska')) return 'Omaha, NE';
  if (t.includes('idaho') || t.includes('boise')) return 'Idaho';
  if (t.includes('wyoming') || t.includes('casper')) return 'Wyoming';
  if (t.includes('birmingham') || t.includes('huntsville') || t.includes('alabama')) return 'Alabama';
  if (t.includes('arkansas') || t.includes('little rock')) return 'Arkansas';
  if (t.includes('lafayette') || t.includes('acadiana') || t.includes('new orleans') || t.includes('baton rouge') || t.includes('louisiana')) return 'Louisiana';
  if (t.includes('harford') || t.includes('bel air') || t.includes('baltimore') || t.includes('maryland')) return 'Maryland';
  if (t.includes('philadelphia') || t.includes('pennsylvania') || t.includes('pittsburgh')) return 'Pennsylvania';
  if (t.includes('virginia beach') || t.includes('richmond, va') || t.includes('northern virginia')) return 'Virginia';

  return 'USA Regional';
}

function detectOfferType(fullText) {
  const t = fullText.toLowerCase();
  if (t.includes('fire') || t.includes('smoke') || t.includes('soot')) {
    return 'Fire, Smoke & Soot Damage Restoration';
  } else if (t.includes('mold') || t.includes('remediation') || t.includes('mildew') || t.includes('spores')) {
    return 'Certified Mold Remediation & Inspection';
  } else if (t.includes('flood') || t.includes('storm') || t.includes('hurricane')) {
    return 'Emergency Flood & Storm Mitigation';
  } else if (t.includes('sewage') || t.includes('biohazard') || t.includes('black water')) {
    return 'Emergency Sewage & Biohazard Cleanup';
  } else if (t.includes('carpet') || t.includes('tile') || t.includes('floor')) {
    return 'Carpet & Floor Emergency Water Extraction';
  } else if (t.includes('crawl space') || t.includes('crawlspace') || t.includes('insulation') || t.includes('encapsulation')) {
    return 'Crawl Space Moisture & Encapsulation';
  } else if (t.includes('roof') || t.includes('tarp')) {
    return 'Roof Leak & Storm Mitigation';
  }
  return '24/7 Water Damage Extraction & Drying';
}

function generatePitchScript(companyName, location) {
  const metro = (location && location !== 'USA Regional') ? location : 'your area';
  return `Saw your ads running in ${metro} — most people who click through won't call. They'll read, leave, and you've paid for that click either way.\n\nWe built a chatbot that catches those visitors before they bounce, grabs their contact info, and alerts you the moment it comes in — plus a report on every chat and lead, so you can see who's actually interested. It's actually live on our own site right now if you want to try it yourself: alizanelabs.site.\n\nFree for 14 days — just one script tag for whoever manages your site to add to the header, 2 minutes and it's live. Want me to set it up?`;
}

function normalizeKey(str) {
  return str.toLowerCase()
    .replace(/llc\.?|inc\.?|services|corporation|group|restoration|cleanup|construction/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim() || str.toLowerCase();
}

function cleanDomain(urlStr) {
  if (!urlStr || !urlStr.startsWith('http')) return '';
  try {
    const u = new URL(urlStr);
    let d = u.hostname.replace(/^www\./, '').toLowerCase();
    if (d.includes('facebook.com') || d.includes('fb.me') || d.includes('instagram.com') || d.includes('whatsapp.com') || d.includes('linktr.ee')) {
      return '';
    }
    return d;
  } catch (e) {
    return '';
  }
}

async function main() {
  console.log('🔍 Checking for ScrapeCreators JSON files in:', SCRAPES_DIR);

  if (!fs.existsSync(SCRAPES_DIR)) {
    fs.mkdirSync(SCRAPES_DIR, { recursive: true });
  }

  const files = fs.readdirSync(SCRAPES_DIR).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('\n⚠️ No .json files found in Outreach-CRM/data/scrapes/');
    console.log('👉 Drop your raw ScrapeCreators JSON results in this folder:');
    console.log('   ' + SCRAPES_DIR);
    return;
  }

  console.log(`Found ${files.length} JSON file(s): ${files.join(', ')}`);

  let existingLeads = [];
  if (fs.existsSync(CONTRACTORS_FILE)) {
    existingLeads = JSON.parse(fs.readFileSync(CONTRACTORS_FILE, 'utf8'));
  }
  console.log(`Current existing CRM leads: ${existingLeads.length}`);

  const existingDomains = new Set(existingLeads.map(c => (c.domain || '').toLowerCase().replace(/^www\./, '')).filter(Boolean));
  const existingKeys = new Set(existingLeads.map(c => normalizeKey(c.companyName || c.company_name || '')));

  let rawAds = [];
  for (const file of files) {
    try {
      const filePath = path.join(SCRAPES_DIR, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      let adsInFile = [];
      if (Array.isArray(content)) {
        adsInFile = content;
      } else if (content.searchResults && Array.isArray(content.searchResults)) {
        adsInFile = content.searchResults;
      } else if (content.data && Array.isArray(content.data)) {
        adsInFile = content.data;
      }

      console.log(`Loaded ${adsInFile.length} ads from ${file}`);
      rawAds.push(...adsInFile);
    } catch (err) {
      console.error(`Error reading ${file}:`, err.message);
    }
  }

  console.log(`\nTotal raw ad records loaded: ${rawAds.length}`);

  const uniqueAds = [];
  const seenArchiveIds = new Set();
  for (const ad of rawAds) {
    const archiveId = ad.ad_archive_id || ad.id;
    if (archiveId && !seenArchiveIds.has(archiveId)) {
      seenArchiveIds.add(archiveId);
      uniqueAds.push(ad);
    } else if (!archiveId) {
      uniqueAds.push(ad);
    }
  }

  console.log(`Unique ads after archive ID deduplication: ${uniqueAds.length}`);

  const newContractorsMap = new Map();
  let blacklistedCount = 0;

  for (const ad of uniqueAds) {
    const snap = ad.snapshot || {};
    let bodyText = (snap.body && snap.body.text) || '';
    if (!bodyText && snap.cards && snap.cards.length > 0) {
      bodyText = snap.cards.map(c => c.body).filter(Boolean).join(' | ');
    }
    const pageName = (ad.page_name || snap.page_name || '').trim();
    const title = snap.title || (snap.cards && snap.cards[0] && snap.cards[0].title) || pageName;
    const linkUrl = snap.link_url || (snap.cards && snap.cards[0] && snap.cards[0].link_url) || '';

    if (!pageName) continue;

    const fullText = `${pageName} ${title} ${bodyText} ${linkUrl}`;
    if (isBlacklisted(fullText, pageName)) {
      blacklistedCount++;
      continue;
    }

    const normKey = normalizeKey(pageName);
    const domain = cleanDomain(linkUrl);
    const location = detectLocation(`${pageName} ${title} ${bodyText} ${snap.link_description || ''}`);
    const offerType = detectOfferType(fullText);

    let mediaUrl = '';
    if (snap.videos && snap.videos.length > 0) {
      mediaUrl = snap.videos[0].video_hd_url || snap.videos[0].video_sd_url || '';
    } else if (snap.images && snap.images.length > 0) {
      mediaUrl = snap.images[0].original_image_url || snap.images[0].resized_image_url || '';
    } else if (snap.cards && snap.cards.length > 0) {
      mediaUrl = snap.cards[0].video_hd_url || snap.cards[0].original_image_url || '';
    }

    const startDate = ad.start_date_string 
      ? ad.start_date_string.split('T')[0]
      : (ad.start_date ? new Date(ad.start_date * 1000).toISOString().split('T')[0] : 'Active');

    const pageId = String(ad.page_id || snap.page_id || '');
    const cleanHandle = pageName.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!newContractorsMap.has(normKey)) {
      newContractorsMap.set(normKey, {
        id: cleanHandle || normKey,
        companyName: pageName,
        location: location,
        domain: domain || 'N/A',
        offerType: offerType,
        primaryHeadline: title,
        primaryCta: snap.cta_text || (snap.cards && snap.cards[0] && snap.cards[0].cta_text) || 'See details',
        format: snap.display_format || 'IMAGE',
        primaryHook: bodyText,
        destinationUrl: linkUrl,
        adLibraryUrl: ad.url || (ad.ad_archive_id ? `https://www.facebook.com/ads/library?id=${ad.ad_archive_id}` : ''),
        mediaUrl: mediaUrl,
        pageId: pageId,
        igHandle: cleanHandle,
        igProfileUrl: `https://www.instagram.com/${cleanHandle}/`,
        igDmUrl: `https://ig.me/m/${cleanHandle}`,
        fbMessengerUrl: pageId ? `https://m.me/${pageId}` : `https://m.me/${cleanHandle}`,
        linkedInSearchUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(pageName + ' Owner OR Founder OR President')}`,
        startDates: [startDate],
        activeAdsCount: 1,
        earliestStartDate: startDate,
        dmPitchScript: generatePitchScript(pageName, location),
        status: 'to_contact',
        assigned_to: 'unassigned',
        notes: '',
        last_contacted_at: null
      });
    } else {
      const entry = newContractorsMap.get(normKey);
      entry.activeAdsCount++;
      if (startDate !== 'Active' && !entry.startDates.includes(startDate)) {
        entry.startDates.push(startDate);
      }
      if (entry.domain === 'N/A' && domain) entry.domain = domain;
      if (entry.location === 'USA Regional' && location !== 'USA Regional') {
        entry.location = location;
        entry.dmPitchScript = generatePitchScript(entry.companyName, location);
      }
    }
  }

  console.log(`Filtered out ${blacklistedCount} ads matching B2B agencies or equipment e-commerce.`);
  console.log(`Total candidate contractors found in scrape files: ${newContractorsMap.size}`);

  const netNewContractors = [];
  let existingDuplicatesSkipped = 0;

  for (const [normKey, contractor] of newContractorsMap.entries()) {
    const d = (contractor.domain || '').toLowerCase().replace(/^www\./, '');
    if (existingKeys.has(normKey) || (d && d !== 'n/a' && existingDomains.has(d))) {
      existingDuplicatesSkipped++;
    } else {
      contractor.index = existingLeads.length + netNewContractors.length + 1;
      netNewContractors.push(contractor);
    }
  }

  console.log(`Existing CRM contractors skipped (already present): ${existingDuplicatesSkipped}`);
  console.log(`Net-new contractors ready to add: ${netNewContractors.length}`);

  if (netNewContractors.length === 0) {
    console.log('No net-new contractors to append.');
    return;
  }

  const updatedContractors = [...existingLeads, ...netNewContractors];
  fs.writeFileSync(CONTRACTORS_FILE, JSON.stringify(updatedContractors, null, 2), 'utf8');
  console.log(`Successfully appended ${netNewContractors.length} new leads! Total CRM leads now: ${updatedContractors.length}`);
}

main().catch(console.error);
