#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const SVG_FILES = [
  'public/propfi-logo.svg',
  'build/propfi-logo.svg'
];

function validateSVG(filePath) {
  console.log(`\n🔍 Validating ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let isValid = true;
  
  // Check for viewBox
  if (!content.includes('viewBox=')) {
    console.log('❌ Missing viewBox attribute');
    isValid = false;
  } else {
    console.log('✅ Has viewBox attribute');
  }
  
  // Check for preserveAspectRatio
  if (!content.includes('preserveAspectRatio=')) {
    console.log('⚠️  Missing preserveAspectRatio (recommended)');
  } else {
    console.log('✅ Has preserveAspectRatio attribute');
  }
  
  // Check for external style references
  if (content.includes('<style>') && content.includes('@import') || content.includes('url(')) {
    console.log('❌ Contains external style references');
    isValid = false;
  } else {
    console.log('✅ No external style references');
  }
  
  // Check for text elements
  if (content.includes('<text')) {
    console.log('⚠️  Contains <text> elements (may cause font issues)');
  } else {
    console.log('✅ No <text> elements');
  }
  
  // Check for vector-effect
  if (content.includes('vector-effect=')) {
    console.log('✅ Has vector-effect attributes');
  } else {
    console.log('⚠️  Missing vector-effect attributes (recommended for strokes)');
  }
  
  // Check for unique IDs
  const idMatches = content.match(/id="([^"]+)"/g);
  if (idMatches) {
    const ids = idMatches.map(match => match.match(/id="([^"]+)"/)[1]);
    const uniqueIds = new Set(ids);
    if (ids.length === uniqueIds.size) {
      console.log('✅ All IDs are unique');
    } else {
      console.log('❌ Duplicate IDs found');
      isValid = false;
    }
  }
  
  return isValid;
}

console.log('🚀 SVG Validation Report');
console.log('========================');

let allValid = true;

SVG_FILES.forEach(file => {
  const isValid = validateSVG(file);
  if (!isValid) {
    allValid = false;
  }
});

console.log('\n📊 Summary');
console.log('===========');

if (allValid) {
  console.log('✅ All SVG files are production-ready!');
  process.exit(0);
} else {
  console.log('❌ Some SVG files need fixes before production');
  process.exit(1);
}