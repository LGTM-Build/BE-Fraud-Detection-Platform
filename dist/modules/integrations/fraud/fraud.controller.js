"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudIntegrationController = void 0;
const fraud_schema_1 = require("./fraud.schema");
const fraud_service_1 = require("./fraud.service");
class FraudIntegrationController {
    static async insertSingle(req, res, next) {
        try {
            const parsed = fraud_schema_1.insertFraudResultSchema.parse(req.body);
            const result = await fraud_service_1.FraudIntegrationService.insertSingle(parsed);
            return res.status(201).json({
                success: true,
                message: "Fraud result inserted successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async insertBatch(req, res, next) {
        try {
            const parsed = fraud_schema_1.insertFraudResultsBatchSchema.parse(req.body);
            const result = await fraud_service_1.FraudIntegrationService.insertBatch(parsed);
            return res.status(201).json({
                success: true,
                message: "Fraud results batch inserted successfully",
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.FraudIntegrationController = FraudIntegrationController;
