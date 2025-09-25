#!/usr/bin/env node
// scripts/roleDashboards.js
require('dotenv').config();
const mongoose = require('mongoose');

// Imports aligned with your seed.js
const { connectDB, disconnectDB } = require('../config');
const { logger } = require('../utils/logger');

const {
  User,
  Customer,
  Plan,
  AddOn,
  Subscription,
  Order,
  Commission,
} = require('../models');

const {
  ORDER_STATUS,
  SUB_STATUS,
  PLAN_CYCLE, // used to estimate MRR
} = require('../utils/enums');

// ---------- CLI ----------
const argv = require('yargs/yargs')(process.argv.slice(2))
  .usage(
    'Usage: $0 --role <admin|manager|salesperson> [--user <ObjectId>] [--since YYYY-MM-DD]'
  )
  .option('role', {
    type: 'string',
    choices: ['admin', 'manager', 'salesperson'],
    demandOption: true,
  })
  .option('user', {
    type: 'string',
    describe: 'Manager/Salesperson _id for scoped dashboards',
  })
  .option('since', {
    type: 'string',
    describe: 'Metrics window start (ISO). Default: last 90 days',
  })
  .help().argv;

const since = argv.since
  ? new Date(argv.since)
  : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

// ---------- helpers ----------
const oid = (v) => (typeof v === 'string' ? new mongoose.Types.ObjectId(v) : v);
const pretty = (label, data) => {
  // use logger to match your style
  logger.info(`\n====== ${label} ======`);
  logger.info(JSON.stringify(data, null, 2));
};

// Estimate MRR for a subscription by looking up its plan price and cycle
async function computeMrrForSubs(matchStage) {
  return Subscription.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'plans',
        localField: 'planId',
        foreignField: '_id',
        as: 'plan',
      },
    },
    { $unwind: '$plan' },
    {
      $addFields: {
        mrr: {
          $switch: {
            branches: [
              {
                case: { $eq: ['$plan.billingCycle', PLAN_CYCLE.MONTHLY] },
                then: '$plan.price',
              },
              {
                case: { $eq: ['$plan.billingCycle', PLAN_CYCLE.YEARLY] },
                then: { $divide: ['$plan.price', 12] },
              },
            ],
            default: '$plan.price',
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        activeSubs: { $sum: 1 },
        mrr: { $sum: '$mrr' },
      },
    },
    { $project: { _id: 0 } },
  ]);
}

// ---------- ADMIN ----------
async function adminDashboard() {
  const [
    usersByRole,
    plans,
    addons,
    revenueLast90d,
    mrrStats,
    topSalespeople,
    customersByRep,
  ] = await Promise.all([
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $project: { role: '$_id', count: 1, _id: 0 } },
      { $sort: { role: 1 } },
    ]),
    Plan.find({}).select('_id name price billingCycle features active').lean(),
    AddOn.find({}).select('_id name price active').lean(),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          status: { $in: [ORDER_STATUS.PAID] },
        },
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
          avgOrder: { $avg: '$total' },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
      { $project: { _id: 0 } },
    ]),
    computeMrrForSubs({
      status: { $in: [SUB_STATUS.ACTIVE, SUB_STATUS.TRIALING] },
    }),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          status: { $in: [ORDER_STATUS.PAID] },
        },
      },
      {
        $group: {
          _id: '$salespersonId',
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'rep',
        },
      },
      { $unwind: '$rep' },
      {
        $project: {
          _id: 0,
          salespersonId: '$rep._id',
          name: '$rep.name',
          email: '$rep.email',
          revenue: 1,
          orders: 1,
        },
      },
    ]),
    Customer.aggregate([
      { $group: { _id: '$salespersonId', customers: { $sum: 1 } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'rep',
        },
      },
      { $unwind: '$rep' },
      {
        $project: {
          _id: 0,
          salespersonId: '$rep._id',
          name: '$rep.name',
          email: '$rep.email',
          customers: 1,
        },
      },
      { $sort: { customers: -1 } },
    ]),
  ]);

  return {
    usersByRole,
    plans,
    addons,
    revenueLast90d: revenueLast90d[0] || {
      orders: 0,
      revenue: 0,
      avgOrder: 0,
      lastOrderAt: null,
    },
    mrr: mrrStats[0] || { activeSubs: 0, mrr: 0 },
    topSalespeople,
    customersByRep,
    windowStart: since,
  };
}

// ---------- MANAGER ----------
async function managerDashboard(managerId) {
  const mId = oid(managerId);

  // Team (salespeople reporting to this manager)
  const reps = await User.find({ role: 'SALESPERSON', managerId: mId })
    .select('_id name email createdAt')
    .lean();

  const repIds = reps.map((r) => r._id);

  const [teamCustomers, teamRevenue, teamActiveMrr, teamCommissions] =
    await Promise.all([
      Customer.find({ salespersonId: { $in: repIds } })
        .select('_id name email phone salespersonId')
        .lean(),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: since },
            status: { $in: [ORDER_STATUS.PAID] },
            salespersonId: { $in: repIds },
          },
        },
        {
          $group: {
            _id: '$salespersonId',
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
            lastOrderAt: { $max: '$createdAt' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'rep',
          },
        },
        { $unwind: '$rep' },
        {
          $project: {
            _id: 0,
            salespersonId: '$rep._id',
            name: '$rep.name',
            email: '$rep.email',
            revenue: 1,
            orders: 1,
            lastOrderAt: 1,
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      computeMrrForSubs({
        status: { $in: [SUB_STATUS.ACTIVE, SUB_STATUS.TRIALING] },
        salespersonId: { $in: repIds },
      }),
      Commission.aggregate([
        {
          $match: {
            createdAt: { $gte: since },
            salespersonId: { $in: repIds },
          },
        },
        {
          $group: {
            _id: '$salespersonId',
            total: { $sum: '$salespersonAmount' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'rep',
          },
        },
        { $unwind: '$rep' },
        {
          $project: {
            _id: 0,
            salespersonId: '$rep._id',
            name: '$rep.name',
            email: '$rep.email',
            total: 1,
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

  return {
    managerId: mId,
    reps,
    customers: teamCustomers,
    salesLast90d: teamRevenue,
    mrr: teamActiveMrr[0] || { activeSubs: 0, mrr: 0 },
    commissionsLast90d: teamCommissions,
    windowStart: since,
  };
}

// ---------- SALESPERSON ----------
async function salespersonDashboard(userId) {
  const uId = oid(userId);

  const [me, manager] = await Promise.all([
    User.findById(uId).select('_id name email role managerId').lean(),
    (async () => {
      const u = await User.findById(uId).select('managerId').lean();
      return u?.managerId
        ? User.findById(u.managerId).select('_id name email').lean()
        : null;
    })(),
  ]);

  const [myCustomers, myOrders, myCommissions, myMRR] = await Promise.all([
    Customer.find({ salespersonId: uId }).select('_id name email phone').lean(),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          status: { $in: [ORDER_STATUS.PAID] },
          salespersonId: uId,
        },
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
          avgOrder: { $avg: '$total' },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
      { $project: { _id: 0 } },
    ]),
    Commission.aggregate([
      { $match: { createdAt: { $gte: since }, salespersonId: uId } },
      { $group: { _id: null, total: { $sum: '$salespersonAmount' } } },
      { $project: { _id: 0 } },
    ]),
    computeMrrForSubs({
      status: { $in: [SUB_STATUS.ACTIVE, SUB_STATUS.TRIALING] },
      salespersonId: uId,
    }),
  ]);

  return {
    me,
    manager,
    customers: myCustomers,
    salesLast90d: myOrders[0] || {
      orders: 0,
      revenue: 0,
      avgOrder: 0,
      lastOrderAt: null,
    },
    commissionsLast90d: myCommissions[0]?.total || 0,
    mrr: myMRR[0] || { activeSubs: 0, mrr: 0 },
    windowStart: since,
  };
}

// ---------- Runner ----------
(async () => {
  await connectDB();

  try {
    if (argv.role === 'admin') {
      const out = await adminDashboard();
      pretty('ADMIN DASHBOARD', out);
    } else if (argv.role === 'manager') {
      if (!argv.user) {
        console.error(
          '❌ --user <managerId> is required for manager dashboard'
        );
        process.exitCode = 1;
      } else {
        const out = await managerDashboard(argv.user);
        pretty('MANAGER DASHBOARD', out);
      }
    } else if (argv.role === 'salesperson') {
      if (!argv.user) {
        console.error(
          '❌ --user <salespersonId> is required for salesperson dashboard'
        );
        process.exitCode = 1;
      } else {
        const out = await salespersonDashboard(argv.user);
        pretty('SALESPERSON DASHBOARD', out);
      }
    }
  } catch (err) {
    console.error('⚠️  Dashboard error:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    process.exit(process.exitCode || 0);
  }
})();
