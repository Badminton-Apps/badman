"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeederContext = void 0;
/**
 * SeederContext wraps sequelize, QueryTypes, and transaction
 * to provide a cleaner API for seeder functions
 */
class SeederContext {
    constructor(sequelize, queryTypes, transaction = null) {
        this.sequelize = sequelize;
        this.QueryTypes = queryTypes;
        this.transaction = transaction;
    }
    /**
     * Execute a SELECT query
     */
    async query(sql, replacements = {}) {
        const result = await this.sequelize.query(sql, {
            replacements,
            type: this.QueryTypes.SELECT,
            transaction: this.transaction,
        });
        // Sequelize SELECT returns the array directly when using QueryTypes.SELECT
        return result;
    }
    /**
     * Execute an INSERT query and return the first result
     */
    async insert(sql, replacements = {}) {
        const [result] = await this.sequelize.query(sql, {
            replacements,
            type: this.QueryTypes.INSERT,
            transaction: this.transaction,
        });
        if (!result || !result[0]) {
            throw new Error("Insert query did not return a result");
        }
        return result[0];
    }
    /**
     * Execute a raw query (for UPDATE, DELETE, etc.)
     */
    async rawQuery(sql, replacements = {}) {
        return this.sequelize.query(sql, {
            replacements,
            transaction: this.transaction,
        });
    }
    /**
     * Verify that the transaction is still valid
     */
    async verifyTransaction() {
        try {
            await this.sequelize.query("SELECT 1", { transaction: this.transaction });
            return true;
        }
        catch (err) {
            console.error("❌ Transaction was aborted!");
            console.error("  Error:", err.message);
            throw err;
        }
    }
}
exports.SeederContext = SeederContext;
