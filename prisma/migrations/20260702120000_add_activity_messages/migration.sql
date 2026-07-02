-- CreateEnum
CREATE TYPE "activity_entity" AS ENUM ('penalty', 'incident');

-- CreateTable
CREATE TABLE "activity_messages" (
    "id" TEXT NOT NULL,
    "entity" "activity_entity" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_tenant" TEXT NOT NULL,
    "author_role" "user_role" NOT NULL,
    "body" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_messages_entity_entity_id_created_at_idx" ON "activity_messages"("entity", "entity_id", "created_at");
