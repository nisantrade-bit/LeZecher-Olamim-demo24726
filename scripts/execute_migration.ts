import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

import { buildDeduplicationPlan, mergeDeceasedRecords, DeduplicationPlan } from '../src/utils/deduplication';
import { enrichDeceasedTranslations } from '../src/utils/transliteration';
import { normalizeFetchedRecord, sanitizeRecordForSupabase } from '../src/utils/supabase';
import { Deceased } from '../src/types';

const SUPABASE_URL = "https://aoendfkvzsywrykmcloy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_szEDKkwDPDeNFcO96jwr1A_GWBAF2Nj";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DRY_RUN = process.env.APPLY !== 'true';

async function runMigration() {
  console.log(`=== AUDIT & DEDUPLICATION RUNNER (DRY_RUN = ${DRY_RUN}) ===`);

  // 1. FETCH ALL RECORDS FROM SUPABASE
  console.log("\n[STEP 1] Fetching all records from Supabase table 'deceased'...");
  const { data: rawData, error: fetchErr } = await supabase.from('deceased').select('*');
  
  if (fetchErr || !rawData) {
    console.error("FATAL: Failed to fetch records from Supabase:", fetchErr);
    process.exit(1);
  }

  const records: Deceased[] = rawData.map(normalizeFetchedRecord);
  console.log(`Successfully fetched ${records.length} total records from Supabase.`);

  // 2. BACKUP
  const backupPath = path.join(process.cwd(), 'backup_current_records.json');
  fs.writeFileSync(backupPath, JSON.stringify(rawData, null, 2), 'utf-8');
  console.log(`Saved snapshot of ${records.length} records to '${backupPath}'.`);

  // 3. RUN AUDIT PLAN
  const plan: DeduplicationPlan = buildDeduplicationPlan(records);

  console.log("\n==================================================");
  console.log("CLASSIFICATION SUMMARY");
  console.log("==================================================");
  console.log(`Total Records Evaluated: ${plan.totalRecords}`);
  console.log(`Canonical Records (ID <= 1000): ${plan.canonicalCount}`);
  console.log(`Timestamp Records (ID > 1000):  ${plan.timestampCount}`);
  console.log(`--------------------------------------------------`);
  console.log(`SAFE MATCH:   ${plan.safeMatchCount}`);
  console.log(`REVIEW:       ${plan.reviewCount}`);
  console.log(`NO MATCH:     ${plan.noMatchCount}`);
  console.log("==================================================");

  console.log("\n--- DETAILED ITEM AUDIT ---");
  plan.items.forEach((item, index) => {
    console.log(`\n[${index + 1}/${plan.items.length}] Decision: [${item.decision}] (Confidence: ${item.confidence})`);
    console.log(`  Timestamp Record: ID ${item.timestampId} - Name: "${item.timestampName}"`);
    if (item.candidateCanonicalId) {
      console.log(`  Candidate Canonical: ID ${item.candidateCanonicalId} - Name: "${item.candidateName}"`);
    } else {
      console.log(`  Candidate Canonical: NONE`);
    }
    console.log(`  Reasons: ${item.matchReasons.join(' | ')}`);
  });

  if (DRY_RUN) {
    console.log("\n[DRY RUN COMPLETED] No changes were made to Supabase.");
    console.log("To apply SAFE MATCH updates, set environment variable APPLY=true.");
    return;
  }

  // 4. APPLY MODE: EXECUTE SAFE MATCHES ONLY
  console.log("\n==================================================");
  console.log("APPLYING SAFE MATCHES TO SUPABASE...");
  console.log("==================================================");

  const safeItems = plan.items.filter(item => item.decision === 'SAFE MATCH' && item.mergedPreview && item.candidateCanonicalId);
  if (safeItems.length === 0) {
    console.log("No SAFE MATCH items found to apply.");
    return;
  }

  const idsToDelete: (string | number)[] = [];

  for (const item of safeItems) {
    const canId = item.candidateCanonicalId!;
    const sanitized = sanitizeRecordForSupabase(item.mergedPreview!);

    console.log(`Updating Canonical ID ${canId} with merged data...`);
    const { error: updateErr } = await supabase.from('deceased').update(sanitized).eq('id', canId);
    if (updateErr) {
      console.error(`Error updating Canonical ID ${canId}:`, updateErr);
    } else {
      console.log(`✓ Updated Canonical ID ${canId}`);
      idsToDelete.push(item.timestampId);
    }
  }

  if (idsToDelete.length > 0) {
    console.log(`\nDeleting ${idsToDelete.length} source Timestamp records...`);
    const { error: delErr } = await supabase.from('deceased').delete().in('id', idsToDelete);
    if (delErr) {
      console.error("Error deleting source timestamp records:", delErr);
    } else {
      console.log(`✓ Deleted ${idsToDelete.length} source timestamp records.`);
    }
  }

  console.log("\n=== MIGRATION COMPLETED ===");
}

runMigration().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
