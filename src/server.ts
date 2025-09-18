import express from "express";
import cors from "cors";
import { mapSuggestRouter } from "./routes/mapSuggest.js";
import { importCsvRouter } from "./routes/importCsv.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api/map", mapSuggestRouter);
app.use("/api/import", importCsvRouter);

// Add processed data endpoint
app.get("/api/processed-data", (req, res) => {
  // For now, return mock data structure that matches what the frontend expects
  // In a real implementation, this would fetch from Supabase or local storage
  const mockData = {
    success: true,
    data: {
      "Chico": [
        {
          data: {
            sample: [
              {
                "Date": "2024-01-01",
                "Monthly Revenue": 45000,
                "Maintenance Cost": 5000,
                "Utilities Cost": 3000,
                "Insurance Cost": 2000,
                "Property Tax": 1500,
                "Other Expenses": 2000,
                "Net Income": 31500,
                "Occupancy Rate": 95,
                "Total Units": 26
              },
              {
                "Date": "2024-02-01",
                "Monthly Revenue": 46000,
                "Maintenance Cost": 4500,
                "Utilities Cost": 3200,
                "Insurance Cost": 2000,
                "Property Tax": 1500,
                "Other Expenses": 1800,
                "Net Income": 33000,
                "Occupancy Rate": 96,
                "Total Units": 26
              },
              {
                "Date": "2024-03-01",
                "Monthly Revenue": 47000,
                "Maintenance Cost": 5500,
                "Utilities Cost": 2800,
                "Insurance Cost": 2000,
                "Property Tax": 1500,
                "Other Expenses": 2200,
                "Net Income": 33000,
                "Occupancy Rate": 94,
                "Total Units": 26
              },
              {
                "Date": "2024-04-01",
                "Monthly Revenue": 48000,
                "Maintenance Cost": 4800,
                "Utilities Cost": 3100,
                "Insurance Cost": 2000,
                "Property Tax": 1500,
                "Other Expenses": 1900,
                "Net Income": 34700,
                "Occupancy Rate": 97,
                "Total Units": 26
              },
              {
                "Date": "2024-05-01",
                "Monthly Revenue": 49000,
                "Maintenance Cost": 5200,
                "Utilities Cost": 2900,
                "Insurance Cost": 2000,
                "Property Tax": 1500,
                "Other Expenses": 2100,
                "Net Income": 35300,
                "Occupancy Rate": 95,
                "Total Units": 26
              },
              {
                "Date": "2024-06-01",
                "Monthly Revenue": 50000,
                "Maintenance Cost": 4600,
                "Utilities Cost": 3300,
                "Insurance Cost": 2000,
                "Property Tax": 1500,
                "Other Expenses": 1800,
                "Net Income": 36800,
                "Occupancy Rate": 96,
                "Total Units": 26
              },
              {
                "Date": "2024-07-01",
                "Monthly Revenue": 51000,
                "Maintenance Cost": 5400,
                "Utilities Cost": 2700,
                "Insurance Cost": 2000,
                "Property Tax": 1500,
                "Other Expenses": 2300,
                "Net Income": 36100,
                "Occupancy Rate": 94,
                "Total Units": 26
              },
              {
                "Date": "2024-08-01",
                "Monthly Revenue": 52000,
                "Maintenance Cost": 4900,
                "Utilities Cost": 3000,
                "Insurance Cost": 2000,
                "Property Tax": 1500,
                "Other Expenses": 2000,
                "Net Income": 37600,
                "Occupancy Rate": 97,
                "Total Units": 26
              },
              {
                "Date": "2024-09-01",
                "Monthly Revenue": 53000,
                "Maintenance Cost": 5100,
                "Utilities Cost": 2800,
                "Insurance Cost": 2000,
                "Property Tax": 1500,
                "Other Expenses": 2200,
                "Net Income": 38400,
                "Occupancy Rate": 95,
                "Total Units": 26
              },
              {
                "Date": "2024-10-01",
                "Monthly Revenue": 54000,
                "Maintenance Cost": 4700,
                "Utilities Cost": 3200,
                "Insurance Cost": 2000,
                "Property Tax": 1500,
                "Other Expenses": 1900,
                "Net Income": 39200,
                "Occupancy Rate": 96,
                "Total Units": 26
              },
              {
                "Date": "2024-11-01",
                "Monthly Revenue": 55000,
                "Maintenance Cost": 5300,
                "Utilities Cost": 2900,
                "Insurance Cost": 2000,
                "Property Tax": 1500,
                "Other Expenses": 2100,
                "Net Income": 40200,
                "Occupancy Rate": 94,
                "Total Units": 26
              },
              {
                "Date": "2024-12-01",
                "Monthly Revenue": 56000,
                "Maintenance Cost": 5000,
                "Utilities Cost": 3100,
                "Insurance Cost": 2000,
                "Property Tax": 1500,
                "Other Expenses": 2000,
                "Net Income": 41400,
                "Occupancy Rate": 97,
                "Total Units": 26
              }
            ]
          }
        }
      ]
    }
  };
  
  res.json(mockData);
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log("CSV Parser API running on port", PORT));
