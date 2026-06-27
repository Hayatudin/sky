import { db } from './src/db';

async function main() {
  const invs = await db.query.invoice.findMany({
    with: {
      candidate: {
        with: {
          generatedCVs: true
        }
      }
    }
  });
  console.log(JSON.stringify(invs, null, 2));
}

main().finally(() => process.exit(0));
