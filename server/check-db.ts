import { db } from './src/db';
import { broker } from './src/db/schema';

async function main() {
  const brokers = await db.select({
    id: broker.id,
    name: broker.name,
    isLocked: broker.isLocked
  }).from(broker);
  console.log('Brokers:', JSON.stringify(brokers, null, 2));
  
  const sessions = await db.query.session.findMany({ 
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          role: true
        }
      }
    }, 
    limit: 5 
  });
  console.log('Sessions:', JSON.stringify(sessions, null, 2));
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
