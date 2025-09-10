const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './config.env' });

async function setupDatabase() {
  console.log('🔧 Setting up Horton Properties Database...\n');

  try {
    // Connect to MySQL server (without specifying database)
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('✅ Connected to MySQL server');

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements and execute them one by one
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          // Use query instead of execute for DDL statements
          await connection.query(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DB_CREATE_EXISTS') {
            console.log(`⚠️  Statement ${i + 1}: ${error.message}`);
          } else {
            console.error(`❌ Statement ${i + 1} failed:`, error.message);
          }
        }
      }
    }

    await connection.end();
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your config.env file with your database credentials');
    console.log('2. Run: npm install (to install backend dependencies)');
    console.log('3. Run: npm run dev (to start the backend server)');
    console.log('4. The API will be available at http://localhost:5000/api');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure MySQL is running');
    console.log('2. Check your database credentials in config.env');
    console.log('3. Ensure you have permission to create databases');
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
