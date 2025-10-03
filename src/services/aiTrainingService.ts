import { csvUploadService } from './csvUploadService';
import { localStorageService } from './localStorageService';

export interface TrainingData {
  features: number[];
  label: 'balance_sheet' | 'rent_roll' | 'cash_flow';
  confidence: number;
}

export interface PredictionResult {
  fileType: 'balance_sheet' | 'rent_roll' | 'cash_flow';
  confidence: number;
  reasoning: string[];
  suggestedBuckets: { [key: string]: string };
}

export interface ModelPerformance {
  accuracy: number;
  precision: { [key: string]: number };
  recall: { [key: string]: number };
  f1Score: { [key: string]: number };
}

class AITrainingService {
  private modelData: TrainingData[] = [];
  private keywords: { [key: string]: string[] } = {
    balance_sheet: [
      'account', 'balance', 'assets', 'liabilities', 'capital', 'equity',
      'cash', 'bank', 'debt', 'loan', 'investment', 'inventory', 'receivables'
    ],
    rent_roll: [
      'unit', 'tenant', 'rent', 'market', 'deposit', 'occupancy', 'vacant',
      'lease', 'move', 'square', 'sqft', 'bedroom', 'bathroom', 'status'
    ],
    cash_flow: [
      'income', 'expense', 'revenue', 'operating', 'month', 'quarter', 'annual',
      'january', 'february', 'march', 'april', 'may', 'june', 'july',
      'august', 'september', 'october', 'november', 'december', 'total'
    ]
  };

  constructor() {
    this.loadModelData();
  }

  // Extract features from CSV data for ML training
  extractFeatures(csvData: any[], filename: string): number[] {
    if (!csvData || csvData.length === 0) return [];

    const headers = Object.keys(csvData[0] || {});
    const features: number[] = [];

    // Header-based features
    features.push(headers.length); // Number of columns
    
    // Keyword matching scores
    Object.keys(this.keywords).forEach(fileType => {
      const score = this.calculateKeywordScore(headers, this.keywords[fileType]);
      features.push(score);
    });

    // Data pattern features
    features.push(this.detectPatternFeatures(csvData));
    
    // Filename features
    const filenameScore = this.extractFilenameFeatures(filename);
    features.push(filenameScore);

    return features;
  }

  // Generate training data from uploaded files
  generateTrainingData(): TrainingData[] {
    const csvFiles = csvUploadService.getAllFiles();
    const trainingData: TrainingData[] = [];

    // Use existing uploaded files as training examples
    csvFiles.forEach(file => {
      const features = this.extractFeatures(file.data, file.filename);
      const label = file.metadata.fileType;
      
      if (features.length > 0) {
        trainingData.push({
          features,
          label,
          confidence: this.calculateConfidence(file.data, label)
        });
      }
    });

    // Add synthetic training examples
    const syntheticExamples = this.generateSyntheticExamples();
    trainingData.push(...syntheticExamples);

    this.modelData = trainingData;
    this.saveModelData();
    
    return trainingData;
  }

  // Train the model (mock implementation - in real app, would use actual ML library)
  trainModel(): ModelPerformance {
    const trainingData = this.generateTrainingData();
    
    // Mock training metrics based on keyword matching
    const metrics = this.calculateMetrics(trainingData);
    
    console.log('AI Model trained successfully', {
      trainingExamples: trainingData.length,
      accuracy: metrics.accuracy,
      metrics
    });

    return metrics;
  }

  // Predict file type for new CSV
  predictFileType(csvData: any[], filename: string): PredictionResult {
    const features = this.extractFeatures(csvData, filename);
    const predictions: { [key: string]: number } = {};

    // Score each file type based on features
    Object.keys(this.keywords).forEach(fileType => {
      const score = this.calculateOverallScore(csvData, filename, fileType);
      predictions[fileType] = score;
    });

    // Find the best prediction
    const bestPrediction = Object.entries(predictions).reduce((max, current) => 
      current[1] > max[1] ? current : max
    );

    return {
      fileType: bestPrediction[0] as 'balance_sheet' | 'rent_roll' | 'cash_flow',
      confidence: bestPrediction[1],
      reasoning: this.generateReasoning(csvData, filename, bestPrediction[0]),
      suggestedBuckets: this.suggestBuckets(csvData, bestPrediction[0])
    };
  }

  // Validate model predictions against known files
  validateModel(): { correct: number; total: number; accuracy: number } {
    const csvFiles = csvUploadService.getAllFiles();
    let correct = 0;
    const total = csvFiles.length;

    csvFiles.forEach(file => {
      const prediction = this.predictFileType(file.data, file.filename);
      if (prediction.fileType === file.metadata.fileType) {
        correct++;
      }
    });

    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    return { correct, total, accuracy };
  }

  // Private helper methods
  private calculateKeywordScore(headers: string[], keywords: string[]): number {
    let score = 0;
    const headerWords = headers.map(h => h.toLowerCase());
    
    keywords.forEach(keyword => {
      if (headerWords.some(h => h.includes(keyword))) {
        score += 1;
      }
    });

    return score / keywords.length; // Normalize by keyword count
  }

  private calculateConfidence(csvData: any[], fileType: string): number {
    const headers = Object.keys(csvData[0] || {});
    const score = this.calculateKeywordScore(headers, this.keywords[fileType]);
    
    // Additional confidence factors
    const dataRows = csvData.length;
    const headersCount = headers.length;
    
    // More data = higher confidence (up to a point)
    const densityScore = Math.min(dataRows / 100, 1); // Cap at 100 rows
    
    return (score + densityScore) / 2;
  }

  private detectPatternFeatures(csvData: any[]): number {
    if (!csvData || csvData.length === 0) return 0;

    const firstRow = csvData[0];
    const numericColumns = Object.values(firstRow).filter(val => 
      this.parseNumericValue(val) !== 0
    ).length;

    return numericColumns / Object.keys(firstRow).length;
  }

  private extractFilenameFeatures(filename: string): number {
    const filenameLower = filename.toLowerCase();
    let score = 0;

    if (filenameLower.includes('balance')) score += 0.3;
    if (filenameLower.includes('rent')) score += 0.4;
    if (filenameLower.includes('cash') || filenameLower.includes('flow')) score += 0.3;

    return score;
  }

  private calculateOverallScore(csvData: any[], filename: string, fileType: string): number {
    const features = this.extractFeatures(csvData, filename);
    const keywordScore = this.calculateKeywordScore(Object.keys(csvData[0] || {}), this.keywords[fileType]);
    const patternScore = this.detectPatternFeatures(csvData);
    const filenameScore = this.extractFilenameFeatures(filename);

    // Weighted average
    return (keywordScore * 0.5) + (patternScore * 0.3) + (filenameScore * 0.2);
  }

  private generateReasoning(csvData: any[], filename: string, fileType: string): string[] {
    const reasoning: string[] = [];
    const headers = Object.keys(csvData[0] || {});

    // Header analysis
    this.keywords[fileType].forEach(keyword => {
      if (headers.some(h => h.toLowerCase().includes(keyword))) {
        const matchingHeaders = headers.filter(h => h.toLowerCase().includes(keyword));
        reasoning.push(`Found ${keyword}-related columns: ${matchingHeaders.join(', ')}`);
      }
    });

    // Data pattern analysis
    if (csvData.length > 10) {
      reasoning.push(`File contains ${csvData.length} rows of data, indicating comprehensive ${fileType.replace('_', ' ')}`);
    }

    // Filename analysis
    if (filename.toLowerCase().includes(fileType.replace('_', ' '))) {
      reasoning.push(`Filename suggests ${fileType.replace('_', ' ')} document`);
    }

    return reasoning;
  }

  private suggestBuckets(csvData: any[], fileType: string): { [key: string]: string } {
    const headers = Object.keys(csvData[0] || {});
    
    const bucketMappings: { [key: string]: { [key: string]: string } } = {
      balance_sheet: {
        'Account': 'Accounts',
        'Balance': 'Amount',
        'Assets': 'Assets',
        'Cash': 'Current Assets',
        'Liabilities': 'Liabilities',
        'Capital': 'Equity'
      },
      rent_roll: {
        'Unit': 'Property Information',
        'Tenant': 'Tenant Information',
        'Market': 'Market Data',
        'Rent': 'Revenue',
        'Deposit': 'Security Deposits',
        'Status': 'Administrative'
      },
      cash_flow: {
        'Account': 'Accounts',
        'Income': 'Revenue',
        'Expense': 'Expenses',
        'Operating': 'Operations',
        'Administrative': 'Administrative',
        'Total': 'Summary'
      }
    };

    const suggestedBuckets: { [key: string]: string } = {};
    const mapping = bucketMappings[fileType] || {};

    headers.forEach(header => {
      const headerLower = header.toLowerCase();
      
      // Find best bucket match
      Object.entries(mapping).forEach(([pattern, bucket]) => {
        if (headerLower.includes(pattern.toLowerCase())) {
          suggestedBuckets[header] = bucket;
        }
      });

      // Default bucket if no match found
      if (!suggestedBuckets[header]) {
        suggestedBuckets[header] = fileType === 'balance_sheet' ? 'General' :
                                  fileType === 'rent_roll' ? 'Property Data' : 'Financial Data';
      }
    });

    return suggestedBuckets;
  }

  private generateSyntheticExamples(): TrainingData[] {
    return [
      // Simulated balance sheet examples
      {
        features: [5, 0.8, 0.2, 0.1, 0.6, 0.3], // High balance sheet score
        label: 'balance_sheet',
        confidence: 0.9
      },
      // Simulated rent roll examples
      {
        features: [8, 0.1, 0.9, 0.1, 0.8, 0.2], // High rent roll score
        label: 'rent_roll',
        confidence: 0.85
      },
      // Simulated cash flow examples
      {
        features: [12, 0.1, 0.1, 0.8, 0.7, 0.1], // High cash flow score
        label: 'cash_flow',
        confidence: 0.88
      }
    ];
  }

  private calculateMetrics(trainingData: TrainingData[]): ModelPerformance {
    const labels = ['balance_sheet', 'rent_roll', 'cash_flow'];
    const metrics: any = {
      precision: {},
      recall: {},
      f1Score: {}
    };

    labels.forEach(label => {
      const truePositives = trainingData.filter(d => {
        const prediction = this.predictFileType([], '').fileType; // Mock prediction
        return d.label === label && prediction === label;
      }).length;

      const falsePositives = trainingData.filter(d => {
        const prediction = this.predictFileType([], '').fileType; // Mock prediction
        return d.label !== label && prediction === label;
      }).length;

      const falseNegatives = trainingData.filter(d => {
        const prediction = this.predictFileType([], '').fileType; // Mock prediction
        return d.label === label && prediction !== label;
      }).length;

      metrics.precision[label] = truePositives / (truePositives + falsePositives) || 0;
      metrics.recall[label] = truePositives / (truePositives + falseNegatives) || 0;
      metrics.f1Score[label] = 2 * (metrics.precision[label] * metrics.recall[label]) / 
        (metrics.precision[label] + metrics.recall[label]) || 0;
    });

    const accuracy = trainingData.filter(d => {
      const prediction = this.predictFileType([], '').fileType; // Mock prediction
      return prediction === d.label;
    }).length / trainingData.length;

    metrics.accuracy = accuracy;
    return metrics as ModelPerformance;
  }

  private parseNumericValue(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    const numStr = value.toString().replace(/[,$]/g, '');
    const parsed = parseFloat(numStr);
    return isNaN(parsed) ? 0 : parsed;
  }

  private saveModelData(): void {
    try {
      localStorage.setItem('propfi_ai_model_data', JSON.stringify(this.modelData));
    } catch (error) {
      console.error('Error saving model data:', error);
    }
  }

  private loadModelData(): void {
    try {
      const data = localStorage.getItem('propfi_ai_model_data');
      if (data) {
        this.modelData = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading model data:', error);
    }
  }

  // Export model for backup
  exportModel(): string {
    return JSON.stringify({
      modelData: this.modelData,
      keywords: this.keywords,
      exportedAt: new Date().toISOString()
    });
  }

  // Import model from backup
  importModel(modelJson: string): boolean {
    try {
      const model = JSON.parse(modelJson);
      this.modelData = model.modelData;
      this.keywords = model.keywords;
      this.saveModelData();
      return true;
    } catch (error) {
      console.error('Error importing model:', error);
      return false;
    }
  }
}

export const aiTrainingService = new AITrainingService();

