#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const SVG_FILES = [
  'public/propfi-logo.svg'
];

function validateSVG(filePath) {
  console.log(`\n🔍 Validating ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check for viewBox
  if (!content.includes('viewBox=')) {
    issues.push('Missing viewBox attribute');
  }
  
  // Check for preserveAspectRatio
  if (!content.includes('preserveAspectRatio=')) {
    issues.push('Missing preserveAspectRatio attribute');
  }
  
  // Check for external style references
  if (content.includes('<style>') && content.includes('@import') || content.includes('url(')) {
    issues.push('Contains external style references');
  }
  
  // Check for text elements (warn only)
  if (content.includes('<text')) {
    console.warn(`⚠️  Contains <text> elements - consider converting to paths for better compatibility`);
  }
  
  // Check for vector-effect
  if (content.includes('stroke') && !content.includes('vector-effect="non-scaling-stroke"')) {
    issues.push('Strokes present but missing vector-effect="non-scaling-stroke"');
  }
  
  // Check for unique IDs
  const idMatches = content.match(/id="([^"]+)"/g);
  if (idMatches) {
    const ids = idMatches.map(match => match.match(/id="([^"]+)"/)[1]);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      issues.push('Duplicate IDs found');
    }
  }
  
  if (issues.length === 0) {
    console.log(`✅ ${filePath} is production-ready`);
    return true;
  } else {
    console.error(`❌ Issues found in ${filePath}:`);
    issues.forEach(issue => console.error(`   - ${issue}`));
    return false;
  }
}

function main() {
  console.log('🎨 SVG Validation Script');
  console.log('========================');
  
  let allValid = true;
  
  SVG_FILES.forEach(filePath => {
    const isValid = validateSVG(filePath);
    if (!isValid) {
      allValid = false;
    }
  });
  
  if (allValid) {
    console.log('\n🎉 All SVG files are production-ready!');
    process.exit(0);
  } else {
    console.log('\n💥 Some SVG files have issues that need to be fixed.');
    process.exit(1);
  }
}

main();
