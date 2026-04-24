const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_FILE_PATH = path.join('c:', 'Users', 'Ankkun', 'Documents', 'lap_trinh', 'my_project', 'Web-ban-hang', 'eCommerce-dataset-samples', 'shopee-products.csv');

function safeJsonParse(data, fallback = {}) {
  if (!data || data === 'null' || data === 'None' || !data) return fallback;
  try {
    return JSON.parse(data);
  } catch (e) {
    try {
      const fixed = data.replace(/""/g, '"');
      return JSON.parse(fixed);
    } catch(e2) {
      return fallback;
    }
  }
}

function main() {
  const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    quote: '"',
    escape: '"',
    to_line: 1000 // Read 1000 lines to get enough full records
  });

  records.slice(0, 5).forEach((record, i) => {
    console.log(`\n--- Record ${i + 1} ---`);
    console.log(`Title: ${record.title}`);
    console.log(`Variations: ${record.variations}`);
    console.log(`Product Variation: ${record.product_variation}`);
  });
}

main();
