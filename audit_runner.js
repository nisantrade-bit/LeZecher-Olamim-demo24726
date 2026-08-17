const { createClient } = require('@supabase/supabase-js');
const http = require('https');

const url = process.env.VITE_SUPABASE_URL || 'https://aoendfkvzsywrykmcloy.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_szEDKkwDPDeNFcO96jwr1A_GWBAF2Nj';
const supabase = createClient(url, key);

async function fetchUrl(reqUrl, headers = {}) {
  return new Promise((resolve) => {
    try {
      const u = new URL(reqUrl);
      const options = {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          ...headers
        }
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        }));
      });
      req.on('error', (e) => resolve({ status: 0, headers: {}, body: e.message }));
      req.end();
    } catch (e) {
      resolve({ status: 0, headers: {}, body: e.message });
    }
  });
}

function parseMeta(html) {
  if (!html) return {};
  const getMeta = (prop) => {
    const m = html.match(new RegExp('<meta\\s+(?:property|name)=["\']' + prop + '["\']\\s+content=["\']([^"\']*)["\']', 'i')) ||
              html.match(new RegExp('<meta\\s+content=["\']([^"\']*)["\']\\s+(?:property|name)=["\']' + prop + '["\']', 'i'));
    return m ? m[1] : null;
  };
  const titleM = html.match(/<title>([^<]*)<\/title>/i);
  return {
    title: titleM ? titleM[1] : null,
    ogTitle: getMeta('og:title'),
    ogDesc: getMeta('og:description'),
    ogImage: getMeta('og:image'),
    ogImageSecure: getMeta('og:image:secure_url'),
    ogUrl: getMeta('og:url'),
    twitterImage: getMeta('twitter:image')
  };
}

async function runAudit() {
  const { data: records, error } = await supabase.from('deceased').select('*');
  if (error) {
    console.error('Error fetching Supabase records:', error);
    return;
  }

  console.log('TOTAL_RECORDS_COUNT:', records.length);

  const results = [];

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const id = String(rec.id);
    
    // Determine image field value in record
    const rawCandidate = [
      rec.image,
      rec.imageUrl,
      rec.image_url,
      rec.photoUrl,
      rec.photo
    ].find(img => img && typeof img === 'string' && img.trim() !== '' && img.trim() !== '-');

    let imageCategory = 'No image';
    if (rawCandidate) {
      const trimmed = rawCandidate.trim();
      if (trimmed.includes('supabase.co')) {
        imageCategory = 'Supabase Storage';
      } else if (trimmed.startsWith('data:') || trimmed.length > 100) {
        imageCategory = 'Base64';
      } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        imageCategory = 'URL';
      } else {
        imageCategory = 'Other/Base64';
      }
    }

    // Determine source
    const isManual = id === '1785958487401' || (rec.created_at && (rec.contactPhone || rec.contact_phone));
    const source = isManual ? 'Manual' : 'Excel';

    // 1. Regular GET
    const pubUrl = `https://le-zecher-olamim-demo24726.vercel.app/?m=${encodeURIComponent(id)}&lang=he`;
    const regRes = await fetchUrl(pubUrl);
    const regMeta = parseMeta(regRes.body);

    // 2. WhatsApp Crawler GET
    const waRes = await fetchUrl(pubUrl, { 'User-Agent': 'WhatsApp/2.23.20.0 A' });
    const waMeta = parseMeta(waRes.body);

    // 3. Facebook Crawler GET
    const fbRes = await fetchUrl(pubUrl, { 'User-Agent': 'facebookexternalhit/1.1' });
    const fbMeta = parseMeta(fbRes.body);

    // 4. Test image endpoint if /api/og-image or direct storage
    let imgApiStatus = null;
    let imgApiCT = null;
    let imgApiCL = null;
    let imageCorrect = false;

    if (waMeta.ogImage) {
      if (waMeta.ogImage.includes('/api/og-image')) {
        const imgRes = await fetchUrl(waMeta.ogImage);
        imgApiStatus = imgRes.status;
        imgApiCT = imgRes.headers['content-type'];
        imgApiCL = imgRes.headers['content-length'];
        imageCorrect = (imgRes.status === 200 && imgApiCT && imgApiCT.startsWith('image/'));
      } else if (waMeta.ogImage.includes('supabase.co') || waMeta.ogImage.includes('og-banner.png')) {
        imageCorrect = true;
      }
    }

    // 5. Compare /api/og vs /?m=
    const apiOgUrl = `https://le-zecher-olamim-demo24726.vercel.app/api/og?m=${encodeURIComponent(id)}&lang=he`;
    const apiOgRes = await fetchUrl(apiOgUrl);
    const apiOgMeta = parseMeta(apiOgRes.body);

    results.push({
      id,
      name: rec.nameHe || rec.name || 'Unknown',
      rec,
      source,
      imageCategory,
      rawCandidate: rawCandidate || null,
      regRes: { status: regRes.status, contentType: regRes.headers['content-type'], meta: regMeta },
      waRes: { status: waRes.status, contentType: waRes.headers['content-type'], meta: waMeta, headers: waRes.headers },
      fbRes: { status: fbRes.status, contentType: fbRes.headers['content-type'], meta: fbMeta },
      apiOgRes: { status: apiOgRes.status, contentType: apiOgRes.headers['content-type'], meta: apiOgMeta },
      imageApi: { status: imgApiStatus, contentType: imgApiCT, contentLength: imgApiCL, correct: imageCorrect }
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

runAudit();
