-- Append-only progress updates for call reports

CREATE TABLE IF NOT EXISTS call_report_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_report_id uuid NOT NULL REFERENCES call_reports(id) ON DELETE CASCADE,
  note text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('Follow Up', 'Confirmed', 'Closed', 'No Action')),
  next_action text,
  next_follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_report_updates_report_created
  ON call_report_updates(call_report_id, created_at DESC);
