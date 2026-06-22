import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1777339244966 implements MigrationInterface {
    name = 'InitialSchema1777339244966'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."events_status_enum" AS ENUM('ACTIVE', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "location" character varying NOT NULL, "capacity" integer NOT NULL, "availableTickets" integer NOT NULL, "status" "public"."events_status_enum" NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "created_by_id" uuid NOT NULL, CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying NOT NULL, "price" numeric(10,2) NOT NULL, "quantity" integer NOT NULL, "event_id" uuid NOT NULL, CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."sales_status_enum" AS ENUM('COMPLETED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "sales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL, "total" numeric(10,2) NOT NULL, "status" "public"."sales_status_enum" NOT NULL DEFAULT 'COMPLETED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "ticket_id" uuid NOT NULL, CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_08e606dc5182b142dc916e7abab" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_bd5387c23fb40ae7e3526ad75ea" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_5f282f3656814ec9ca2675aef6f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sales" ADD CONSTRAINT "FK_c3de02390221b599689262c56a8" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_c3de02390221b599689262c56a8"`);
        await queryRunner.query(`ALTER TABLE "sales" DROP CONSTRAINT "FK_5f282f3656814ec9ca2675aef6f"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_bd5387c23fb40ae7e3526ad75ea"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_08e606dc5182b142dc916e7abab"`);
        await queryRunner.query(`DROP TABLE "sales"`);
        await queryRunner.query(`DROP TYPE "public"."sales_status_enum"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP TABLE "events"`);
        await queryRunner.query(`DROP TYPE "public"."events_status_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
