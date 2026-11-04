-- AlterTable
ALTER TABLE "queue_entries" ADD COLUMN     "cancelled_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "queue_status_history" ADD COLUMN     "reason" TEXT,
ADD COLUMN     "notes" TEXT;
