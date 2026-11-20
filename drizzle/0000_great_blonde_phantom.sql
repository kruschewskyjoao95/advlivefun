CREATE TYPE "public"."profile_type" AS ENUM('client', 'lawyer');--> statement-breakpoint
CREATE TABLE "early_access_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"profile_type" "profile_type" NOT NULL,
	"privacy_consent_version" text NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "early_access_registrations_email_unique" UNIQUE("email")
);
