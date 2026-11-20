-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'RINGING', 'ACCEPTED', 'SEATED', 'SKIPPED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('ONLINE', 'WALK_IN');

-- CreateTable
CREATE TABLE "queue_entries" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "user_id" UUID,
    "guest_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "queue_number" TEXT NOT NULL,
    "party_size" INTEGER NOT NULL,
    "registration_type" "RegistrationType" NOT NULL,
    "position" INTEGER,
    "estimated_wait_minutes" INTEGER,
    "estimated_wait_minutes_at_join" INTEGER,
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "ring_count" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seated_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_assignments" (
    "id" UUID NOT NULL,
    "queue_entry_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(3),

    CONSTRAINT "table_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_status_history" (
    "id" UUID NOT NULL,
    "queue_entry_id" UUID NOT NULL,
    "previous_status" "QueueStatus",
    "current_status" "QueueStatus" NOT NULL,
    "changed_by" TEXT,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "queue_entries_restaurant_id_status_joined_at_idx" ON "queue_entries"("restaurant_id", "status", "joined_at");

-- CreateIndex
CREATE INDEX "queue_entries_restaurant_id_joined_at_idx" ON "queue_entries"("restaurant_id", "joined_at");

-- CreateIndex
CREATE INDEX "queue_entries_user_id_status_idx" ON "queue_entries"("user_id", "status");

-- CreateIndex
CREATE INDEX "table_assignments_queue_entry_id_assigned_at_idx" ON "table_assignments"("queue_entry_id", "assigned_at");

-- CreateIndex
CREATE INDEX "table_assignments_table_id_idx" ON "table_assignments"("table_id");

-- CreateIndex
CREATE INDEX "queue_status_history_queue_entry_id_changed_at_idx" ON "queue_status_history"("queue_entry_id", "changed_at");

-- AddForeignKey
ALTER TABLE "table_assignments" ADD CONSTRAINT "table_assignments_queue_entry_id_fkey" FOREIGN KEY ("queue_entry_id") REFERENCES "queue_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_status_history" ADD CONSTRAINT "queue_status_history_queue_entry_id_fkey" FOREIGN KEY ("queue_entry_id") REFERENCES "queue_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
