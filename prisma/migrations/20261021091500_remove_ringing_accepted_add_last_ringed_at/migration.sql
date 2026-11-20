-- AlterEnum
BEGIN;
CREATE TYPE "QueueStatus_new" AS ENUM ('WAITING', 'SEATED', 'SKIPPED', 'CANCELLED', 'NO_SHOW');
ALTER TABLE "public"."queue_entries" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "queue_entries" ALTER COLUMN "status" TYPE "QueueStatus_new" USING ("status"::text::"QueueStatus_new");
ALTER TABLE "queue_status_history" ALTER COLUMN "previous_status" TYPE "QueueStatus_new" USING ("previous_status"::text::"QueueStatus_new");
ALTER TABLE "queue_status_history" ALTER COLUMN "current_status" TYPE "QueueStatus_new" USING ("current_status"::text::"QueueStatus_new");
ALTER TYPE "QueueStatus" RENAME TO "QueueStatus_old";
ALTER TYPE "QueueStatus_new" RENAME TO "QueueStatus";
DROP TYPE "public"."QueueStatus_old";
ALTER TABLE "queue_entries" ALTER COLUMN "status" SET DEFAULT 'WAITING';
COMMIT;

-- AlterTable
ALTER TABLE "queue_entries" ADD COLUMN     "last_ringed_at" TIMESTAMPTZ(3);
