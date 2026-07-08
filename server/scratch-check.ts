import { candidate } from './src/db/schema';

try {
  console.log("Candidate keys:", Object.keys(candidate));
  console.log("Test passed!");
} catch (err: any) {
  console.error("Test failed:", err.message || err);
}
process.exit(0);
