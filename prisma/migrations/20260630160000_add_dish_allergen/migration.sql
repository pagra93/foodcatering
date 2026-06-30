-- CreateTable
CREATE TABLE "dish_allergens" (
    "dish_id" TEXT NOT NULL,
    "allergen_id" TEXT NOT NULL,

    CONSTRAINT "dish_allergens_pkey" PRIMARY KEY ("dish_id","allergen_id")
);

-- CreateIndex
CREATE INDEX "dish_allergens_allergen_id_idx" ON "dish_allergens"("allergen_id");

-- AddForeignKey
ALTER TABLE "dish_allergens" ADD CONSTRAINT "dish_allergens_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_allergens" ADD CONSTRAINT "dish_allergens_allergen_id_fkey" FOREIGN KEY ("allergen_id") REFERENCES "allergens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
