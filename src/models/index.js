const { Sequelize } = require("sequelize");
const config = require("../config/database");
const env = process.env.NODE_ENV || "development";

const sequelize = new Sequelize(config[env]);

const CompanyFactory = require("./company.model");
const EmployeeFactory = require("./employee.model");
const UserFactory = require("./user.model");

const Company = CompanyFactory(sequelize);
const Employee = EmployeeFactory(sequelize);
const User = UserFactory(sequelize);

Company.hasMany(Employee, { foreignKey: "company_id", as: "employees" });
Employee.belongsTo(Company, { foreignKey: "company_id", as: "company" });

Company.hasMany(User, { foreignKey: "company_id", as: "users" });
User.belongsTo(Company, { foreignKey: "company_id", as: "company" });

Employee.hasOne(User, { foreignKey: "employee_id", as: "user" });
User.belongsTo(Employee, { foreignKey: "employee_id", as: "employee" });

module.exports = {
  sequelize,
  Sequelize,
  Company,
  Employee,
  User,
};
