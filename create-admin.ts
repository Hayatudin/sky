import { auth } from './server/src/lib/auth';
import { db } from './server/src/db';
import { user } from './server/src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const email = 'admin_test@example.com';
  const password = 'Password123!';
  const name = 'Admin Test';

  console.log('Registering user...');
  await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    }
  });

  console.log('Updating user role to super_admin...');
  await db.update(user)
    .set({ role: 'super_admin' })
    .where(eq(user.email, email));

  console.log('Super admin registered successfully!');
}

main().catch(err => {
  console.error('Error:', err);
});
