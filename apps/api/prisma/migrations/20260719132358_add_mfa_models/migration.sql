-- CreateTable
CREATE TABLE "email_otp_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trusted_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_otp_codes_user_id_idx" ON "email_otp_codes"("user_id");

-- CreateIndex
CREATE INDEX "email_otp_codes_expires_at_idx" ON "email_otp_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "trusted_devices_token_hash_key" ON "trusted_devices"("token_hash");

-- CreateIndex
CREATE INDEX "trusted_devices_user_id_idx" ON "trusted_devices"("user_id");

-- CreateIndex
CREATE INDEX "trusted_devices_expires_at_idx" ON "trusted_devices"("expires_at");

-- AddForeignKey
ALTER TABLE "email_otp_codes" ADD CONSTRAINT "email_otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
