require("dotenv").config();

module.exports = {
  app: {
    port: Number(process.env.PORT || 8000),
    env: process.env.NODE_ENV || "development",
  },
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
  },
  session: {
    secret: process.env.SESSION_SECRET,
  },
};
