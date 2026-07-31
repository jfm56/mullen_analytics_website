export async function GET() {
  const vCard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:Mullen;Jim;;;",
    "FN:Jim Mullen",
    "ORG:Mullen Analytics & Data Solutions LLC",
    "TITLE:Founder and Data Scientist",
    "TEL;TYPE=CELL:+16092005818",
    "EMAIL;TYPE=INTERNET:jmullen@mullenanalytics.com",
    "URL:https://mullenanalytics.com",
    "ADR;TYPE=WORK:;;Burlington County;NJ;;;United States",
    "NOTE:Automation, decision support, data analytics, healthcare, EMS, business intelligence, and environmental analytics consulting.",
    "END:VCARD",
  ].join("\r\n");

  return new Response(vCard, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jim-mullen.vcf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
