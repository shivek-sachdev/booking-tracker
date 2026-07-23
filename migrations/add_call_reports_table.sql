-- Call reports: customer visit / contact log

CREATE TABLE IF NOT EXISTS call_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  contact_person text,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  topic text NOT NULL,
  summary text,
  customer_feedback text,
  status text NOT NULL DEFAULT 'Follow Up'
    CHECK (status IN ('Follow Up', 'Confirmed', 'Closed', 'No Action')),
  next_action text,
  next_follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_reports_customer_id ON call_reports(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_reports_report_date ON call_reports(report_date DESC);

CREATE OR REPLACE FUNCTION update_call_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_call_reports_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_call_reports_updated_at
      BEFORE UPDATE ON call_reports
      FOR EACH ROW
      EXECUTE FUNCTION update_call_reports_updated_at();
  END IF;
END $$;
