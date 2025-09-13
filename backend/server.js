const express = require('express');
const cors = require('cors');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: './config.env' });

const { testConnection, initializeDatabase } = require('./config/supabase');
const PropertyService = require('./services/propertyService');
const CSVService = require('./services/csvService');
const SmartCSVService = require('./services/smartCSVService');

// Import cashflow ingestion route
const cashflowIngestRoute = require('./routes/cashflowIngest');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!require('fs').existsSync(uploadDir)) {
      require('fs').mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Initialize services
const propertyService = PropertyService;
const csvService = CSVService;
const smartCSVService = SmartCSVService;

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Properties routes
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await propertyService.getAllProperties();
    res.json({ success: true, data: properties });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/properties', async (req, res) => {
  try {
    const { name, address, type, total_units } = req.body;
    
    if (!name || !address) {
      return res.status(400).json({ success: false, error: 'Name and address are required' });
    }

    const propertyId = await propertyService.createProperty({
      name,
      address,
      type: type || 'Apartment Complex',
      totalUnits: total_units || 0
    });

    const newProperty = await propertyService.getPropertyById(propertyId);
    res.status(201).json({ success: true, data: newProperty });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/properties/:id', async (req, res) => {
  try {
    const property = await propertyService.getPropertyById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    res.json({ success: true, data: property });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/properties/:id', async (req, res) => {
  try {
    const { name, address, type, total_units } = req.body;
    
    if (!name || !address) {
      return res.status(400).json({ success: false, error: 'Name and address are required' });
    }

    const success = await propertyService.updateProperty(req.params.id, {
      name,
      address,
      type: type || 'Apartment Complex',
      totalUnits: total_units || 0
    });

    if (!success) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    const updatedProperty = await propertyService.getPropertyById(req.params.id);
    res.json({ success: true, data: updatedProperty });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/properties/:id', async (req, res) => {
  try {
    const success = await propertyService.deleteProperty(req.params.id);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/properties-with-data', async (req, res) => {
  try {
    const properties = await propertyService.getPropertiesWithData();
    res.json({ success: true, data: properties });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Financial summary
app.get('/api/financial-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await propertyService.getFinancialSummary(startDate, endDate);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CSV upload route
app.post('/api/upload-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV file uploaded' });
    }

    const { propertyId } = req.body;
    if (!propertyId) {
      return res.status(400).json({ success: false, error: 'Property ID is required' });
    }

    // Validate property exists
    const property = await propertyService.getPropertyById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // Process CSV upload
    const result = await csvService.processCSVUpload(
      req.file.path,
      propertyId,
      req.file.originalname,
      req.file.size
    );

    res.json({ 
      success: true, 
      message: 'CSV uploaded and processed successfully',
      data: result
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process CSV file'
    });
  }
});

// CSV validation route
app.post('/api/validate-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV file uploaded' });
    }

    const { propertyName } = req.body;
    const validation = await csvService.validateCSV(req.file.path, propertyName);
    
    // Clean up file
    require('fs').unlinkSync(req.file.path);

    res.json({ 
      success: true, 
      data: validation
    });

  } catch (error) {
    console.error('CSV validation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to validate CSV file'
    });
  }
});

// AI-powered CSV analysis route
app.post('/api/analyze-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV file uploaded' });
    }

    console.log('🤖 Starting AI analysis for:', req.file.originalname);
    const analysis = await smartCSVService.getAIAnalysis(req.file.path, req.file.originalname);
    
    // Clean up file
    require('fs').unlinkSync(req.file.path);

    res.json({ 
      success: true, 
      data: analysis
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to analyze CSV file'
    });
  }
});

// Smart CSV upload route (AI-powered)
app.post('/api/smart-upload-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV file uploaded' });
    }

    const { propertyId } = req.body;
    if (!propertyId) {
      return res.status(400).json({ success: false, error: 'Property ID is required' });
    }

    // Validate property exists
    const property = await propertyService.getPropertyById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    console.log('🚀 Starting smart CSV upload with AI analysis...');
    
    // Process CSV upload with AI analysis
    const result = await smartCSVService.processSmartCSVUpload(
      req.file.path,
      propertyId,
      req.file.originalname,
      req.file.size
    );

    res.json({ 
      success: true, 
      message: 'CSV uploaded and processed with AI analysis',
      data: result
    });

  } catch (error) {
    console.error('Smart CSV upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process CSV file with AI'
    });
  }
});

// Property data routes
app.get('/api/properties/:id/data', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const data = await propertyService.getPropertyData(req.params.id, page, limit);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/properties/:id/aggregated', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await propertyService.getAggregatedPropertyData(req.params.id, startDate, endDate);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Chart data routes (commented out - methods not implemented in CSV service)
// app.get('/api/chart-data', async (req, res) => {
//   try {
//     const { propertyId, startDate, endDate } = req.query;
//     const data = await csvService.getChartData(propertyId, startDate, endDate);
//     res.json({ success: true, data: data });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// app.get('/api/monthly-data', async (req, res) => {
//   try {
//     const { propertyId } = req.query;
//     const data = await csvService.getMonthlyData(propertyId);
//     res.json({ success: true, data: data });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// Local CSV processing endpoint (no Supabase validation)
app.post('/api/process-csv-local', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV file uploaded' });
    }

    const { propertyName } = req.body;
    
    console.log('🏠 Starting local CSV processing...');
    
    // Process CSV locally without Supabase validation
    const result = await csvService.processCSVLocal(req.file.path, propertyName);
    
    res.json({ 
      success: true, 
      message: 'CSV processed locally with AI analysis',
      data: result
    });

  } catch (error) {
    console.error('Local CSV processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process CSV file locally'
    });
  }
});

// Cashflow ingestion route
app.use('/api', cashflowIngestRoute);

// Upload history
app.get('/api/upload-history', async (req, res) => {
  try {
    const { propertyId } = req.query;
    const history = await csvService.getUploadHistory(propertyId);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CSV Management routes

app.delete('/api/uploads/:id', async (req, res) => {
  try {
    const uploadId = req.params.id;
    const success = await csvService.deleteUpload(uploadId);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Upload not found' });
    }

    res.json({ success: true, message: 'Upload deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/uploads/:id/data', async (req, res) => {
  try {
    const uploadId = req.params.id;
    const success = await csvService.deletePropertyDataByUpload(uploadId);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'No data found for this upload' });
    }

    res.json({ success: true, message: 'Property data deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/uploads/:id/reprocess', async (req, res) => {
  try {
    const uploadId = req.params.id;
    const result = await csvService.reprocessUpload(uploadId);
    
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: 'File size too large. Maximum size is 10MB.' 
      });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'API endpoint not found' 
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Initialize database schema
    await initializeDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

startServer();
