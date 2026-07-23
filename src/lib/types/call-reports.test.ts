import assert from 'node:assert/strict';
import { CallReportSchema, CallReportUpdateSchema } from './call-reports';

function runCallReportSchemaSelfCheck() {
  const valid = CallReportSchema.safeParse({
    customer_id: '550e8400-e29b-41d4-a716-446655440000',
    report_date: '2026-07-23',
    topic: 'Q3 group tour pricing',
    status: 'Follow Up',
  });
  assert.equal(valid.success, true, 'valid payload should pass');

  const missingCustomer = CallReportSchema.safeParse({
    report_date: '2026-07-23',
    topic: 'Missing customer',
  });
  assert.equal(missingCustomer.success, false, 'missing customer_id should fail');

  const missingTopic = CallReportSchema.safeParse({
    customer_id: '550e8400-e29b-41d4-a716-446655440000',
    report_date: '2026-07-23',
    topic: '',
  });
  assert.equal(missingTopic.success, false, 'empty topic should fail');

  const validUpdate = CallReportUpdateSchema.safeParse({
    note: 'Customer asked for revised quote',
    status: 'Follow Up',
  });
  assert.equal(validUpdate.success, true, 'valid update should pass');

  const missingNote = CallReportUpdateSchema.safeParse({
    note: '',
    status: 'Follow Up',
  });
  assert.equal(missingNote.success, false, 'empty update note should fail');
}

runCallReportSchemaSelfCheck();
