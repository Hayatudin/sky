import { db } from '../server/src/db';
import { candidate, quickRegistration } from '../server/src/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
  const cands = await db.select({
    id: candidate.id,
    surname: candidate.surname,
    givenNames: candidate.givenNames,
    nationality: candidate.nationality,
    country: candidate.country
  }).from(candidate).limit(10);

  console.log('Sample Candidates:', cands);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
