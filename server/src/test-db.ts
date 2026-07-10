import { db } from './db';
import { candidate } from './db/schema';
import { desc } from 'drizzle-orm';

async function main() {
  console.log('Querying last 5 candidates...');
  
  const list = await db.query.candidate.findMany({
    orderBy: [desc(candidate.registeredAt)],
    limit: 5
  });

  if (list.length === 0) {
    console.log('No candidates found.');
    process.exit(0);
  }

  for (const c of list) {
    console.log(`- Candidate: ${c.givenNames} ${c.surname} (${c.passportNumber})`);
    console.log(`  isRequested: ${c.isRequested}`);
    console.log(`  visaSelected: ${c.visaSelected}`);
    console.log(`  status: ${c.status}`);
    console.log(`  agencyStatus: ${c.agencyStatus}`);
    console.log(`  registeredAt: ${c.registeredAt}`);
    console.log('-----------------------------');
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Error running query:', err);
  process.exit(1);
});
