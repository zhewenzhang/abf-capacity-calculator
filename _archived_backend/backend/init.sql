-- ABF Capacity Calculator - Database Schema
-- Version: 1.0

-- Sku Table
CREATE TABLE if not exists skus (
    id              SERIAL PRIMARY KEY,
    sku_code        VARCHAR(50) UNIQUE,
    customer        VARCHAR(100),
    device_name     VARCHAR(100),
    osat            VARCHAR(100),
    application     VARCHAR(50),
    product_grade    VARCHAR(50),
    chip_length_mm   DECIMAL(8,2),
    chip_width_mm   DECIMAL(8,2),
    layer_count     INTEGER DEFAULT 2,
    unit_price      DECIMAL(12,4),
    remark           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Capacity Plans
CREATE TABLE if not exists capacity_plans (
    id                  SERIAL PRIMARY KEY,
    month               VARCHAR(7) UNIQUE,
    core_panel_per_day   INTEGER DEFAULT 0,
    bu_panel_per_day    INTEGER DEFAULT 0,
    remark             TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Production Parameters
CREATE TABLE if not exists production_parameters (
    id                  SERIAL PRIMARY KEY,
    param_type      VARCHAR(50),
    param_key        VARCHAR(100),
    param_value     DECIMAL(10,6),
    version         INTEGER DEFAULT 1,
    effective_from  DATE NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Calculation Results
CREATE TABLE if not exists calculation_results (
    id                  SERIAL PRIMARY KEY,
    forecast_id        INTEGER REFERENCES sales_forecasts(id),
    calculation_batch   UUID NULL,
    yield_rate        DECIMAL(5,4),
    required_input_pcs INTEGER,
    required_panel      INTEGER,
    core_consumption    INTEGER,
    bu_consumption      INTEGER,
    core_panel          INTEGER,
    bu_panel            INTEGER,
    lead_time_days      INTEGER,
    input_month         VARCHAR(7),
    output_month        VARCHAR(7),
    revenue             DECIMAL(15,2),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);