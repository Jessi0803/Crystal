import "dotenv/config";
import mysql from "mysql2/promise";

const APPLY_CONFIRMATION = "phase-2-2026-09-08";
const apply = process.argv.includes("--apply");
const confirmation = process.argv.find((arg) => arg.startsWith("--confirm="))?.slice("--confirm=".length);

const PAYMENT_STATUS_FIXES = [
  { id: 2040001, merchantTradeNo: "CAMQ5J4VTUW3WM" },
  { id: 2100001, merchantTradeNo: "CAMQ8QLKOIE3JB" },
];
const MERGED_STATUS_FIXES = [
  { id: 2790002, merchantTradeNo: "CAMR05K6AJP6A9", from: "processing", to: "completed" },
  { id: 4170001, merchantTradeNo: "CAMSJV0SZ5XSYB", from: "shipped", to: "completed" },
];
const SUPERSEDED_BALANCE = {
  id: 1950001,
  orderId: 4170001,
  merchantTradeNo: "CBMSRLRJJ83A8O",
};
const ORPHANED_MERGE_GROUP_IDS = [1, 2, 30001, 30003];

function connectionOptions() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const url = new URL(process.env.DATABASE_URL);
  if (!url.hostname.endsWith(".prod.aws.tidbcloud.com")) {
    throw new Error(`Refusing unexpected database host: ${url.hostname}`);
  }
  return {
    host: url.hostname,
    port: Number(url.port || 4000),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: true },
  };
}

function appendAuditNote(current, message) {
  return [current?.trim(), `[資料校正 ${new Date().toISOString()}] ${message}`]
    .filter(Boolean)
    .join("\n");
}

function assertExactRow(row, expected, label) {
  if (!row) throw new Error(`${label}: target row is missing`);
  for (const [key, value] of Object.entries(expected)) {
    if (row[key] !== value) {
      throw new Error(`${label}: expected ${key}=${value}, received ${row[key]}`);
    }
  }
}

async function readSnapshot(connection, lock = false) {
  const suffix = lock ? " FOR UPDATE" : "";
  const targetOrderIds = [
    ...PAYMENT_STATUS_FIXES.map((item) => item.id),
    ...MERGED_STATUS_FIXES.map((item) => item.id),
  ];
  const [orders] = await connection.query(
    `SELECT id, merchantTradeNo, paymentStatus, orderStatus, inventoryDeducted, adminNote
       FROM orders WHERE id IN (?)${suffix}`,
    [targetOrderIds],
  );
  const [logistics] = await connection.query(
    `SELECT orderId, logisticsStatus FROM logisticsOrders
       WHERE orderId IN (?)${suffix}`,
    [PAYMENT_STATUS_FIXES.map((item) => item.id)],
  );
  const [balances] = await connection.query(
    `SELECT id, orderId, merchantTradeNo, paymentStatus, ecpayNotifyData
       FROM orderBalancePayments WHERE id = ?${suffix}`,
    [SUPERSEDED_BALANCE.id],
  );
  const [groups] = await connection.query(
    `SELECT g.id, g.mainOrderId, m.orderId, (o.id IS NULL) AS orderMissing,
            COALESCE(o.orderStatus, '') AS orderStatus
       FROM orderMergeGroups g
       JOIN orderMergeMembers m ON m.groupId = g.id
       LEFT JOIN orders o ON o.id = m.orderId
      WHERE g.id IN (?)
      ORDER BY g.id, m.orderId${suffix}`,
    [ORPHANED_MERGE_GROUP_IDS],
  );
  return { orders, logistics, balances, groups };
}

function validateBefore(snapshot) {
  for (const target of PAYMENT_STATUS_FIXES) {
    const order = snapshot.orders.find((row) => row.id === target.id);
    assertExactRow(order, {
      id: target.id,
      merchantTradeNo: target.merchantTradeNo,
      paymentStatus: "pending",
      orderStatus: "completed",
      inventoryDeducted: 0,
    }, `payment correction ${target.id}`);
    const logistics = snapshot.logistics.find((row) => row.orderId === target.id);
    assertExactRow(logistics, { orderId: target.id, logisticsStatus: "picked_up" }, `fulfillment evidence ${target.id}`);
  }

  for (const target of MERGED_STATUS_FIXES) {
    const order = snapshot.orders.find((row) => row.id === target.id);
    assertExactRow(order, {
      id: target.id,
      merchantTradeNo: target.merchantTradeNo,
      paymentStatus: "paid",
      orderStatus: target.from,
      inventoryDeducted: 1,
    }, `merged status correction ${target.id}`);
  }

  assertExactRow(snapshot.balances[0], {
    id: SUPERSEDED_BALANCE.id,
    orderId: SUPERSEDED_BALANCE.orderId,
    merchantTradeNo: SUPERSEDED_BALANCE.merchantTradeNo,
    paymentStatus: "pending",
  }, "superseded member balance");

  const groupIds = new Set(snapshot.groups.map((row) => row.id));
  for (const groupId of ORPHANED_MERGE_GROUP_IDS) {
    if (!groupIds.has(groupId)) throw new Error(`orphaned merge group ${groupId}: expected metadata is missing`);
  }
  for (const row of snapshot.groups) {
    if (row.orderId === row.mainOrderId && row.orderMissing !== 1) {
      throw new Error(`orphaned merge group ${row.id}: main order still exists`);
    }
    if (row.orderMissing !== 1 && row.orderStatus !== "cancelled") {
      throw new Error(`orphaned merge group ${row.id}: surviving order ${row.orderId} is not cancelled`);
    }
  }
}

function publicPlan(snapshot) {
  return {
    mode: apply ? "apply" : "dry-run",
    paymentStatusCorrections: PAYMENT_STATUS_FIXES.map((target) => ({
      orderId: target.id,
      merchantTradeNo: target.merchantTradeNo,
      from: "pending",
      to: "paid",
      inventoryDeductedRemains: 0,
    })),
    mergedStatusCorrections: MERGED_STATUS_FIXES,
    supersededBalance: {
      ...SUPERSEDED_BALANCE,
      from: snapshot.balances[0]?.paymentStatus,
      to: "cancelled",
    },
    dissolvedOrphanedMergeGroups: ORPHANED_MERGE_GROUP_IDS,
    customerOrdersDeleted: 0,
  };
}

async function applyReconciliation(connection, snapshot) {
  for (const target of PAYMENT_STATUS_FIXES) {
    const current = snapshot.orders.find((row) => row.id === target.id);
    const note = appendAuditNote(
      current.adminNote,
      "訂單已完成且物流已取貨，付款狀態由 pending 校正為 paid；不追溯扣庫存。",
    );
    const [result] = await connection.query(
      `UPDATE orders SET paymentStatus = 'paid', adminNote = ?
        WHERE id = ? AND merchantTradeNo = ? AND paymentStatus = 'pending'
          AND orderStatus = 'completed' AND inventoryDeducted = 0`,
      [note, target.id, target.merchantTradeNo],
    );
    if (result.affectedRows !== 1) throw new Error(`payment correction ${target.id}: concurrent change detected`);
  }

  for (const target of MERGED_STATUS_FIXES) {
    const current = snapshot.orders.find((row) => row.id === target.id);
    const note = appendAuditNote(current.adminNote, `合併訂單狀態由 ${target.from} 同步為主單的 ${target.to}。`);
    const [result] = await connection.query(
      `UPDATE orders SET orderStatus = ?, adminNote = ?
        WHERE id = ? AND merchantTradeNo = ? AND orderStatus = ? AND paymentStatus = 'paid'`,
      [target.to, note, target.id, target.merchantTradeNo, target.from],
    );
    if (result.affectedRows !== 1) throw new Error(`merged status correction ${target.id}: concurrent change detected`);
  }

  const balanceAudit = JSON.stringify({
    source: "phase_2_data_reconciliation",
    reason: "superseded_by_paid_merged_main_balance",
    mergedMainOrderId: 4290001,
    reconciledAt: new Date().toISOString(),
  });
  const [balanceResult] = await connection.query(
    `UPDATE orderBalancePayments
        SET paymentStatus = 'cancelled', ecpayNotifyData = ?
      WHERE id = ? AND orderId = ? AND merchantTradeNo = ? AND paymentStatus = 'pending'`,
    [balanceAudit, SUPERSEDED_BALANCE.id, SUPERSEDED_BALANCE.orderId, SUPERSEDED_BALANCE.merchantTradeNo],
  );
  if (balanceResult.affectedRows !== 1) throw new Error("superseded member balance: concurrent change detected");

  await connection.query(`DELETE FROM orderMergeMembers WHERE groupId IN (?)`, [ORPHANED_MERGE_GROUP_IDS]);
  const [groupResult] = await connection.query(`DELETE FROM orderMergeGroups WHERE id IN (?)`, [ORPHANED_MERGE_GROUP_IDS]);
  if (groupResult.affectedRows !== ORPHANED_MERGE_GROUP_IDS.length) {
    throw new Error("orphaned merge metadata: concurrent change detected");
  }
}

const connection = await mysql.createConnection(connectionOptions());
try {
  const before = await readSnapshot(connection);
  validateBefore(before);
  console.log(JSON.stringify(publicPlan(before), null, 2));

  if (!apply) {
    console.log(`Dry run only. Apply with --apply --confirm=${APPLY_CONFIRMATION}`);
    process.exitCode = 0;
  } else {
    if (confirmation !== APPLY_CONFIRMATION) {
      throw new Error(`Refusing apply without --confirm=${APPLY_CONFIRMATION}`);
    }
    await connection.beginTransaction();
    try {
      const locked = await readSnapshot(connection, true);
      validateBefore(locked);
      await applyReconciliation(connection, locked);
      await connection.commit();
      console.log("Phase 2 reconciliation committed successfully.");
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
} finally {
  await connection.end();
}
