const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { parse } = require("csv-parse/sync");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors({ origin: "http://localhost:3000", credentials: true })); // adjust origin to match the front-end dev URL
app.use(express.json({ limit: "10mb" }));

// In-memory storage for demo (in production, use database)
const processedDataStore = new Map();
const deduplicationKeys = new Set();

app.post("/api/process-csv-local", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const csvBuffer = req.file.buffer;
    
    // Parse CSV with different options for different formats
    let rows: any[] = [];
    let columns: string[] = [];
    let monthColumns: string[] = [];
    let isMonthColumnFormat = false;
    
    // First, try to parse as regular CSV
    try {
      console.log("🔄 Attempting to parse CSV...");
      
      // Check if this looks like a Gilroy-style CSV (has header rows before data)
      const csvText = csvBuffer.toString();
      const lines = csvText.split('\n');
      
      if (lines.length > 0 && lines[0].includes("Cal Bay Property Management")) {
        console.log("🔍 Detected Gilroy-style CSV, looking for data start...");
        
        // Find the "Account Name" row
        let dataStartIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes("account name")) {
            dataStartIndex = i;
            console.log(`📊 Found data start at line ${i}: ${lines[i]}`);
            break;
          }
        }
        
        if (dataStartIndex >= 0) {
          // Extract data starting from the "Account Name" row
          const dataLines = lines.slice(dataStartIndex);
          const dataCsv = dataLines.join('\n');
          
          console.log(`🔄 Re-parsing CSV from line ${dataStartIndex}...`);
          try {
            // First, let's check the raw CSV content
            console.log(`📄 Raw CSV content preview: ${dataCsv.substring(0, 500)}`);
            
            rows = parse(dataCsv, { 
              columns: true, 
              skip_empty_lines: true,
              relax_column_count: true,  // Allow varying column counts
              trim: true
            });
            columns = rows.length ? Object.keys(rows[0]) : [];
            console.log(`✅ Re-parsed successfully: ${rows.length} rows, ${columns.length} columns`);
            console.log(`📊 Columns: ${columns.join(', ')}`);
            if (rows.length > 0) {
              console.log(`📊 First row sample: ${JSON.stringify(rows[0])}`);
              // Check if we have the Total column
              if (rows[0]['Total']) {
                console.log(`💰 Found Total column with value: ${rows[0]['Total']}`);
              }
            }
          } catch (reparseError) {
            console.error("❌ Re-parsing failed:", reparseError);
            throw reparseError;
          }
        } else {
          console.log("⚠️ Could not find 'Account Name' row, using original parsing");
          rows = parse(csvBuffer, { 
            columns: true, 
            skip_empty_lines: true,
            relax_column_count: true,
            trim: true
          });
          columns = rows.length ? Object.keys(rows[0]) : [];
        }
      } else {
        // Regular CSV parsing
        rows = parse(csvBuffer, { 
          columns: true, 
          skip_empty_lines: true,
          relax_column_count: true,
          trim: true
        });
        columns = rows.length ? Object.keys(rows[0]) : [];
      }
      
      console.log(`✅ Parse successful: ${rows.length} rows, ${columns.length} columns`);
      
      // Transform dates from Jan 2024-Dec 2024 to Aug 2024-Jul 2025
      if (rows.length > 0 && rows[0].Date) {
        console.log("🔄 Transforming dates from Jan 2024-Dec 2024 to Aug 2024-Jul 2025...");
        
        const monthMapping = {
          '2024-01-15': 'Aug 2024',
          '2024-02-15': 'Sep 2024', 
          '2024-03-15': 'Oct 2024',
          '2024-04-15': 'Nov 2024',
          '2024-05-15': 'Dec 2024',
          '2024-06-15': 'Jan 2025',
          '2024-07-15': 'Feb 2025',
          '2024-08-15': 'Mar 2025',
          '2024-09-15': 'Apr 2025',
          '2024-10-15': 'May 2025',
          '2024-11-15': 'Jun 2025',
          '2024-12-15': 'Jul 2025'
        };
        
        rows = rows.map(row => {
          if (row.Date && monthMapping[row.Date]) {
            return {
              ...row,
              Date: monthMapping[row.Date],
              month: monthMapping[row.Date]
            };
          }
          return row;
        });
        
        console.log(`✅ Date transformation complete. Sample dates:`, rows.slice(0, 3).map(r => r.Date));
      }
      
      // Detect month-column format
      monthColumns = columns.filter(col => {
        const normalized = col.toLowerCase().trim();
        return /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}$/i.test(normalized);
      });
      
      isMonthColumnFormat = monthColumns.length > 0;
      
    } catch (parseError) {
      console.error("❌ CSV parsing error:", parseError);
      console.error("📄 CSV content preview:", csvBuffer.toString().substring(0, 500));
      return res.status(400).json({ 
        error: "Failed to parse CSV file", 
        details: parseError.message,
        preview: csvBuffer.toString().substring(0, 200)
      });
    }
    
    return res.json({
      ok: true,
      rowsParsed: rows.length,
      columns,
      monthColumns,
      isMonthColumnFormat,
      sample: rows, // Return all rows for complete monthly data
    });
  } catch (e: any) {
    console.error("process-csv-local failed:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
});

// Unified data pipeline endpoint
app.post("/api/save-processed-data", async (req, res) => {
  try {
    const { data, propertyName, source, timestamp } = req.body;
    
    if (!data || !propertyName) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required data or property name" 
      });
    }

    console.log(`💾 Saving data for ${propertyName} from ${source} source...`);
    
    // Generate deduplication key based on property + source + timestamp
    const dedupKey = `${propertyName}-${source}-${timestamp}`;
    
    // Check for duplicates
    if (deduplicationKeys.has(dedupKey)) {
      console.log(`⚠️ Duplicate data detected for ${dedupKey}`);
      return res.json({
        success: true,
        message: "Data already exists (duplicate prevented)",
        duplicate: true,
        dataId: dedupKey
      });
    }

    // Analyze the data for insights
    const analysis = analyzeData(data, propertyName, source);
    
    // Store the data with analysis
    const dataId = `data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const processedData = {
      id: dataId,
      propertyName,
      source,
      timestamp,
      data: {
        ...data,
        aiAnalysis: {
          totalAmount: analysis.insights.revenue,
          confidence: analysis.insights.confidence,
          categories: analysis.insights.categories,
          totalRecords: analysis.insights.totalRecords,
          format: analysis.insights.format
        }
      },
      createdAt: new Date().toISOString(),
      dedupKey
    };

    processedDataStore.set(dataId, processedData);
    deduplicationKeys.add(dedupKey);

    console.log(`✅ Data saved successfully: ${dataId}`);
    
    return res.json({
      success: true,
      message: "Data saved successfully",
      dataId,
      analysis,
      totalRecords: processedDataStore.size
    });

  } catch (e: any) {
    console.error("save-processed-data failed:", e);
    return res.status(500).json({ 
      success: false, 
      error: e?.message || "Unknown error" 
    });
  }
});

// Get all processed data
app.get("/api/processed-data", (req, res) => {
  try {
    const allData = Array.from(processedDataStore.values());
    
    // Group by property
    const groupedData = allData.reduce((acc, item) => {
      if (!acc[item.propertyName]) {
        acc[item.propertyName] = [];
      }
      acc[item.propertyName].push(item);
      return acc;
    }, {});

    return res.json({
      success: true,
      data: groupedData,
      totalProperties: Object.keys(groupedData).length,
      totalRecords: allData.length
    });
  } catch (e: any) {
    console.error("get-processed-data failed:", e);
    return res.status(500).json({ 
      success: false, 
      error: e?.message || "Unknown error" 
    });
  }
});

// Clear all processed data
app.delete("/api/processed-data", (req, res) => {
  try {
    const previousCount = processedDataStore.size;
    processedDataStore.clear();
    deduplicationKeys.clear();
    
    console.log(`🗑️ Cleared ${previousCount} records from processed data store`);
    
    return res.json({
      success: true,
      message: `Cleared ${previousCount} records`,
      totalRecords: 0
    });
  } catch (e: any) {
    console.error("clear-data failed:", e);
    return res.status(500).json({ 
      success: false, 
      error: e?.message || "Unknown error" 
    });
  }
});

// Analyze data for insights
function analyzeData(data: any, propertyName: string, source: string) {
  // Handle CSV data structure
  let totalRecords = 0;
  let revenue = 0;
  let format = 'unknown';
  let confidence = 0;
  let categories = {};
  
  if (data.rowsParsed) {
    // CSV data structure
    totalRecords = data.rowsParsed;
    format = data.isMonthColumnFormat ? 'month-column' : 'standard';
    confidence = 0.9; // High confidence for CSV data
    
    // Calculate revenue from Total column (for Gilroy-style data)
    if (data.sample && data.sample.length > 0) {
      const totalColumn = data.sample.find(row => row['Total']);
      if (totalColumn && totalColumn['Total']) {
        revenue = parseFloat(totalColumn['Total']) || 0;
      }
    }
    
    // Calculate revenue from Monthly Revenue column (for Chico-style data)
    if (revenue === 0 && data.sample && data.sample.length > 0) {
      const monthlyRevenue = data.sample.reduce((sum: number, row: any) => {
        const monthlyRev = parseFloat(row['Monthly Revenue']) || 0;
        return sum + monthlyRev;
      }, 0);
      revenue = monthlyRevenue;
    }
    
    // Generate categories from account names
    if (data.sample) {
      categories = data.sample.reduce((acc: any, row: any) => {
        const accountName = row['Account Name'];
        if (accountName && accountName !== 'Total Rents') {
          acc[accountName] = {
            amount: parseFloat(row['Total']) || 0,
            type: accountName.toLowerCase().includes('income') ? 'revenue' : 'expense'
          };
        }
        return acc;
      }, {});
    }
  } else {
    // Legacy data structure
    totalRecords = data.totalRows || 0;
    format = data.format || 'unknown';
    confidence = data.aiAnalysis?.confidence || 0;
    revenue = data.aiAnalysis?.totalAmount || 0;
    categories = data.aiAnalysis?.categories || {};
  }
  
  const analysis = {
    propertyName,
    source,
    timestamp: new Date().toISOString(),
    insights: {
      totalRecords,
      format,
      confidence,
      revenue,
      categories
    },
    recommendations: []
  };

  // Add recommendations based on data
  if (analysis.insights.confidence < 0.8) {
    analysis.recommendations.push("Low confidence score - consider manual review");
  }
  
  if (analysis.insights.totalRecords === 0) {
    analysis.recommendations.push("No records processed - check CSV format");
  }
  
  if (source === 'local' && analysis.insights.totalRecords > 0) {
    analysis.recommendations.push("Consider syncing to Supabase for persistence");
  }

  return analysis;
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Local CSV server listening on http://localhost:${PORT}`);
});