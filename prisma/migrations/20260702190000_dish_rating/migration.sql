-- CreateTable: dish_ratings (valoración por plato)
CREATE TABLE "dish_ratings" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "dish_id" TEXT NOT NULL,
    "course" "dish_course" NOT NULL,
    "employee_id" TEXT NOT NULL,
    "tenant_catering" TEXT NOT NULL,
    "tenant_empresa" TEXT NOT NULL,
    "service_date" DATE NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dish_ratings_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "dish_ratings_order_id_dish_id_key" ON "dish_ratings"("order_id", "dish_id");
CREATE INDEX "dish_ratings_tenant_catering_service_date_idx" ON "dish_ratings"("tenant_catering", "service_date");
CREATE INDEX "dish_ratings_tenant_empresa_service_date_idx" ON "dish_ratings"("tenant_empresa", "service_date");
CREATE INDEX "dish_ratings_tenant_catering_tenant_empresa_idx" ON "dish_ratings"("tenant_catering", "tenant_empresa");
CREATE INDEX "dish_ratings_dish_id_idx" ON "dish_ratings"("dish_id");
CREATE INDEX "dish_ratings_rating_idx" ON "dish_ratings"("rating");

-- Foreign keys
ALTER TABLE "dish_ratings" ADD CONSTRAINT "dish_ratings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dish_ratings" ADD CONSTRAINT "dish_ratings_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "dishes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dish_ratings" ADD CONSTRAINT "dish_ratings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
