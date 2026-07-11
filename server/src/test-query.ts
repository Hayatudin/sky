import { db } from './db';
import { candidate, generatedCV } from './db/schema';
import { and, or, eq, sql } from 'drizzle-orm';

async function main() {
  const agencyStr = 'rawasi';
  
  // Test case 3: The fully typed Drizzle subquery style
  const conditions = [
    or(
      eq(candidate.agency, agencyStr),
      sql`exists (select 1 from ${generatedCV} where ${generatedCV.candidateId} = ${candidate.id} and ${generatedCV.templateId} like ${`%${agencyStr}%`})`
    )
  ];

  try {
    const query = db.query.candidate.findMany({
      where: and(...conditions)
    });
    // Print the generated SQL
    console.log('Query 3 SQL:', query.toSQL());
  } catch (err) {
    console.error('Query 3 compilation failed:', err);
  }
}

main().catch(console.error);
