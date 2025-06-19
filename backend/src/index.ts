import express from "express";
import { getWorldwideHolidays } from "./nagerApi";

const app = express();
const port = process.env.PORT || 3001; // port 3001 for backend

// Express middleware for parsing incoming requests with JSON payload.
app.use(express.json());

// CORS (Cross-Origin Resource Sharing)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow requests from any domain (for development)
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Endpoint for receiving worldwide holidays
app.get("/api/v1/holidays/worldwide", async (req, res) => {
  const yearParam = req.query.year as string;
  const monthParam = req.query.month as string;

  if (!yearParam || isNaN(parseInt(yearParam))) {
    return res
      .status(400)
      .json({ error: 'Valid "year" query parameter is required.' });
  }

  const year = parseInt(yearParam);
  let month: number | undefined;

  if (monthParam) {
    const parsedMonth = parseInt(monthParam);
    if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({
        error:
          'Optional "month" query parameter must be a number between 1 and 12.',
      });
    }
    month = parsedMonth;
  }

  try {
    const holidays = await getWorldwideHolidays(year, month);
    res.json(holidays);
  } catch (error) {
    console.error("Error in /api/v1/holidays/worldwide:", error);
    res.status(500).json({ error: "Failed to retrieve worldwide holidays." });
  }
});

//start server
app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
  console.log(
    "API endpoint: /api/v1/holidays/worldwide?year=<YEAR>&month=<OPTIONAL_MONTH>"
  );
});
