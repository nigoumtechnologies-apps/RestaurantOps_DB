# 🍽️ RestaurantOps Pro

**100% Free Restaurant Operations Management System**

Built with Google Sheets (database) + Google Drive (file storage) + GitHub Pages (hosting). Zero server costs, zero subscription fees.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Cost](https://img.shields.io/badge/Cost-%240-success)

---

## ✨ Features

| Module | Features |
|--------|----------|
| **📊 Dashboard** | Live sales, active orders, low stock alerts, profit tracking |
| **📝 Orders** | Digital ordering, Kanban board, status tracking, table management |
| **🍕 Menu** | Item management, categories, stock levels, pricing |
| **📦 Inventory** | Stock tracking, low stock alerts, supplier management |
| **👥 Staff** | Employee profiles, shifts, wage tracking |
| **💰 Expenses** | Expense logging, receipt uploads, category breakdown |
| **📈 Reports** | Sales charts, expense pie charts, daily summaries |
| **⚙️ Settings** | Sheet connection, currency, tax rate, data export/import |

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Create Google Sheets Database

1. Go to [Google Sheets](https://sheets.new) and create a new spreadsheet
2. Name it **"RestaurantOps_DB"**
3. Create these sheets (tabs) with exact headers:

**Sheet: Menu**
| ItemID | Name | Category | Price | Cost | Stock | Description | Available |
|--------|------|----------|-------|------|-------|-------------|-----------|
| M001 | Margherita Pizza | Main Course | 12.99 | 4.50 | 50 | Classic tomato and mozzarella | Yes |

**Sheet: Orders**
| OrderID | Table | Customer | Items | Total | Status | Timestamp |
|---------|-------|----------|-------|-------|--------|-------------|
| O001 | T5 | | M001,M003 | 21.98 | Preparing | 2026-07-18 10:00 |

**Sheet: Inventory**
| Ingredient | Qty | Unit | MinLevel | Supplier | LastRestocked |
|------------|-----|------|----------|----------|---------------|
| Flour | 50 | kg | 10 | BakerySupply Co | 2026-07-15 |

**Sheet: Staff**
| Name | Role | Phone | Email | Shift | Wage/Hr |
|------|------|-------|-------|-------|---------|
| John Doe | Chef | +1234567890 | john@restaurant.com | Morning | 25.00 |

**Sheet: Expenses**
| Date | Category | Amount | Description | ReceiptURL |
|------|----------|--------|-------------|------------|
| 2026-07-18 | Utilities | 150.00 | Electric Bill | |

4. **Get your Sheet ID**: Look at the URL `.../d/SHEET_ID/edit` — copy the SHEET_ID

### Step 2: Setup Google Apps Script Backend

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete the default `Code.gs` file
3. Create a new file and paste the entire contents of `gas-backend.js`
4. Save the project (Ctrl+S)
5. Click **Deploy → New Deployment**
6. Select type: **Web app**
7. Execute as: **Me**
8. Who has access: **Anyone**
9. Click **Deploy** and copy the Web App URL

### Step 3: Deploy to GitHub Pages

1. Create a new repository on GitHub
2. Upload these files: `index.html`, `styles.css`, `app.js`
3. Go to **Settings → Pages**
4. Source: **GitHub Actions**
5. The workflow file `.github/workflows/deploy.yml` is already included
6. Your app will be live at `https://YOURNAME.github.io/YOUR-REPO`

### Step 4: Connect Your App

1. Open your deployed app
2. Go to **Settings**
3. Enter your **Sheet ID** and **Web App URL**
4. Click **Save & Connect**
5. Click **Test Connection** to verify

---

## 📁 Project Structure

```
restaurant-ops-app/
├── index.html              # Main web app
├── styles.css              # Complete styling
├── app.js                  # Frontend logic
├── gas-backend.js          # Google Apps Script code
├── .github/
│   └── workflows/
│       └── deploy.yml      # Auto-deploy to GitHub Pages
└── README.md               # This file
```

---

## 🔧 Configuration

### Environment Variables (in app)

| Setting | Description | Default |
|---------|-------------|---------|
| Sheet ID | Google Sheet ID | Demo data |
| Web App URL | GAS deployment URL | Local mode |
| Currency | Display currency | $ |
| Tax Rate | Applied to orders | 8% |
| Restaurant Name | Display name | My Restaurant |

---

## 🌐 Offline Mode

The app works **completely offline** using browser localStorage:
- All data is cached locally
- Changes sync when connection returns
- Demo data pre-loaded for testing
- Export/Import JSON for backups

---

## 📊 Google Drive Integration

The backend automatically:
- Saves daily reports to `RestaurantOps/Daily_Reports/`
- Uploads receipt images to `RestaurantOps/Invoices/`
- Sends email alerts for low stock
- Generates automated daily summaries

---

## 🔒 Security Notes

- **Sheet must be "Anyone with link can view"** for public read access
- **Web App must be "Anyone"** for write operations
- For production: Use Google Workspace with restricted access
- Never commit real Sheet IDs to public repos

---

## 🆓 Cost Breakdown

| Service | Cost |
|---------|------|
| Google Sheets | FREE |
| Google Drive | FREE (15GB) |
| Google Apps Script | FREE |
| GitHub Pages | FREE |
| GitHub Actions | FREE (2000 min/month) |
| **Total** | **$0** |

---

## 🛠️ Customization

### Adding New Menu Categories
Edit the `<select>` in `index.html` → Menu Modal → `menuItemCategory`

### Changing Colors
Edit CSS variables in `styles.css`:
```css
:root {
  --primary: #00d4aa;    /* Main accent */
  --secondary: #4285f4;  /* Secondary */
  --danger: #f85149;       /* Alerts */
}
```

### Adding Reports
Extend `gas-backend.js` → `saveDailyReport()` function

---

## 📱 Mobile Support

The app is fully responsive:
- Collapsible sidebar on mobile
- Touch-friendly buttons
- Optimized tables with horizontal scroll
- Mobile-first Kanban board

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License — free for personal and commercial use.

---

## 💬 Support

- Open an issue on GitHub
- Check the Settings → Test Connection for diagnostics
- Review browser console for error messages

**Built with ❤️ for restaurant owners worldwide.**
