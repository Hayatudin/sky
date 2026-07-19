const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection("mysql://skyforoo_un:%40Sky132435@localhost:3306/skyforoo_db");
  try {
    const [counts] = await connection.query(`
      SELECT COUNT(*) as total FROM Candidate
    `);
    console.log('Candidate statistics:', counts[0]);

    const [samples] = await connection.query(`
      SELECT id, givenNames, surname, languages, skills, workExperience, passportNumber
      FROM Candidate 
      ORDER BY registeredAt DESC
      LIMIT 5
    `);
    console.log('Sample candidates:', JSON.stringify(samples, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

main();
