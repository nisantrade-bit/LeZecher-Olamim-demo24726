const https = require("https");

const BASE = "https://le-zecher-olamim-demo24726.vercel.app";

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": "WhatsApp/2.21.12.21 A" } }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          contentType: res.headers["content-type"],
          body: data
        });
      });
    }).on("error", (err) => resolve({ status: 0, error: err.message }));
  });
}

function parseOg(html) {
  if (!html) return {};
  const getMeta = (prop) => {
    const match = html.match(new RegExp("<meta\\s+(?:property|name)=[\"']" + prop + "[\"']\\s+content=[\"']([^\"']*)[\"']", "i")) ||
                  html.match(new RegExp("<meta\\s+content=[\"']([^\"']*)[\"']\\s+(?:property|name)=[\"']" + prop + "[\"']", "i"));
    return match ? match[1] : null;
  };

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);

  return {
    title: titleMatch ? titleMatch[1] : null,
    ogTitle: getMeta("og:title"),
    ogDesc: getMeta("og:description"),
    ogUrl: getMeta("og:url"),
    ogImage: getMeta("og:image"),
  };
}

async function auditId(id, label) {
  console.log("\n==============================================");
  console.log("AUDIT FOR ID: " + id + " (" + label + ")");
  console.log("==============================================");

  const endpoints = [
    { name: "1. Main Link (/?m=ID)", path: "/?m=" + id },
    { name: "2. /share/ID", path: "/share/" + id },
    { name: "3. /api/share?id=ID", path: "/api/share?id=" + id },
    { name: "4. /api/og?m=ID", path: "/api/og?m=" + id },
    { name: "5. /api/og-image?id=ID", path: "/api/og-image?id=" + id }
  ];

  for (const ep of endpoints) {
    const res = await fetchUrl(BASE + ep.path);
    console.log("\n--- " + ep.name + " ---");
    console.log("URL: " + BASE + ep.path);
    console.log("HTTP Status: " + res.status);
    console.log("Content-Type: " + res.contentType);

    if (res.contentType && res.contentType.includes("text/html")) {
      const og = parseOg(res.body);
      console.log("og:title      : " + (og.ogTitle || og.title));
      console.log("og:description: " + og.ogDesc);
      console.log("og:url        : " + og.ogUrl);
      console.log("og:image      : " + og.ogImage);
    } else if (res.contentType && res.contentType.includes("image")) {
      console.log("Image length  : " + res.body.length + " bytes");
    } else {
      console.log("Body preview  : " + (res.body ? res.body.substring(0, 150) : "EMPTY"));
    }
  }
}

async function run() {
  await auditId("1785101989240", "ID A - Shushan (Hosted Supabase Image URL)");
  await auditId("1785958487401", "ID B - Neria (Base64 Data URI Image)");
  await auditId("1785102181422", "ID C - Yocheved (No Image)");
  await auditId("9999999999999", "Non-existent ID");
}

run();
