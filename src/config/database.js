const env = require("./env");

module.exports = {
  development: {
    username: env.db.user,
    password: env.db.pass,
    database: env.db.name,
    host: env.db.host,
    port: env.db.port,
    dialect: "mysql",
    logging: false,
  },
  test: {
    username: env.db.user,
    password: env.db.pass,
    database: env.db.name,
    host: env.db.host,
    port: env.db.port,
    dialect: "mysql",
    logging: false,
  },
  production: {
    username: env.db.user,
    password: env.db.pass,
    database: env.db.name,
    host: env.db.host,
    port: env.db.port,
    dialect: "mysql",
    logging: false,
  },
};
