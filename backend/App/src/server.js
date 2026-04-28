require("dotenv").config();
const express = require("express");
const cors = require("cors");
const configViewEngine = require("./config/viewEngine");
const apiRoutes = require("./routes/api");
const pool = require("./db");
const { getHomepage } = require("./controllers/homeController");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
configViewEngine(app);
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});
app.use("/v1/api", apiRoutes);
app.use("/", getHomepage);

(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected successfully");

    app.listen(port, () => {
      console.log(`Backend Nodejs App listening on port ${port}`);
    });
  } catch (error) {
    console.error(">>> Error connect to DB:", error);
    process.exit(1);
  }
})();



const cron = require("node-cron");
const { markAbsentForToday } = require("./services/attendanceService");

// Cấu trúc: 'Phút Giờ Ngày Tháng Thứ'
// 59 23 * * * = Chạy vào phút 59, giờ 23, mỗi ngày
cron.schedule("59 23 * * *", () => {
  console.log("⏰ Bắt đầu quét danh sách vắng mặt cuối ngày...");
  markAbsentForToday();
});
