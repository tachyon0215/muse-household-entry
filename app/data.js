// Kakeibo Ledger — household data for the Maple Street household (fictional, realistic figures in USD).
// All figures live in this file; the site makes no network requests.
window.HOUSEHOLD = {
  householdName: "The Maple Street Household",
  members: ["Alex", "Jordan", "Mia (9)", "Leo (6)"],
  categories: [
    { id: "housing", label: "Housing", icon: "⌂", color: "#2563eb" },
    { id: "groceries", label: "Groceries", icon: "🛒", color: "#16a34a" },
    { id: "dining", label: "Dining out", icon: "🍽", color: "#ea580c" },
    { id: "transport", label: "Transport", icon: "🚗", color: "#7c3aed" },
    { id: "utilities", label: "Utilities", icon: "💡", color: "#ca8a04" },
    { id: "health", label: "Health", icon: "✚", color: "#dc2626" },
    { id: "kids", label: "Kids & school", icon: "✎", color: "#0891b2" },
    { id: "fun", label: "Leisure", icon: "🎬", color: "#db2777" },
    { id: "shopping", label: "Shopping", icon: "🛍", color: "#4f46e5" },
    { id: "income", label: "Income", icon: "⬆", color: "#059669" }
  ],
  budgets: { housing: 1650, groceries: 850, dining: 320, transport: 420, utilities: 310, health: 260, kids: 380, fun: 240, shopping: 300 },
  // month key -> transactions [date, description, category, amount] (negative = expense)
  months: {
    "2026-10": [
      ["2026-10-01", "Rent — Maple Street apartment", "housing", -1600],
      ["2026-10-01", "Salary — Alex (Northwind Studio)", "income", 3850],
      ["2026-10-03", "GreenMart weekly shop", "groceries", -168.40],
      ["2026-10-05", "Electric bill — City Power", "utilities", -96.20],
      ["2026-10-07", "Fuel — Route 9 petrol station", "transport", -58.00],
      ["2026-10-09", "Pharmacy — prescriptions", "health", -42.75],
      ["2026-10-10", "Salary — Jordan (part-time, library)", "income", 1240],
      ["2026-10-12", "School lunch top-up — Mia", "kids", -60.00],
      ["2026-10-14", "Cinema — family matinee", "fun", -48.00],
      ["2026-10-17", "GreenMart weekly shop", "groceries", -172.15],
      ["2026-10-19", "Internet — Fibreline 300", "utilities", -54.99],
      ["2026-10-21", "Dinner — Sakura Ramen", "dining", -64.30],
      ["2026-10-24", "Winter shoes — Leo", "shopping", -54.99],
      ["2026-10-26", "Water bill — City Water", "utilities", -38.60],
      ["2026-10-28", "Bus passes — monthly x2", "transport", -110.00],
      ["2026-10-30", "Groceries — farmers market", "groceries", -88.25]
    ],
    "2026-11": [
      ["2026-11-01", "Rent — Maple Street apartment", "housing", -1600],
      ["2026-11-01", "Salary — Alex (Northwind Studio)", "income", 3850],
      ["2026-11-02", "GreenMart weekly shop", "groceries", -181.20],
      ["2026-11-03", "Home insurance — monthly", "housing", -48.50],
      ["2026-11-04", "Electric bill — City Power", "utilities", -104.80],
      ["2026-11-05", "Dentist — Jordan check-up", "health", -120.00],
      ["2026-11-06", "Fuel — Route 9 petrol station", "transport", -61.50],
      ["2026-11-07", "Birthday dinner — Nonna's Table", "dining", -92.40],
      ["2026-11-08", "Groceries — GreenMart", "groceries", -156.75],
      ["2026-11-09", "Piano lesson — Mia (Nov)", "kids", -140.00],
      ["2026-11-10", "Salary — Jordan (part-time, library)", "income", 1240],
      ["2026-11-11", "Streaming — Filmhouse family plan", "fun", -17.99],
      ["2026-11-12", "Car service — oil & brakes", "transport", -189.00],
      ["2026-11-13", "Pharmacy — prescriptions", "health", -38.60],
      ["2026-11-14", "Groceries — GreenMart", "groceries", -169.30],
      ["2026-11-15", "Soccer boots — Leo", "kids", -64.95],
      ["2026-11-16", "Coffee & pastries — Daily Grind", "dining", -23.60],
      ["2026-11-17", "Internet — Fibreline 300", "utilities", -54.99],
      ["2026-11-18", "Books — school book fair", "kids", -41.20],
      ["2026-11-19", "Groceries — farmers market", "groceries", -92.45],
      ["2026-11-20", "Museum tickets — family day", "fun", -56.00],
      ["2026-11-21", "Winter coats — Mia & Leo", "shopping", -138.50],
      ["2026-11-22", "Takeaway pizza night", "dining", -38.75],
      ["2026-11-23", "Water bill — City Water", "utilities", -41.35],
      ["2026-11-24", "Bus passes — monthly x2", "transport", -110.00],
      ["2026-11-25", "Groceries — GreenMart", "groceries", -174.10],
      ["2026-11-25", "Freelance payout — Alex (logo job)", "income", 450],
      ["2026-11-26", "Gift — grandma's birthday", "shopping", -45.00]
    ]
  },
  bills: [
    { name: "Rent — Maple Street apartment", amount: 1600, due: "1st", paidNov: true },
    { name: "Electric — City Power", amount: 104.80, due: "4th", paidNov: true },
    { name: "Internet — Fibreline 300", amount: 54.99, due: "17th", paidNov: true },
    { name: "Water — City Water", amount: 41.35, due: "23rd", paidNov: true },
    { name: "Home insurance", amount: 48.50, due: "3rd", paidNov: true },
    { name: "Streaming — Filmhouse", amount: 17.99, due: "11th", paidNov: true },
    { name: "Mobile phones x2", amount: 68.00, due: "28th", paidNov: false },
    { name: "Piano lessons — Mia", amount: 140.00, due: "9th", paidNov: true }
  ],
  goals: [
    { id: "g1", name: "Emergency fund", target: 10000, saved: 7350, note: "Six months of essentials cover" },
    { id: "g2", name: "Spring trip to the coast", target: 2400, saved: 1560, note: "Train + 4 nights, April 2027" },
    { id: "g3", name: "New washing machine", target: 900, saved: 615, note: "Current one is 11 years old" },
    { id: "g4", name: "Kids' education fund", target: 5000, saved: 1980, note: "$165/month standing order" }
  ]
};
