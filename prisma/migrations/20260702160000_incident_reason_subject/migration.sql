-- AlterTable
ALTER TABLE "incidents" ADD COLUMN "reason_id" TEXT;
ALTER TABLE "incidents" ADD COLUMN "subject" TEXT;

-- CreateIndex
CREATE INDEX "incidents_reason_id_idx" ON "incidents"("reason_id");

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reason_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "incident_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
