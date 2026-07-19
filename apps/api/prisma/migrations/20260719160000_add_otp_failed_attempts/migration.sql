-- AlterTable
ALTER TABLE "email_otp_codes" ADD COLUMN "failed_attempts" INTEGER NOT NULL DEFAULT 0;
