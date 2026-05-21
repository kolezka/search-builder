CREATE TABLE IF NOT EXISTS "app_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "folders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "queries" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"engine" text NOT NULL,
	"tree" text NOT NULL,
	"folder_id" text,
	"template_id" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"last_opened_at" bigint,
	"deleted_at" bigint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "query_tags" (
	"query_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "query_tags_query_id_tag_id_pk" PRIMARY KEY("query_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" bigint NOT NULL,
	"expires_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"engine" text NOT NULL,
	"tree" text NOT NULL,
	"category" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_folders_deleted" ON "folders" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_queries_folder" ON "queries" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_queries_engine" ON "queries" USING btree ("engine");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_queries_deleted" ON "queries" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_queries_last_opened" ON "queries" USING btree ("last_opened_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_expires" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_tags_name" ON "tags" USING btree ("name");