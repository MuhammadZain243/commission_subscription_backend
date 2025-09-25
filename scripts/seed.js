// seed.js
require('dotenv').config();
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
  PLAN_CYCLE,
  ORDER_STATUS,
  SUB_STATUS,
  ORDER_LINE_KIND,
  COMMISSION_STATUS,
} = require('../utils/enums');

async function main() {
  await connectDB();

  // Danger: clear existing data (dev only)
  await Promise.all([
    User.deleteMany({}),
    Customer.deleteMany({}),
    Plan.deleteMany({}),
    AddOn.deleteMany({}),
    Subscription.deleteMany({}),
    Order.deleteMany({}),
    Commission.deleteMany({}),
  ]);
  logger.info('Cleared existing collections');

  // ---- USERS (Admin, Manager, Salespeople) ----
  const admin = await User.create({
    role: 'ADMIN',
    email: 'admin@example.com',
    password: 'admin123', // will be hashed by pre-save hook
    name: 'Admin User',
    isActive: true,
  });

  const manager = await User.create({
    role: 'MANAGER',
    email: 'manager@example.com',
    password: 'manager123',
    name: 'Manager One',
    isActive: true,
  });

  const sp1 = await User.create({
    role: 'SALESPERSON',
    email: 'rep1@example.com',
    password: 'rep12345',
    name: 'Rep Alpha',
    managerId: manager._id,
    isActive: true,
  });

  const sp2 = await User.create({
    role: 'SALESPERSON',
    email: 'rep2@example.com',
    password: 'rep12345',
    name: 'Rep Beta',
    managerId: manager._id,
    isActive: true,
  });

  // ---- CUSTOMERS ----
  const custA = await Customer.create({
    name: 'Acme Industries',
    email: 'ops@acme.test',
    phone: '+1-555-0100',
    salespersonId: sp1._id,
    isActive: true,
  });

  const custB = await Customer.create({
    name: 'Beta Consulting',
    email: 'it@beta.test',
    phone: '+1-555-0200',
    salespersonId: sp2._id,
    isActive: true,
  });

  // ---- PLANS (features embedded) ----
  const basicMonthly = await Plan.create({
    name: 'Basic',
    description: 'Starter plan for small teams',
    billingCycle: PLAN_CYCLE.MONTHLY,
    price: 49,
    features: ['Users', 'Storage', 'Support'],
    active: true,
  });

  const proYearly = await Plan.create({
    name: 'Pro',
    description: 'Advanced plan for growing orgs',
    billingCycle: PLAN_CYCLE.YEARLY,
    price: 499,
    features: ['Users', 'Storage', 'Support', 'SSO'],
    active: true,
  });

  // ---- ADD-ONS (one-off) ----
  const addonStorage = await AddOn.create({
    name: 'Extra Storage 100GB',
    description: 'One-time storage top-up',
    price: 20,
    active: true,
  });

  const addonTraining = await AddOn.create({
    name: 'Onboarding Training',
    description: 'One-time remote training session',
    price: 199,
    active: true,
  });

  // ---- SUBSCRIPTION for custA on Basic (MONTHLY) ----
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);

  const subA = await Subscription.create({
    customerId: custA._id,
    salespersonId: sp1._id,
    planId: basicMonthly._id,
    status: SUB_STATUS.ACTIVE,
    startDate: today,
    nextBillingDate: nextMonth,
  });

  // ---- ORDER: Initial PLAN invoice for subA (mark PAID) ----
  const orderPlanA = await Order.create({
    customerId: custA._id,
    salespersonId: sp1._id,
    subscriptionId: subA._id,
    lines: [
      {
        kind: ORDER_LINE_KIND.PLAN,
        refId: basicMonthly._id,
        description: `Initial ${basicMonthly.name} subscription`,
        unitPrice: basicMonthly.price,
        qty: 1,
      },
    ],
    total: basicMonthly.price,
    status: ORDER_STATUS.PAID,
    paidAt: new Date(),
  });

  // ---- COMMISSION for orderPlanA (e.g., 10%) ----
  const spRate = 0.1;
  const commPlanA = await Commission.create({
    orderId: orderPlanA._id,
    salespersonId: sp1._id,
    baseAmount: orderPlanA.total,
    salespersonRate: spRate,
    salespersonAmount: +(orderPlanA.total * spRate).toFixed(2),
    status: COMMISSION_STATUS.PENDING,
  });

  // ---- ORDER: One-off ADDON purchase for custB (mark PAID) ----
  const addonQty = 2;
  const addonSubtotal = addonTraining.price * addonQty;

  const orderAddonB = await Order.create({
    customerId: custB._id,
    salespersonId: sp2._id,
    lines: [
      {
        kind: ORDER_LINE_KIND.ADDON,
        refId: addonTraining._id,
        description: `${addonTraining.name}`,
        unitPrice: addonTraining.price,
        qty: addonQty,
      },
    ],
    total: addonSubtotal,
    status: ORDER_STATUS.PAID,
    paidAt: new Date(),
  });

  const commAddonB = await Commission.create({
    orderId: orderAddonB._id,
    salespersonId: sp2._id,
    baseAmount: orderAddonB.total,
    salespersonRate: spRate,
    salespersonAmount: +(orderAddonB.total * spRate).toFixed(2),
    status: COMMISSION_STATUS.PENDING,
  });

  logger.info('\nSeed complete ✅\n');
  logger.info('Logins (plain → will be hashed on save):');
  logger.info([
    { role: 'ADMIN', email: admin.email, password: 'admin123' },
    { role: 'MANAGER', email: manager.email, password: 'manager123' },
    { role: 'SALESPERSON', email: sp1.email, password: 'rep12345' },
    { role: 'SALESPERSON', email: sp2.email, password: 'rep12345' },
  ]);

  logger.info('\nCreated IDs:');
  logger.info({
    admin: admin._id.toString(),
    manager: manager._id.toString(),
    sp1: sp1._id.toString(),
    sp2: sp2._id.toString(),
    custA: custA._id.toString(),
    custB: custB._id.toString(),
    basicMonthly: basicMonthly._id.toString(),
    proYearly: proYearly._id.toString(),
    addonStorage: addonStorage._id.toString(),
    addonTraining: addonTraining._id.toString(),
    subA: subA._id.toString(),
    orderPlanA: orderPlanA._id.toString(),
    commPlanA: commPlanA._id.toString(),
    orderAddonB: orderAddonB._id.toString(),
    commAddonB: commAddonB._id.toString(),
  });

  await disconnectDB();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Seed failed ❌', err);
  try {
    await disconnectDB();
  } catch {}
  process.exit(1);
});
