// Script to read Airtable Products table
// Run with: node read_airtable_products.js

const AIRTABLE_BASE_ID = 'appA3qQw0NAqz8ru3';
const AIRTABLE_TABLE_ID = 'tbljwWvetx3bScjJ2'; // Products table ID
const AIRTABLE_PAT = 'YOUR_AIRTABLE_PAT_TOKEN';

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;

async function readAirtableTable() {
  try {
    console.log('📊 Fetching Airtable Products table structure...\n');
    
    // Try to get table metadata from base schema
    console.log('📋 Attempting to fetch table schema...\n');
    try {
      const baseSchemaResponse = await fetch(
        `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`,
        {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_PAT}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (baseSchemaResponse.ok) {
        const baseSchema = await baseSchemaResponse.json();
        const productsTable = baseSchema.tables.find(t => t.id === AIRTABLE_TABLE_ID);
        
        if (productsTable) {
          console.log('✅ TABLE SCHEMA FOUND:');
          console.log('='.repeat(60));
          console.log(`Table Name: ${productsTable.name}`);
          console.log(`Table ID: ${productsTable.id}`);
          console.log(`\nFields (${productsTable.fields.length}):`);
          console.log('-'.repeat(60));
          
          productsTable.fields.forEach((field, index) => {
            console.log(`${index + 1}. ${field.name} (${field.type})`);
          });
          
          // Generate SQL
          console.log('\n\n🔧 SUGGESTED SQL FOREIGN TABLE FIELDS:');
          console.log('='.repeat(60));
          console.log('CREATE FOREIGN TABLE airtable.products (');
          productsTable.fields.forEach((field, index) => {
            const sqlType = getSqlType(field.type);
            const fieldName = field.name.includes(' ') ? `"${field.name}"` : field.name;
            const comma = index < productsTable.fields.length - 1 ? ',' : '';
            console.log(`  ${fieldName} ${sqlType}${comma}`);
          });
          console.log(')');
          console.log('SERVER airtable_server');
          console.log('OPTIONS (');
          console.log(`  base_id '${AIRTABLE_BASE_ID}',`);
          console.log(`  table_id '${AIRTABLE_TABLE_ID}'`);
          console.log(');');
        }
      }
    } catch (schemaError) {
      console.log('⚠️  Could not fetch schema via metadata API');
      console.log('   This is normal - we\'ll try fetching records instead\n');
    }
    
    // Fetch records directly
    console.log('\n📦 FETCHING RECORDS...\n');
    const recordsResponse = await fetch(AIRTABLE_API_URL, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json'
      }
    });

    if (!recordsResponse.ok) {
      throw new Error(`Records fetch failed: ${recordsResponse.status} ${recordsResponse.statusText}`);
    }

    const data = await recordsResponse.json();
    
    console.log(`Total Records: ${data.records.length}`);
    console.log('='.repeat(60));
    
    if (data.records.length === 0) {
      console.log('\n⚠️  Table is empty. No products found.');
      console.log('\n💡 To add products:');
      console.log('   1. Go to your Airtable base');
      console.log('   2. Add a new record to the Products table');
      console.log('   3. Fill in the fields according to AIRTABLE_PRODUCTS_TABLE_STRUCTURE.md');
      
      // Even if empty, try to get field names from the API response structure
      console.log('\n\n📋 To see your table structure:');
      console.log('   1. Go to Airtable → Help → API documentation');
      console.log('   2. Select your base and Products table');
      console.log('   3. You\'ll see all field names and types listed there');
    } else {
      // Extract field names from first record
      const firstRecord = data.records[0];
      const fieldNames = Object.keys(firstRecord.fields);
      
      console.log('\n📋 DETECTED FIELDS:');
      console.log('-'.repeat(60));
      fieldNames.forEach((fieldName, index) => {
        const value = firstRecord.fields[fieldName];
        const valueType = Array.isArray(value) ? 'array' : typeof value;
        console.log(`${index + 1}. ${fieldName} (${valueType})`);
      });
      
      console.log('\n\n📝 RECORDS:');
      console.log('-'.repeat(60));
      
      data.records.forEach((record, index) => {
        console.log(`\nRecord ${index + 1} (ID: ${record.id}):`);
        Object.entries(record.fields).forEach(([key, value]) => {
          const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
          const truncated = String(displayValue).length > 100 
            ? String(displayValue).substring(0, 100) + '...' 
            : displayValue;
          console.log(`  ${key}: ${truncated}`);
        });
      });
      
      // Generate SQL field list based on detected fields
      console.log('\n\n🔧 SUGGESTED SQL FOREIGN TABLE FIELDS:');
      console.log('='.repeat(60));
      console.log('CREATE FOREIGN TABLE airtable.products (');
      fieldNames.forEach((fieldName, index) => {
        const value = firstRecord.fields[fieldName];
        const sqlType = inferSqlType(value);
        const quotedName = fieldName.includes(' ') ? `"${fieldName}"` : fieldName;
        const comma = index < fieldNames.length - 1 ? ',' : '';
        console.log(`  ${quotedName} ${sqlType}${comma}`);
      });
      console.log(')');
      console.log('SERVER airtable_server');
      console.log('OPTIONS (');
      console.log(`  base_id '${AIRTABLE_BASE_ID}',`);
      console.log(`  table_id '${AIRTABLE_TABLE_ID}'`);
      console.log(');');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('\n⚠️  Authentication error. Check your PAT token.');
    }
  }
}

function getSqlType(airtableType) {
  const typeMap = {
    'singleLineText': 'text',
    'multilineText': 'text',
    'email': 'text',
    'url': 'text',
    'phoneNumber': 'text',
    'number': 'numeric',
    'percent': 'numeric',
    'currency': 'numeric',
    'date': 'date',
    'dateTime': 'timestamp',
    'checkbox': 'boolean',
    'singleSelect': 'text',
    'multipleSelects': 'jsonb',
    'multipleRecordLinks': 'jsonb',
    'attachment': 'text',
    'createdTime': 'timestamp',
    'lastModifiedTime': 'timestamp',
    'createdBy': 'jsonb',
    'lastModifiedBy': 'jsonb',
    'formula': 'text',
    'rollup': 'text',
    'count': 'integer',
    'autoNumber': 'bigint'
  };
  
  return typeMap[airtableType] || 'text';
}

function inferSqlType(value) {
  if (value === null || value === undefined) {
    return 'text'; // Default for unknown
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (typeof value === 'number') {
    return 'numeric';
  }
  if (Array.isArray(value)) {
    return 'jsonb';
  }
  if (typeof value === 'object') {
    return 'jsonb';
  }
  if (typeof value === 'string') {
    // Check if it looks like a date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return 'timestamp';
    }
    return 'text';
  }
  return 'text';
}

readAirtableTable();

