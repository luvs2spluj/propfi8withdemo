import { NormalizedRow } from '../csvNormalize';

export interface BucketResult {
  bucket: 'income' | 'utilities' | 'maintenance' | 'other';
  confidence: number;
  reasoning: string;
}

export interface Analyzer {
  analyze(rows: NormalizedRow[]): Promise<BucketResult[]>;
}

// Rules-based analyzer (no LLM)
export class RulesBasedAnalyzer implements Analyzer {
  async analyze(rows: NormalizedRow[]): Promise<BucketResult[]> {
    console.log('🔍 Starting rules-based analysis...');
    
    const results: BucketResult[] = [];
    const accountGroups = new Map<string, NormalizedRow[]>();
    
    // Group rows by account name
    for (const row of rows) {
      if (!accountGroups.has(row.account_name)) {
        accountGroups.set(row.account_name, []);
      }
      accountGroups.get(row.account_name)!.push(row);
    }
    
    console.log(`📊 Analyzing ${accountGroups.size} unique accounts`);
    
    for (const [accountName, accountRows] of accountGroups) {
      const bucket = this.categorizeAccount(accountName);
      const confidence = this.calculateConfidence(accountName, bucket);
      const reasoning = this.generateReasoning(accountName, bucket);
      
      results.push({
        bucket,
        confidence,
        reasoning
      });
      
      console.log(`📋 ${accountName} → ${bucket} (${confidence}%)`);
    }
    
    return results;
  }
  
  private categorizeAccount(accountName: string): 'income' | 'utilities' | 'maintenance' | 'other' {
    const name = accountName.toLowerCase();
    
    // Income patterns
    if (name.match(/(rent|income|revenue|tenant|resident)/i)) {
      return 'income';
    }
    
    // Utilities patterns
    if (name.match(/(utilities|pg&e|water|trash|electric|gas|sewer)/i)) {
      return 'utilities';
    }
    
    // Maintenance patterns
    if (name.match(/(maintenance|repairs|repair)/i)) {
      return 'maintenance';
    }
    
    return 'other';
  }
  
  private calculateConfidence(accountName: string, bucket: string): number {
    const name = accountName.toLowerCase();
    
    // High confidence for exact matches
    if (name.includes('rent') || name.includes('utilities') || name.includes('maintenance')) {
      return 0.95;
    }
    
    // Medium confidence for partial matches
    if (name.includes('income') || name.includes('revenue') || name.includes('repair')) {
      return 0.80;
    }
    
    // Low confidence for other
    return bucket === 'other' ? 0.50 : 0.70;
  }
  
  private generateReasoning(accountName: string, bucket: string): string {
    const name = accountName.toLowerCase();
    
    if (bucket === 'income') {
      if (name.includes('rent')) return 'Contains "rent" keyword';
      if (name.includes('income')) return 'Contains "income" keyword';
      if (name.includes('revenue')) return 'Contains "revenue" keyword';
      return 'Revenue-related account name';
    }
    
    if (bucket === 'utilities') {
      if (name.includes('utilities')) return 'Contains "utilities" keyword';
      if (name.includes('water')) return 'Contains "water" keyword';
      if (name.includes('electric')) return 'Contains "electric" keyword';
      return 'Utility-related account name';
    }
    
    if (bucket === 'maintenance') {
      if (name.includes('maintenance')) return 'Contains "maintenance" keyword';
      if (name.includes('repair')) return 'Contains "repair" keyword';
      return 'Maintenance-related account name';
    }
    
    return 'No specific category match found';
  }
}

// AI-based analyzer (placeholder for future LLM integration)
export class AIAnalyzer implements Analyzer {
  async analyze(rows: NormalizedRow[]): Promise<BucketResult[]> {
    console.log('🤖 Starting AI-based analysis...');
    
    // TODO: Implement LLM-based analysis
    // For now, fall back to rules-based
    const rulesAnalyzer = new RulesBasedAnalyzer();
    return rulesAnalyzer.analyze(rows);
  }
}

// Factory function to create analyzer
export function createAnalyzer(type: 'rules' | 'ai' = 'rules'): Analyzer {
  switch (type) {
    case 'rules':
      return new RulesBasedAnalyzer();
    case 'ai':
      return new AIAnalyzer();
    default:
      throw new Error(`Unknown analyzer type: ${type}`);
  }
}
