import bcrypt from "bcryptjs";
import { connectToTestDatabase } from "./test-db-helpers.mjs";

const TEST_PASSWORD = "Test123456";

const products = [
  {
    id: "e2e-bracelet-in-stock",
    name: "E2E 現貨手鍊",
    subtitle: "Playwright 測試用現貨商品",
    category: "healing",
    categoryLabel: "療癒系列",
    categories: ["healing", "love"],
    categoryLabels: ["療癒系列", "愛情桃花"],
    price: 1200,
    originalPrice: 1500,
    image: "/images/d-design/d001.jpg",
    tags: ["測試", "現貨"],
    description: "測試用現貨手鍊。",
    story: "此商品只供 E2E 測試使用。",
    benefits: ["穩定情緒", "提升自信"],
    suitableFor: ["Playwright 測試"],
    howToUse: ["手圍可選 12-19 公分", "標準為彈力繩版本；若改龍蝦扣或磁扣需加收 200 元"],
    disclaimer: "測試商品，非正式販售。",
    crystalType: "白水晶｜月光石",
    color: "白色",
    featured: true,
    active: true,
    isMonthlyLimited: false,
    sortOrder: 10,
    stock: 8,
    allowPreorder: false,
    preorderNote: null,
  },
  {
    id: "e2e-bracelet-preorder",
    name: "E2E 預購手鍊",
    subtitle: "Playwright 測試用預購商品",
    category: "wealth",
    categoryLabel: "財運事業",
    categories: ["wealth"],
    categoryLabels: ["財運事業"],
    price: 1680,
    originalPrice: null,
    image: "/images/d-design/d002.jpg",
    tags: ["測試", "預購"],
    description: "測試用預購手鍊。",
    story: "此商品只供 E2E 測試使用。",
    benefits: ["招財聚能", "提升行動力"],
    suitableFor: ["Playwright 測試"],
    howToUse: ["手圍可選 12-19 公分", "標準為彈力繩版本；若改龍蝦扣或磁扣需加收 200 元"],
    disclaimer: "測試商品，非正式販售。",
    crystalType: "黃水晶｜太陽石",
    color: "金色",
    featured: false,
    active: true,
    isMonthlyLimited: false,
    sortOrder: 20,
    stock: 0,
    allowPreorder: true,
    preorderNote: "測試預購：預計 7-14 天出貨",
  },
  {
    id: "e2e-monthly-sold-out",
    name: "E2E 月限售完商品",
    subtitle: "Playwright 測試用每月限量售完商品",
    category: "protect",
    categoryLabel: "能量防護",
    categories: ["protect"],
    categoryLabels: ["能量防護"],
    price: 980,
    originalPrice: null,
    image: "/images/d-design/d003.jpg",
    tags: ["測試", "售完"],
    description: "測試用售完商品。",
    story: "此商品只供 E2E 測試使用。",
    benefits: ["保護氣場"],
    suitableFor: ["Playwright 測試"],
    howToUse: ["每月限量，售完不可預購"],
    disclaimer: "測試商品，非正式販售。",
    crystalType: "黑曜石",
    color: "黑色",
    featured: false,
    active: true,
    isMonthlyLimited: true,
    sortOrder: 30,
    stock: 0,
    allowPreorder: false,
    preorderNote: null,
  },
  {
    id: "custom-deposit-product",
    name: "客製化商品",
    subtitle: "客製化服務訂金下單專用",
    category: "custom",
    categoryLabel: "客製化",
    categories: ["custom"],
    categoryLabels: ["客製化"],
    price: 500,
    originalPrice: null,
    priceRange: "NT$1,200 ~ 1,800",
    image: "/images/custom3.jpg",
    tags: [],
    description: "純客製水晶手鍊服務訂金。",
    story: "",
    benefits: [],
    suitableFor: ["已決定預約純客製水晶手鍊服務的顧客"],
    howToUse: ["填寫報名表單", "支付訂金", "加入官方 LINE 等待設計師確認"],
    disclaimer: "此商品為客製化服務訂金，實際尾款金額由老闆確認後另行通知。",
    crystalType: "客製化需求",
    color: "訂金",
    featured: false,
    active: true,
    isMonthlyLimited: false,
    sortOrder: 100,
    stock: -1,
    allowPreorder: false,
    preorderNote: null,
  },
  {
    id: "tarot-crystal-deposit-product",
    name: "塔羅 × 水晶手鍊客製化商品",
    subtitle: "塔羅 × 水晶手鍊客製化服務訂金下單專用",
    category: "custom",
    categoryLabel: "客製化",
    categories: ["custom"],
    categoryLabels: ["客製化"],
    price: 1399,
    originalPrice: null,
    priceRange: "手鍊 NT$1,200 ~ 1,800｜塔羅依價目表 9 折",
    image: "/images/custom-tarot2.jpg",
    tags: ["塔羅"],
    description: "塔羅 × 水晶手鍊客製化服務訂金。",
    story: "",
    benefits: [],
    suitableFor: ["已決定預約塔羅 × 水晶手鍊客製化服務的顧客"],
    howToUse: ["填寫報名表單", "支付訂金", "加入官方 LINE 等待設計師確認"],
    disclaimer: "此商品為客製化服務訂金，實際尾款金額由老闆確認後另行通知。",
    crystalType: "塔羅解析｜客製化需求",
    color: "訂金",
    featured: false,
    active: true,
    isMonthlyLimited: false,
    sortOrder: 110,
    stock: -1,
    allowPreorder: false,
    preorderNote: null,
  },
  {
    id: "chakra-crystal-deposit-product",
    name: "脈輪檢測 × 水晶手鍊客製化商品",
    subtitle: "脈輪檢測 × 水晶手鍊客製化服務訂金下單專用",
    category: "custom",
    categoryLabel: "客製化",
    categories: ["custom"],
    categoryLabels: ["客製化"],
    price: 1000,
    originalPrice: null,
    priceRange: "手鍊 NT$1,200 ~ 1,800｜脈輪檢測 NT$500",
    image: "/images/custom-chakra2.jpg",
    tags: ["脈輪"],
    description: "脈輪檢測 × 水晶手鍊客製化服務訂金。",
    story: "",
    benefits: [],
    suitableFor: ["已決定預約脈輪檢測 × 水晶手鍊客製化服務的顧客"],
    howToUse: ["填寫報名表單", "支付訂金", "加入官方 LINE 等待設計師確認"],
    disclaimer: "此商品為客製化服務訂金，實際尾款金額由老闆確認後另行通知。",
    crystalType: "脈輪檢測｜客製化需求",
    color: "訂金",
    featured: false,
    active: true,
    isMonthlyLimited: false,
    sortOrder: 120,
    stock: -1,
    allowPreorder: false,
    preorderNote: null,
  },
  {
    id: "numerology-crystal-deposit-product",
    name: "生命靈數 × 水晶手鍊客製化商品",
    subtitle: "生命靈數 × 水晶手鍊客製化服務訂金下單專用",
    category: "custom",
    categoryLabel: "客製化",
    categories: ["custom"],
    categoryLabels: ["客製化"],
    price: 1000,
    originalPrice: null,
    priceRange: "手鍊 NT$1,200 ~ 1,800｜生命靈數解析 NT$500",
    image: "/images/custom-numerology3.jpg",
    tags: ["生命靈數"],
    description: "生命靈數 × 水晶手鍊客製化服務訂金。",
    story: "",
    benefits: [],
    suitableFor: ["已決定預約生命靈數 × 水晶手鍊客製化服務的顧客"],
    howToUse: ["填寫報名表單", "支付訂金", "加入官方 LINE 等待設計師確認"],
    disclaimer: "此商品為客製化服務訂金，實際尾款金額由老闆確認後另行通知。",
    crystalType: "生命靈數｜客製化需求",
    color: "訂金",
    featured: false,
    active: true,
    isMonthlyLimited: false,
    sortOrder: 130,
    stock: -1,
    allowPreorder: false,
    preorderNote: null,
  },
];

const users = [
  {
    openId: "e2e-admin-openid",
    name: "E2E Admin",
    email: "e2e-admin@example.com",
    role: "admin",
  },
  {
    openId: "e2e-user-openid",
    name: "E2E User",
    email: "e2e-user@example.com",
    role: "user",
  },
];

function json(value) {
  return JSON.stringify(value ?? []);
}

const { connection, config } = await connectToTestDatabase();

try {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  for (const user of users) {
    await connection.execute(
      `INSERT INTO users
        (openId, name, email, passwordHash, emailVerified, loginMethod, role, lastSignedIn)
       VALUES (?, ?, ?, ?, true, 'email', ?, NOW())
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        passwordHash = VALUES(passwordHash),
        emailVerified = VALUES(emailVerified),
        loginMethod = VALUES(loginMethod),
        role = VALUES(role),
        lastSignedIn = NOW()`,
      [user.openId, user.name, user.email, passwordHash, user.role]
    );
  }

  for (const product of products) {
    await connection.execute(
      `INSERT INTO products
        (id, name, subtitle, category, categoryLabel, categories, categoryLabels, price, originalPrice,
         priceRange, depositRange, image, tags, description, story, benefits, suitableFor, howToUse,
         disclaimer, crystalType, color, featured, active, isMonthlyLimited, scheduledPublishAt, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        subtitle = VALUES(subtitle),
        category = VALUES(category),
        categoryLabel = VALUES(categoryLabel),
        categories = VALUES(categories),
        categoryLabels = VALUES(categoryLabels),
        price = VALUES(price),
        originalPrice = VALUES(originalPrice),
        priceRange = VALUES(priceRange),
        depositRange = VALUES(depositRange),
        image = VALUES(image),
        tags = VALUES(tags),
        description = VALUES(description),
        story = VALUES(story),
        benefits = VALUES(benefits),
        suitableFor = VALUES(suitableFor),
        howToUse = VALUES(howToUse),
        disclaimer = VALUES(disclaimer),
        crystalType = VALUES(crystalType),
        color = VALUES(color),
        featured = VALUES(featured),
        active = VALUES(active),
        isMonthlyLimited = VALUES(isMonthlyLimited),
        scheduledPublishAt = NULL,
        sortOrder = VALUES(sortOrder)`,
      [
        product.id,
        product.name,
        product.subtitle,
        product.category,
        product.categoryLabel,
        json(product.categories),
        json(product.categoryLabels),
        product.price,
        product.originalPrice,
        product.priceRange ?? null,
        product.depositRange ?? null,
        product.image,
        json(product.tags),
        product.description,
        product.story,
        json(product.benefits),
        json(product.suitableFor),
        json(product.howToUse),
        product.disclaimer,
        product.crystalType,
        product.color,
        product.featured,
        product.active,
        product.isMonthlyLimited,
        product.sortOrder,
      ]
    );

    await connection.execute(
      `INSERT INTO productInventory
        (productId, productName, stock, allowPreorder, preorderNote)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        productName = VALUES(productName),
        stock = VALUES(stock),
        allowPreorder = VALUES(allowPreorder),
        preorderNote = VALUES(preorderNote)`,
      [
        product.id,
        product.name,
        product.stock,
        product.allowPreorder,
        product.preorderNote,
      ]
    );
  }

  await connection.execute(
    `DELETE FROM chatbotLogs WHERE sessionId = 'e2e-seed-session'`
  );

  await connection.execute(
    `INSERT INTO chatbotLogs
      (sessionId, customerName, customerEmail, customerQuestion, botReply, relatedProducts, retrievedQuestions, pagePath)
     VALUES
      ('e2e-seed-session', 'E2E User', 'e2e-user@example.com', '我想提升自信，推薦哪款？',
       '可以先參考 E2E 現貨手鍊。', ?, ?, '/products')`,
    [json([{ id: "e2e-bracelet-in-stock", name: "E2E 現貨手鍊" }]), json(["測試知識庫"])]
  );

  console.log(`Seeded test database "${config.database}".`);
  console.log(`Admin: e2e-admin@example.com / ${TEST_PASSWORD}`);
  console.log(`User: e2e-user@example.com / ${TEST_PASSWORD}`);
  console.log(`Products: ${products.length}`);
} finally {
  await connection.end();
}
