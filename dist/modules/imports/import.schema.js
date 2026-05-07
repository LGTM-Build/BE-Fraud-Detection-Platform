"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importQuerySchema = void 0;
const zod_1 = require("zod");
exports.importQuerySchema = zod_1.z.object({
    dispatchMl: zod_1.z
        .string()
        .optional()
        .transform((val) => val === "true"),
});
