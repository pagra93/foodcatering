-- Business Plan / Modelo Financiero: escenarios (supuestos), costes reales y snapshots de MRR.

CREATE TYPE "financial_scenario_kind" AS ENUM ('base', 'optimistic', 'pessimistic', 'custom');

CREATE TABLE "financial_scenarios" (
  "id"             TEXT NOT NULL,
  "key"            TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "description"    TEXT,
  "kind"           "financial_scenario_kind" NOT NULL DEFAULT 'custom',
  "is_default"     BOOLEAN NOT NULL DEFAULT false,
  "start_month"    TEXT NOT NULL,
  "horizon_months" INTEGER NOT NULL DEFAULT 36,
  "assumptions"    JSONB NOT NULL DEFAULT '{}',
  "updated_by"     TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "financial_scenarios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_scenarios_key_key" ON "financial_scenarios" ("key");

CREATE TABLE "financial_actuals" (
  "id"            TEXT NOT NULL,
  "period"        TEXT NOT NULL,
  "cogs_hosting"  DECIMAL(12, 2),
  "cogs_payments" DECIMAL(12, 2),
  "cogs_support"  DECIMAL(12, 2),
  "opex_sales"    DECIMAL(12, 2),
  "opex_rnd"      DECIMAL(12, 2),
  "opex_gna"      DECIMAL(12, 2),
  "headcount"     INTEGER,
  "notes"         TEXT,
  "extra"         JSONB NOT NULL DEFAULT '{}',
  "updated_by"    TEXT,
  "updated_at"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "financial_actuals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_actuals_period_key" ON "financial_actuals" ("period");

CREATE TABLE "mrr_snapshots" (
  "id"               TEXT NOT NULL,
  "period"           TEXT NOT NULL,
  "mrr"              DECIMAL(12, 2) NOT NULL,
  "arr"              DECIMAL(12, 2) NOT NULL,
  "active_companies" INTEGER NOT NULL,
  "active_caterings" INTEGER NOT NULL,
  "captured_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mrr_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mrr_snapshots_period_key" ON "mrr_snapshots" ("period");
