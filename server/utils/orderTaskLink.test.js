const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isLinkedToCancelledTask,
  isOrphanedNormalProcessingOrder,
  keepLatestPendingRecord
} = require('./orderTaskLink');

test('matches an order linked to a cancelled task by task ID', () => {
  assert.equal(isLinkedToCancelledTask(
    { task_id: 'task-1', order_number: 'order-1' },
    [{ id: 'task-1', order_number: 'order-1' }]
  ), true);
});

test('matches an order linked to a cancelled task by order number when task ID differs', () => {
  assert.equal(isLinkedToCancelledTask(
    { task_id: 'legacy-task', order_number: 'order-1' },
    [{ id: 'task-1', order_number: 'order-1' }]
  ), true);
});

test('does not hide unrelated order records', () => {
  assert.equal(isLinkedToCancelledTask(
    { task_id: 'task-2', order_number: 'order-2' },
    [{ id: 'task-1', order_number: 'order-1' }]
  ), false);
});

test('handles absent tasks and unlinked order records', () => {
  assert.equal(isLinkedToCancelledTask({ order_number: 'order-1' }, []), false);
  assert.equal(isLinkedToCancelledTask(null, [{ id: 'task-1' }]), false);
});

test('hides a legacy orphaned normal processing order after its task was deleted', () => {
  assert.equal(isOrphanedNormalProcessingOrder(
    { task_id: 'deleted-task', order_status: 'PROCESSING', payment_status: 'PAID' },
    new Set()
  ), true);
});

test('does not hide orders that are assigned, shortfall, or still linked to an active task', () => {
  assert.equal(isOrphanedNormalProcessingOrder(
    { task_id: 'task-1', order_status: 'ASSIGNED', payment_status: 'PAID' },
    new Set()
  ), false);
  assert.equal(isOrphanedNormalProcessingOrder(
    { task_id: 'task-1', order_status: 'PROCESSING', payment_status: 'SHORTFALL' },
    new Set()
  ), false);
  assert.equal(isOrphanedNormalProcessingOrder(
    { task_id: 'task-1', order_status: 'PROCESSING', payment_status: 'PAID' },
    new Set(['task-1'])
  ), false);
});

test('shows only the newest pending record while retaining completed history', () => {
  const records = [
    { id: 'newest', status: 'pending', created_at: '2026-09-26T20:07:00Z' },
    ...Array.from({ length: 6 }, (_, index) => ({
      id: `older-${index}`,
      status: 'pending',
      created_at: `2026-09-26T20:0${index}:00Z`
    })),
    { id: 'completed-1', status: 'completed' }
  ];

  assert.deepEqual(
    keepLatestPendingRecord(records).map(record => record.id),
    ['newest', 'completed-1']
  );
});
