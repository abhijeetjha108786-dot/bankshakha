const bcrypt = require("bcryptjs");
const env = require("../config/env");
const User = require("../models/user.model");
const Category = require("../models/category.model");
const Product = require("../models/product.model");
const Customer = require("../models/customer.model");
const Earning = require("../models/earning.model");
const Notification = require("../models/notification.model");
const SuccessStory = require("../models/successStory.model");
const Banner = require("../models/banner.model");

async function seedInitialData() {
  const adminExists = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
    await User.create({
      name: "Super Admin",
      email: env.ADMIN_EMAIL.toLowerCase(),
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });
  }

  const categoriesCount = await Category.countDocuments();
  if (categoriesCount === 0) {
    await Category.insertMany([
      { slug: "loans", title: "Loans", icon: "cash-outline", color: "#F59E0B" },
      { slug: "credit-card", title: "Credit Card", icon: "card-outline", color: "#3B82F6" },
      { slug: "savings-ac", title: "Saving A/C", icon: "wallet-outline", color: "#10B981" },
      { slug: "demat-ac", title: "Demat A/C", icon: "trending-up-outline", color: "#8B5CF6" },
      { slug: "insurance", title: "Insurance", icon: "shield-checkmark-outline", color: "#EF4444" },
      { slug: "investments", title: "Investments", icon: "pie-chart-outline", color: "#0EA5E9" },
    ]);
  }

  const productsCount = await Product.countDocuments();
  if (productsCount === 0) {
    await Product.insertMany([
      {
        productCode: "axis-credit-card",
        categorySlug: "credit-card",
        name: "Axis Bank Credit Card",
        description: "Earn high commission on every successful card activation.",
        commission: "INR 1,500",
        logo: "card",
        benefits: ["Zero joining fee", "Airport lounge access", "Rewards on every spend"],
        howToEarn: [
          "Share the link with your customer.",
          "Customer applies through your link.",
          "Commission is credited once the card is activated.",
        ],
        terms: [
          "Customer should be new to Axis Bank.",
          "KYC completion is mandatory.",
          "Card must be activated within 30 days.",
        ],
      },
      {
        productCode: "sbi-credit-card",
        categorySlug: "credit-card",
        name: "SBI SimplySAVE Card",
        description: "Best card for shopping and daily spends.",
        commission: "INR 1,200",
        logo: "card",
        benefits: ["Reward points on groceries", "Fuel surcharge waiver", "Contactless payments"],
        howToEarn: [
          "Share link via WhatsApp or SMS.",
          "Help customer fill the application.",
          "Earn when card is dispatched.",
        ],
        terms: ["Minimum age 21 years", "Valid PAN & Aadhaar required"],
      },
      {
        productCode: "personal-loan-instant",
        categorySlug: "loans",
        name: "Instant Personal Loan",
        description: "Get loans up to INR 5 Lakhs with minimal documentation.",
        commission: "2.5% of Loan Amount",
        logo: "cash",
        benefits: ["Instant approval", "Minimal paperwork", "Flexible tenure"],
        howToEarn: [
          "Check customer eligibility.",
          "Submit application on the portal.",
          "Payout after loan disbursement.",
        ],
        terms: ["CIBIL score > 750", "Salary > INR 25k/month"],
      },
      {
        productCode: "hdfc-saving-ac",
        categorySlug: "savings-ac",
        name: "HDFC Digital Savings",
        description: "Open a savings account online in minutes.",
        commission: "INR 350",
        logo: "wallet",
        benefits: ["Zero balance account", "Free virtual debit card", "Instant account number"],
        howToEarn: [
          "Ask customer to click your link.",
          "Complete Video KYC.",
          "Earn after first deposit of INR 1,000.",
        ],
        terms: ["Aadhaar-Mobile link mandatory", "Indian residents only"],
      },
      {
        productCode: "upstox-demat",
        categorySlug: "demat-ac",
        name: "Upstox Demat Account",
        description: "Trade in stocks, IPOs, and Mutual Funds.",
        commission: "INR 500",
        logo: "trending-up",
        benefits: ["Paperless account opening", "Zero AMC for 1st year", "Advanced trading tools"],
        howToEarn: ["Share referral link.", "Customer opens account.", "Earn commission on account activation."],
        terms: ["Must have valid Aadhaar & PAN"],
      },
    ]);
  }

  const customersCount = await Customer.countDocuments();
  if (customersCount === 0) {
    await Customer.insertMany([
      { name: "Ravi Kumar", phone: "+91 98765 43210", initial: "R", city: "Delhi" },
      { name: "Snehita Patel", phone: "+91 87654 32109", initial: "S", city: "Ahmedabad" },
      { name: "Amit Singh", phone: "+91 76543 21098", initial: "A", city: "Lucknow" },
      { name: "Pooja Sharma", phone: "+91 65432 10987", initial: "P", city: "Jaipur" },
      { name: "Vikram Joshi", phone: "+91 54321 09876", initial: "V", city: "Pune" },
    ]);
  }

  const earningsCount = await Earning.countDocuments();
  if (earningsCount === 0) {
    await Earning.insertMany([
      { title: "Cash Deposit Commission", dateLabel: "08 Apr, 10:20 AM", amount: 45, type: "credit" },
      { title: "Referral Bonus", dateLabel: "07 Apr, 04:15 PM", amount: 500, type: "credit" },
      { title: "Bill Payment Cashback", dateLabel: "06 Apr, 11:00 AM", amount: 12, type: "credit" },
      { title: "Money Transfer Fee", dateLabel: "05 Apr, 09:30 AM", amount: 25, type: "credit" },
      { title: "Recharge Commission", dateLabel: "05 Apr, 08:00 AM", amount: 8, type: "credit" },
    ]);
  }

  // Do not seed default notifications to avoid confusion for new users.

  const storiesCount = await SuccessStory.countDocuments();
  if (storiesCount === 0) {
    await SuccessStory.insertMany([
      {
        name: "Ramesh Singh",
        location: "New Delhi",
        quote: "BankShakha changed my life. I earn a steady income from home now.",
        avatar: "R",
        color: "#3B82F6",
      },
      {
        name: "Priya Sharma",
        location: "Mumbai",
        quote: "The easiest way to refer and earn. Payouts are always on time!",
        avatar: "P",
        color: "#10B981",
      },
      {
        name: "Vikram Joshi",
        location: "Pune",
        quote: "Top class support and high commissions. Highly recommended.",
        avatar: "V",
        color: "#F59E0B",
      },
    ]);
  }

  const bannersCount = await Banner.countDocuments();
  if (bannersCount === 0) {
    await Banner.insertMany([
      {
        title: "Loan Offer Banner",
        imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
        sortOrder: 1,
        isActive: true,
      },
      {
        title: "Credit Card Banner",
        imageUrl: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80",
        sortOrder: 2,
        isActive: true,
      },
      {
        title: "Insurance Banner",
        imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
        sortOrder: 3,
        isActive: true,
      },
    ]);
  }
}

module.exports = { seedInitialData };
