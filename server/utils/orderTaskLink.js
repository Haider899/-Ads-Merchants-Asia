function isLinkedToCancelledTask(order, cancelledTasks = []) {
  if (!order || !Array.isArray(cancelledTasks) || cancelledTasks.length === 0) return false;

  return cancelledTasks.some(task => {
    const matchesTaskId = order.task_id != null && task.id != null &&
      String(order.task_id) === String(task.id);
    const matchesOrderNumber = order.order_number != null && task.order_number != null &&
      String(order.order_number) === String(task.order_number);
    return matchesTaskId || matchesOrderNumber;
  });
}

function isOrphanedNormalProcessingOrder(order, activeTaskIds = new Set()) {
  if (!order || !order.task_id || !(activeTaskIds instanceof Set)) return false;
  const orderStatus = String(order.order_status || '').toLowerCase().trim();
  const paymentStatus = String(order.payment_status || '').toLowerCase().trim();
  return orderStatus === 'processing' && paymentStatus === 'paid' &&
    !activeTaskIds.has(String(order.task_id));
}

function keepLatestPendingRecord(records = []) {
  let keptPending = false;
  return records.filter(record => {
    const status = String((record && record.status) || '').toLowerCase().trim();
    if (status !== 'pending') return true;
    if (keptPending) return false;
    keptPending = true;
    return true;
  });
}

module.exports = {
  isLinkedToCancelledTask,
  isOrphanedNormalProcessingOrder,
  keepLatestPendingRecord
};
