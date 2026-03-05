-- CreateTable
CREATE TABLE "user_memories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fact" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_memories_user_id_idx" ON "user_memories"("user_id");

-- AddForeignKey
ALTER TABLE "user_memories" ADD CONSTRAINT "user_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
