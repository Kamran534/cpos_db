#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Parse Prisma schema file
function parseSchema(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const schema = {
    models: [],
    enums: [],
    datasource: null,
    generator: null,
  };

  // Extract datasource
  const datasourceMatch = content.match(/datasource\s+(\w+)\s*\{([^}]+)\}/s);
  if (datasourceMatch) {
    schema.datasource = {
      name: datasourceMatch[1],
      config: datasourceMatch[2].trim(),
    };
  }

  // Extract generator
  const generatorMatch = content.match(/generator\s+(\w+)\s*\{([^}]+)\}/s);
  if (generatorMatch) {
    schema.generator = {
      name: generatorMatch[1],
      config: generatorMatch[2].trim(),
    };
  }

  // Extract models
  const modelRegex = /model\s+(\w+)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs;
  let modelMatch;
  while ((modelMatch = modelRegex.exec(content)) !== null) {
    const modelName = modelMatch[1];
    const modelBody = modelMatch[2];
    
    const fields = [];
    const relations = [];
    const indexes = [];
    const uniqueConstraints = [];

    // Extract fields
    const fieldRegex = /^(\s+)(\w+)\s+(\S+)\s*(.*)$/gm;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
      const fieldName = fieldMatch[2];
      const fieldType = fieldMatch[3];
      const modifiers = fieldMatch[4].trim();
      
      fields.push({
        name: fieldName,
        type: fieldType,
        modifiers: modifiers,
        full: fieldMatch[0].trim(),
      });
    }

    // Extract relations
    const relationRegex = /^\s+(\w+)\s+(\S+)\s*(@relation.*)?$/gm;
    let relationMatch;
    while ((relationMatch = relationRegex.exec(modelBody)) !== null) {
      if (relationMatch[2].includes('[]') || relationMatch[2].includes('?')) {
        relations.push({
          name: relationMatch[1],
          type: relationMatch[2],
          relation: relationMatch[3] || '',
        });
      }
    }

    // Extract indexes
    const indexRegex = /@@index\s*\(([^)]+)\)/g;
    let indexMatch;
    while ((indexMatch = indexRegex.exec(modelBody)) !== null) {
      indexes.push(indexMatch[1]);
    }

    // Extract unique constraints
    const uniqueRegex = /@@unique\s*\(([^)]+)\)/g;
    let uniqueMatch;
    while ((uniqueMatch = uniqueRegex.exec(modelBody)) !== null) {
      uniqueConstraints.push(uniqueMatch[1]);
    }

    schema.models.push({
      name: modelName,
      fields: fields,
      relations: relations,
      indexes: indexes,
      uniqueConstraints: uniqueConstraints,
    });
  }

  // Extract enums
  const enumRegex = /enum\s+(\w+)\s*\{([^}]+)\}/gs;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(content)) !== null) {
    const enumName = enumMatch[1];
    const enumBody = enumMatch[2];
    const values = enumBody
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'))
      .map(line => line.replace(/,/g, '').trim());

    schema.enums.push({
      name: enumName,
      values: values,
    });
  }

  return schema;
}

// Compare two schemas
function compareSchemas(schema1, schema2, name1 = 'PostgreSQL', name2 = 'SQLite') {
  const differences = {
    models: {
      onlyIn1: [],
      onlyIn2: [],
      common: [],
    },
    enums: {
      onlyIn1: [],
      onlyIn2: [],
      common: [],
    },
    datasource: schema1.datasource?.config !== schema2.datasource?.config,
  };

  // Compare models
  const models1 = new Set(schema1.models.map(m => m.name));
  const models2 = new Set(schema2.models.map(m => m.name));

  // Models only in schema1
  models1.forEach(modelName => {
    if (!models2.has(modelName)) {
      differences.models.onlyIn1.push(modelName);
    }
  });

  // Models only in schema2
  models2.forEach(modelName => {
    if (!models1.has(modelName)) {
      differences.models.onlyIn2.push(modelName);
    }
  });

  // Common models - compare fields
  models1.forEach(modelName => {
    if (models2.has(modelName)) {
      const model1 = schema1.models.find(m => m.name === modelName);
      const model2 = schema2.models.find(m => m.name === modelName);

      const fieldNames1 = new Set(model1.fields.map(f => f.name));
      const fieldNames2 = new Set(model2.fields.map(f => f.name));

      const onlyIn1 = model1.fields.filter(f => !fieldNames2.has(f.name));
      const onlyIn2 = model2.fields.filter(f => !fieldNames1.has(f.name));
      const commonFields = [];

      model1.fields.forEach(field1 => {
        if (fieldNames2.has(field1.name)) {
          const field2 = model2.fields.find(f => f.name === field1.name);
          if (field1.full !== field2.full) {
            commonFields.push({
              name: field1.name,
              schema1: field1.full,
              schema2: field2.full,
            });
          }
        }
      });

      if (onlyIn1.length > 0 || onlyIn2.length > 0 || commonFields.length > 0) {
        differences.models.common.push({
          name: modelName,
          fieldsOnlyIn1: onlyIn1.map(f => f.full),
          fieldsOnlyIn2: onlyIn2.map(f => f.full),
          fieldDifferences: commonFields,
        });
      }
    }
  });

  // Compare enums
  const enums1 = new Set(schema1.enums.map(e => e.name));
  const enums2 = new Set(schema2.enums.map(e => e.name));

  enums1.forEach(enumName => {
    if (!enums2.has(enumName)) {
      differences.enums.onlyIn1.push(enumName);
    }
  });

  enums2.forEach(enumName => {
    if (!enums1.has(enumName)) {
      differences.enums.onlyIn2.push(enumName);
    }
  });

  // Common enums - compare values
  enums1.forEach(enumName => {
    if (enums2.has(enumName)) {
      const enum1 = schema1.enums.find(e => e.name === enumName);
      const enum2 = schema2.enums.find(e => e.name === enumName);

      const values1 = new Set(enum1.values);
      const values2 = new Set(enum2.values);

      const onlyIn1 = enum1.values.filter(v => !values2.has(v));
      const onlyIn2 = enum2.values.filter(v => !values1.has(v));

      if (onlyIn1.length > 0 || onlyIn2.length > 0) {
        differences.enums.common.push({
          name: enumName,
          valuesOnlyIn1: onlyIn1,
          valuesOnlyIn2: onlyIn2,
        });
      }
    }
  });

  return differences;
}

// Print differences in a formatted way
function printDifferences(differences, name1 = 'PostgreSQL', name2 = 'SQLite') {
  console.log('\n' + colors.bright + colors.cyan + '='.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + 'SCHEMA COMPARISON REPORT' + colors.reset);
  console.log(colors.bright + colors.cyan + '='.repeat(80) + colors.reset);
  console.log(`${colors.blue}${name1}${colors.reset} vs ${colors.blue}${name2}${colors.reset}\n`);

  // Models section
  console.log(colors.bright + colors.yellow + '📊 MODELS COMPARISON' + colors.reset);
  console.log('-'.repeat(80));

  if (differences.models.onlyIn1.length > 0) {
    console.log(`\n${colors.red}❌ Models only in ${name1}:${colors.reset}`);
    differences.models.onlyIn1.forEach(model => {
      console.log(`   - ${colors.red}${model}${colors.reset}`);
    });
  }

  if (differences.models.onlyIn2.length > 0) {
    console.log(`\n${colors.green}✅ Models only in ${name2}:${colors.reset}`);
    differences.models.onlyIn2.forEach(model => {
      console.log(`   - ${colors.green}${model}${colors.reset}`);
    });
  }

  if (differences.models.common.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Common models with differences:${colors.reset}`);
    differences.models.common.forEach(model => {
      console.log(`\n   ${colors.bright}Model: ${model.name}${colors.reset}`);
      
      if (model.fieldsOnlyIn1.length > 0) {
        console.log(`   ${colors.red}Fields only in ${name1}:${colors.reset}`);
        model.fieldsOnlyIn1.forEach(field => {
          console.log(`      - ${colors.red}${field}${colors.reset}`);
        });
      }

      if (model.fieldsOnlyIn2.length > 0) {
        console.log(`   ${colors.green}Fields only in ${name2}:${colors.reset}`);
        model.fieldsOnlyIn2.forEach(field => {
          console.log(`      - ${colors.green}${field}${colors.reset}`);
        });
      }

      if (model.fieldDifferences.length > 0) {
        console.log(`   ${colors.yellow}Fields with type/modifier differences:${colors.reset}`);
        model.fieldDifferences.forEach(diff => {
          console.log(`      ${colors.bright}${diff.name}:${colors.reset}`);
          console.log(`         ${name1}: ${colors.red}${diff.schema1}${colors.reset}`);
          console.log(`         ${name2}: ${colors.green}${diff.schema2}${colors.reset}`);
        });
      }
    });
  }

  if (
    differences.models.onlyIn1.length === 0 &&
    differences.models.onlyIn2.length === 0 &&
    differences.models.common.length === 0
  ) {
    console.log(`\n${colors.green}✓ All models are identical${colors.reset}`);
  }

  // Enums section
  console.log(`\n${colors.bright}${colors.yellow}🔤 ENUMS COMPARISON${colors.reset}`);
  console.log('-'.repeat(80));

  if (differences.enums.onlyIn1.length > 0) {
    console.log(`\n${colors.red}❌ Enums only in ${name1}:${colors.reset}`);
    differences.enums.onlyIn1.forEach(enumName => {
      console.log(`   - ${colors.red}${enumName}${colors.reset}`);
    });
  }

  if (differences.enums.onlyIn2.length > 0) {
    console.log(`\n${colors.green}✅ Enums only in ${name2}:${colors.reset}`);
    differences.enums.onlyIn2.forEach(enumName => {
      console.log(`   - ${colors.green}${enumName}${colors.reset}`);
    });
  }

  if (differences.enums.common.length > 0) {
    console.log(`\n${colors.yellow}⚠️  Common enums with different values:${colors.reset}`);
    differences.enums.common.forEach(enumDiff => {
      console.log(`\n   ${colors.bright}Enum: ${enumDiff.name}${colors.reset}`);
      
      if (enumDiff.valuesOnlyIn1.length > 0) {
        console.log(`   ${colors.red}Values only in ${name1}:${colors.reset}`);
        enumDiff.valuesOnlyIn1.forEach(value => {
          console.log(`      - ${colors.red}${value}${colors.reset}`);
        });
      }

      if (enumDiff.valuesOnlyIn2.length > 0) {
        console.log(`   ${colors.green}Values only in ${name2}:${colors.reset}`);
        enumDiff.valuesOnlyIn2.forEach(value => {
          console.log(`      - ${colors.green}${value}${colors.reset}`);
        });
      }
    });
  }

  if (
    differences.enums.onlyIn1.length === 0 &&
    differences.enums.onlyIn2.length === 0 &&
    differences.enums.common.length === 0
  ) {
    console.log(`\n${colors.green}✓ All enums are identical${colors.reset}`);
  }

  // Datasource section
  console.log(`\n${colors.bright}${colors.yellow}🔌 DATASOURCE COMPARISON${colors.reset}`);
  console.log('-'.repeat(80));

  if (differences.datasource) {
    console.log(`${colors.yellow}⚠️  Datasources are different${colors.reset}`);
    console.log(`   ${name1}: PostgreSQL`);
    console.log(`   ${name2}: SQLite`);
  } else {
    console.log(`${colors.green}✓ Datasources are identical${colors.reset}`);
  }

  // Summary
  console.log(`\n${colors.bright}${colors.cyan}📋 SUMMARY${colors.reset}`);
  console.log('-'.repeat(80));
  
  const totalModels1 = differences.models.onlyIn1.length + differences.models.common.length;
  const totalModels2 = differences.models.onlyIn2.length + differences.models.common.length;
  const totalEnums1 = differences.enums.onlyIn1.length + differences.enums.common.length;
  const totalEnums2 = differences.enums.onlyIn2.length + differences.enums.common.length;

  console.log(`\n${name1}: ${totalModels1} models, ${totalEnums1} enums`);
  console.log(`${name2}: ${totalModels2} models, ${totalEnums2} enums`);
  console.log(`Models with differences: ${differences.models.common.length}`);
  console.log(`Enums with differences: ${differences.enums.common.length}`);
  
  console.log('\n' + colors.bright + colors.cyan + '='.repeat(80) + colors.reset + '\n');
}

// Main execution
function main() {
  const schema1Path = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  const schema2Path = path.join(__dirname, '..', 'prisma', 'schema.payflow.prisma');

  if (!fs.existsSync(schema1Path)) {
    console.error(`${colors.red}Error: ${schema1Path} not found${colors.reset}`);
    process.exit(1);
  }

  if (!fs.existsSync(schema2Path)) {
    console.error(`${colors.red}Error: ${schema2Path} not found${colors.reset}`);
    process.exit(1);
  }

  try {
    console.log(`${colors.blue}📖 Reading ${schema1Path}...${colors.reset}`);
    const schema1 = parseSchema(schema1Path);
    console.log(`${colors.green}✓ Parsed ${schema1.models.length} models, ${schema1.enums.length} enums${colors.reset}`);

    console.log(`\n${colors.blue}📖 Reading ${schema2Path}...${colors.reset}`);
    const schema2 = parseSchema(schema2Path);
    console.log(`${colors.green}✓ Parsed ${schema2.models.length} models, ${schema2.enums.length} enums${colors.reset}`);

    console.log(`\n${colors.blue}🔍 Comparing schemas...${colors.reset}`);
    const differences = compareSchemas(schema1, schema2);
    
    printDifferences(differences);
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { parseSchema, compareSchemas, printDifferences };

