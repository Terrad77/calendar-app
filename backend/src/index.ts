import express from "express";
import cors from "cors";
import { getWorldwideHolidays } from "./nagerApi";

const app = express();
const port = process.env.PORT || 3001; // port 3001 for backend

// Express middleware for parsing incoming requests with JSON payload.
app.use(express.json());

// CORS (Cross-Origin Resource Sharing)
app.use(
  cors({
    origin: [
      "https://calendar-app-pi-gold.vercel.app", // nain Vercel domain
      "https://calendar-app-git-main-terrad77s-projects.vercel.app", // domain for branch 'main' on Vercel (for preview)
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

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
