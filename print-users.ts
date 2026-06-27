import { db } from './server/src/db';
import { user } from './server/src/db/schema';

async function main() {
  const users = await db.select({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }).from(user);
  
  console.log('Database Users:', JSON.stringify(users, null, 2));
}

main().catch(err => {
  console.error('Error:', err);
});
