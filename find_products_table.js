// Find the Products table in Airtable
const AIRTABLE_BASE_ID = 'appA3qQw0NAqz8ru3';
const AIRTABLE_PAT = 'YOUR_AIRTABLE_PAT_TOKEN';

async function findProductsTable() {
  try {
    console.log('🔍 Finding all tables in your Airtable base...\n');
    
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_PAT}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log(`✅ Found ${data.tables.length} tables:\n`);
    console.log('='.repeat(80));
    
    data.tables.forEach((table, index) => {
      console.log(`\n${index + 1}. Table: "${table.name}"`);
      console.log(`   ID: ${table.id}`);
      console.log(`   Fields: ${table.fields.length}`);
      
      // Check if this looks like a Products table
      const nameLower = table.name.toLowerCase();
      if (nameLower.includes('product') || nameLower === 'products') {
        console.log(`   ⭐ THIS LOOKS LIKE THE PRODUCTS TABLE!`);
      }
      
      // Show first 5 fields
      if (table.fields.length > 0) {
        console.log(`   Sample fields:`);
        table.fields.slice(0, 5).forEach(field => {
          console.log(`      - ${field.name} (${field.type})`);
        });
        if (table.fields.length > 5) {
          console.log(`      ... and ${table.fields.length - 5} more`);
        }
      }
    });
    
    // Find Products table specifically
    console.log('\n\n🎯 SEARCHING FOR PRODUCTS TABLE:\n');
    console.log('='.repeat(80));
    const productsTable = data.tables.find(t => 
      t.name.toLowerCase().includes('product') || 
      t.name.toLowerCase() === 'products'
    );
    
    if (productsTable) {
      console.log(`✅ FOUND: "${productsTable.name}"`);
      console.log(`   Table ID: ${productsTable.id}`);
      console.log(`   URL: https://airtable.com/${AIRTABLE_BASE_ID}/${productsTable.id}`);
      console.log(`\n   All fields:`);
      productsTable.fields.forEach((field, index) => {
        console.log(`   ${index + 1}. ${field.name} (${field.type})`);
      });
    } else {
      console.log('❌ No table named "Products" found.');
      console.log('\n💡 Please check:');
      console.log('   1. Is the table named exactly "Products"?');
      console.log('   2. Or does it have "product" in the name?');
      console.log('   3. Copy the correct table URL from Airtable and share it.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findProductsTable();

