import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddingDefaultStuff1712311114083 implements MigrationInterface {
  name = 'AddingDefaultStuff1712311114083';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "AppUser" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sub" character varying NOT NULL, "name" character varying, CONSTRAINT "UQ_e6347b52ce71ef6cc49c1258ada" UNIQUE ("sub"), CONSTRAINT "UQ_e6347b52ce71ef6cc49c1258ada" UNIQUE ("sub"), CONSTRAINT "PK_616b1af76abd9437231bc736ca6" PRIMARY KEY ("id"))`,
    );

    // add user
    await queryRunner.manager
      .createQueryBuilder()
      .insert()
      .into('AppUser', ['sub', 'firstName', 'lastName'])
      .values([
        {
          sub: 'google-oauth2|100086312067632213642',
          firstName: 'Admin',
        },
      ])
      .execute();
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "AppUser"`);
  }
}
