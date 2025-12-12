import { Sequelize, QueryTypes, Transaction } from "sequelize";

type QueryTypesType = typeof QueryTypes;

/**
 * SeederContext wraps sequelize, QueryTypes, and transaction
 * to provide a cleaner API for seeder functions
 */
export class SeederContext {
  public readonly sequelize: Sequelize;
  public readonly QueryTypes: QueryTypesType;
  public transaction: Transaction | null;

  constructor(
    sequelize: Sequelize,
    queryTypes: QueryTypesType,
    transaction: Transaction | null = null
  ) {
    this.sequelize = sequelize;
    this.QueryTypes = queryTypes;
    this.transaction = transaction;
  }

  /**
   * Execute a SELECT query
   */
  async query<T = any>(sql: string, replacements: Record<string, any> = {}): Promise<T[]> {
    const result = await this.sequelize.query(sql, {
      replacements,
      type: this.QueryTypes.SELECT,
      transaction: this.transaction,
    });
    // Sequelize SELECT returns the array directly when using QueryTypes.SELECT
    return result as unknown as T[];
  }

  /**
   * Execute an INSERT query and return the first result
   */
  async insert<T = any>(sql: string, replacements: Record<string, any> = {}): Promise<T> {
    const [result] = await this.sequelize.query(sql, {
      replacements,
      type: this.QueryTypes.INSERT as any,
      transaction: this.transaction,
    });
    if (!result || !result[0]) {
      throw new Error("Insert query did not return a result");
    }
    return result[0] as T;
  }

  /**
   * Execute a raw query (for UPDATE, DELETE, etc.)
   */
  async rawQuery(sql: string, replacements: Record<string, any> = {}): Promise<[any[], any]> {
    return this.sequelize.query(sql, {
      replacements,
      transaction: this.transaction,
    });
  }

  /**
   * Verify that the transaction is still valid
   */
  async verifyTransaction(): Promise<boolean> {
    try {
      await this.sequelize.query("SELECT 1", { transaction: this.transaction });
      return true;
    } catch (err: any) {
      console.error("❌ Transaction was aborted!");
      console.error("  Error:", err.message);
      throw err;
    }
  }
}
