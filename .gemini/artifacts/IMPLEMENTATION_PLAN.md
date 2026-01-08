# Inflow - Financial Documentation Manager
## Comprehensive Implementation Plan

---

## 📋 Project Overview

**Inflow** is a financial command center for SMEs that allows business owners to:
- Upload custom document templates (Invoice, Receipt, Delivery Note)
- Visually map data fields onto templates using a drag-and-drop "Marquee" tool
- Manage customers and products in an integrated mini-CRM
- Generate professional documents with automatic calculations
- Track all transactions in a centralized ledger
- Export to PDF, Excel/CSV, or shareable links

---

## 🏗️ Architecture Overview

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx               # Root layout with Sidebar & Header
│   ├── page.tsx                 # Dashboard
│   ├── globals.css              # Global styles & Tailwind config
│   ├── invoices/
│   │   ├── page.tsx             # Invoice list
│   │   ├── new/page.tsx         # Create invoice
│   │   └── [id]/page.tsx        # View/edit invoice
│   ├── receipts/
│   │   ├── page.tsx             # Receipt list
│   │   ├── new/page.tsx         # Create receipt
│   │   └── [id]/page.tsx        # View/edit receipt
│   ├── delivery-notes/
│   │   ├── page.tsx             # Delivery notes list
│   │   ├── new/page.tsx         # Create delivery note
│   │   └── [id]/page.tsx        # View/edit delivery note
│   ├── templates/
│   │   ├── page.tsx             # Template gallery
│   │   ├── new/page.tsx         # Upload new template
│   │   └── [id]/
│   │       ├── page.tsx         # View template
│   │       └── edit/page.tsx    # Marquee field mapping editor
│   ├── customers/
│   │   ├── page.tsx             # Customer list
│   │   └── [id]/page.tsx        # Customer details
│   ├── products/
│   │   ├── page.tsx             # Product/inventory list
│   │   └── [id]/page.tsx        # Product details
│   ├── ledger/
│   │   └── page.tsx             # Backend sheet (all transactions)
│   └── settings/
│       └── page.tsx             # App settings
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   └── Header.tsx           # Top header with search
│   │
│   ├── ui/                      # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Tabs.tsx
│   │   ├── Toast.tsx
│   │   └── EmptyState.tsx
│   │
│   ├── dashboard/
│   │   ├── StatsGrid.tsx        # Revenue, invoices, documents stats
│   │   ├── QuickActions.tsx     # Quick action buttons
│   │   ├── RecentTransactions.tsx
│   │   └── PendingTasks.tsx
│   │
│   ├── templates/
│   │   ├── TemplateCard.tsx     # Template preview card
│   │   ├── TemplateUploader.tsx # Drag-drop upload zone
│   │   ├── MarqueeEditor.tsx    # Visual field mapping canvas
│   │   ├── FieldBox.tsx         # Draggable field marker
│   │   └── FieldConfigPanel.tsx # Field property editor
│   │
│   ├── documents/
│   │   ├── DocumentForm.tsx     # Common document creation form
│   │   ├── LineItemsTable.tsx   # Product line items with calculations
│   │   ├── CustomerSelector.tsx # Customer autocomplete dropdown
│   │   ├── ProductSelector.tsx  # Product autocomplete dropdown
│   │   ├── TotalsPanel.tsx      # Subtotal, tax, discount, grand total
│   │   └── DocumentPreview.tsx  # Live preview of filled template
│   │
│   ├── customers/
│   │   ├── CustomerForm.tsx     # Add/edit customer modal
│   │   ├── CustomerTable.tsx    # Customer list table
│   │   └── CustomerCard.tsx     # Customer details card
│   │
│   ├── products/
│   │   ├── ProductForm.tsx      # Add/edit product modal
│   │   ├── ProductTable.tsx     # Product list table
│   │   └── ProductCard.tsx      # Product details card
│   │
│   └── ledger/
│       ├── LedgerTable.tsx      # All transactions table
│       ├── LedgerFilters.tsx    # Date, type, status filters
│       └── ExportButtons.tsx    # Export to Excel/CSV/PDF
│
├── lib/
│   ├── store/                   # Zustand state management
│   │   ├── index.ts             # Combined store exports
│   │   ├── templateStore.ts     # Templates state
│   │   ├── customerStore.ts     # Customers state
│   │   ├── productStore.ts      # Products state
│   │   ├── documentStore.ts     # Documents (invoices, receipts, etc.)
│   │   └── ledgerStore.ts       # Transaction ledger state
│   │
│   ├── types/                   # TypeScript interfaces
│   │   ├── template.ts
│   │   ├── customer.ts
│   │   ├── product.ts
│   │   ├── document.ts
│   │   └── ledger.ts
│   │
│   ├── utils/
│   │   ├── calculations.ts      # Line item & total calculations
│   │   ├── formatters.ts        # Currency, date formatting
│   │   ├── validators.ts        # Form validation schemas
│   │   ├── exporters.ts         # PDF, Excel, CSV export functions
│   │   └── storage.ts           # LocalStorage persistence helpers
│   │
│   └── constants/
│       ├── fieldTypes.ts        # Available field types for mapping
│       └── documentTypes.ts     # Invoice, Receipt, Delivery Note
│
└── hooks/
    ├── useDebounce.ts           # Debounced search
    ├── useLocalStorage.ts       # Persist state to localStorage
    └── useAutoSave.ts           # Auto-save documents
```

---

## 📦 Installed Dependencies

### Core Libraries
| Package | Purpose |
|---------|---------|
| `lucide-react` | Modern, clean icon set (replacing react-icons) |
| `zustand` | Lightweight state management |
| `@dnd-kit/core` | Drag and drop for Marquee tool |
| `@dnd-kit/sortable` | Sortable items for line items |
| `@dnd-kit/utilities` | DnD utilities |
| `react-hot-toast` | Toast notifications |
| `uuid` | Generate unique IDs |
| `date-fns` | Date formatting and manipulation |
| `jspdf` | PDF generation |
| `html2canvas` | Convert HTML to canvas for PDF |
| `xlsx` | Excel/CSV export |
| `file-saver` | Save files to disk |
| `clsx` | Conditional classNames |

---

## 🚀 Implementation Phases

### Phase 1: Foundation & Core UI (Week 1)
**Goal:** Establish solid base architecture and reusable components

#### 1.1 Project Setup ✅
- [x] Next.js 16 with App Router
- [x] Tailwind CSS 4
- [x] TypeScript configuration
- [x] Install all dependencies

#### 1.2 Design System & UI Components
- [ ] Create `/components/ui/` primitives
  - [ ] Button (variants: primary, secondary, ghost, danger)
  - [ ] Input (with label, error states)
  - [ ] Select (with search/autocomplete)
  - [ ] Modal (animated, accessible)
  - [ ] Table (sortable, paginated)
  - [ ] Card (with variants)
  - [ ] Badge (status indicators)
  - [ ] Dropdown (menu actions)
  - [ ] EmptyState (for empty lists)

#### 1.3 Layout Refinements
- [ ] Update branding to "Inflow"
- [ ] Add Products nav item to sidebar
- [ ] Add Ledger nav item to sidebar
- [ ] Implement dark mode toggle
- [ ] Add mobile responsive sidebar

---

### Phase 2: Data Layer & Types (Week 1-2)
**Goal:** Define data models and state management

#### 2.1 TypeScript Interfaces
```typescript
// Template
interface Template {
  id: string;
  name: string;
  type: 'invoice' | 'receipt' | 'delivery-note';
  imageUrl: string;  // Base64 or blob URL
  fields: MappedField[];
  createdAt: Date;
  updatedAt: Date;
}

interface MappedField {
  id: string;
  type: FieldType;
  label: string;
  x: number;      // Percentage position
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontColor: string;
  alignment: 'left' | 'center' | 'right';
}

// Customer
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: Date;
}

// Product
interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  unitPrice: number;
  createdAt: Date;
}

// Document (Invoice, Receipt, Delivery Note)
interface Document {
  id: string;
  type: 'invoice' | 'receipt' | 'delivery-note';
  templateId: string;
  documentNumber: string;
  customerId: string;
  date: Date;
  dueDate?: Date;
  lineItems: LineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
  createdAt: Date;
}

interface LineItem {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
```

#### 2.2 Zustand Stores
- [ ] `templateStore.ts` - CRUD for templates
- [ ] `customerStore.ts` - CRUD for customers
- [ ] `productStore.ts` - CRUD for products
- [ ] `documentStore.ts` - CRUD for all document types
- [ ] `ledgerStore.ts` - Aggregated transaction view

#### 2.3 LocalStorage Persistence
- [ ] Implement `useLocalStorage` hook
- [ ] Auto-persist all stores to localStorage
- [ ] Hydration handling for SSR

---

### Phase 3: Customer & Product Management (Week 2) ✅
**Goal:** Build mini-CRM functionality

#### 3.1 Customers Module
- [x] `/customers` - List page with search & filters
- [x] Customer CRUD modal
- [x] Customer details page (`/customers/[id]`)
- [x] Import customers from CSV
- [x] Export customers to CSV

#### 3.2 Products Module
- [x] `/products` - List page with search & filters
- [x] Product CRUD modal
- [x] Product details page (`/products/[id]`)
- [x] Import products from CSV
- [x] Export products to CSV

---

### Phase 4: Template Management & Marquee Tool (Week 2-3) ✅
**Goal:** Core differentiator - visual field mapping

#### 4.1 Template Upload
- [x] `/templates` - Gallery view of all templates
- [x] Drag-and-drop upload zone
- [x] Support PDF, PNG, JPG, SVG
- [x] PDF to image conversion (first page) - placeholder for now
- [x] Template preview cards
- [x] Grid and list view modes
- [x] Template detail page (`/templates/[id]`)

#### 4.2 Marquee Field Mapping Editor
- [x] `/templates/[id]/edit` - Full-screen editor
- [x] Canvas-based image display with zoom controls
- [x] Draw rectangles to define field areas (Draw tool)
- [x] Resize and reposition field boxes (8-point handles)
- [x] Field configuration panel:
  - [x] Field type selection (15 types)
  - [x] Label/name
  - [x] Font size, color, weight
  - [x] Text alignment (left/center/right)
- [x] Save field mappings
- [x] Preview mode with sample data
- [x] Keyboard shortcuts (Delete, Escape)
- [x] Field list panel

#### 4.3 Field Types ✅
```typescript
type FieldType =
  | 'text'           // Static text
  | 'date'           // Document date
  | 'due-date'       // Due date
  | 'document-number'// Invoice/Receipt number
  | 'customer-name'
  | 'customer-email'
  | 'customer-phone'
  | 'customer-address'
  | 'line-items'     // Product table
  | 'subtotal'
  | 'discount'
  | 'tax'
  | 'grand-total'
  | 'notes'
  | 'custom';        // User-defined
```

---

### Phase 5: Document Generation (Week 3-4) ✅
**Goal:** Create documents using templates

#### 5.1 Document Creation Flow
- [x] `/invoices/new` - New invoice form
- [x] `/receipts/new` - New receipt form
- [x] `/delivery-notes/new` - New delivery note form
- [x] Template selector
- [x] Customer autocomplete (searches as you type)
- [x] Line items table:
  - [x] Product autocomplete
  - [x] Quantity input
  - [x] Auto-calculate subtotals
- [x] Discount & tax inputs
- [x] Auto-calculate grand total
- [x] Notes field

#### 5.2 Document Preview
- [x] Live preview panel
- [x] Render template with filled data
- [x] Zoom in/out (Basic implementation)
- [x] Print preview (Button added)

#### 5.3 Document List Pages
- [x] `/invoices` - Filter by status, date, customer
- [x] `/receipts` - Filter by status, date, customer
- [x] `/delivery-notes` - Filter by status, date

#### 5.4 Document Actions
- [x] Edit draft documents
- [x] Duplicate document
- [x] **Convert:** Invoice → Receipt or Delivery Note
- [x] Mark as Paid
- [ ] Send via email (future)


---

### Phase 6: Export & Reporting (Week 4) ✅
**Goal:** Output documents and data

#### 6.1 Document Export
- [x] Export as PDF (high-resolution)
- [x] Export as PNG
- [x] Print functionality
- [ ] Generate shareable link (store in cloud - future)

#### 6.2 Ledger / Backend Sheet ✅
- [x] `/ledger` - All transactions in one table
- [x] Columns: Date, Type, Number, Customer, Amount, Status
- [x] Filters: Date range, document type, status
- [x] Search functionality

#### 6.3 Data Export ✅
- [x] Export ledger to Excel (.xlsx)
- [x] Export ledger to CSV
- [x] Export filtered results
- [x] Export customer list
- [x] Export product list

---

### Phase 7: Polish & Enhancements (Week 4+) ✅
**Goal:** Refinements and additional features

#### 7.1 UX Improvements
- [x] Keyboard shortcuts (global navigation & actions)
- [ ] Undo/redo in Marquee editor
- [ ] Auto-save drafts
- [x] Toast notifications for actions
- [x] Loading states & skeletons (Skeleton components created)
- [x] Empty states with CTAs
- [x] Date range picker for ledger
- [x] Help Centre with detailed usage guide

#### 7.2 Dashboard Enhancements ✅
- [x] Revenue chart (last 7 days)
- [x] Overdue invoices alert (in Pending Tasks)
- [x] Recent activity feed (Recent Transactions)
- [x] Quick stats from real data

#### 7.3 Settings ✅
- [x] Business profile (name, email, phone, address, website)
- [x] Business logo upload
- [x] Default tax rate
- [x] Currency selection (USD, EUR, GBP, CAD, AUD, NGN, ZAR, KES)
- [x] Invoice numbering format (prefix, padding, auto-increment)
- [x] Theme preferences (light/dark/system)

#### 7.4 Future Features (Backlog)
- [ ] Cloud storage integration (Firebase/Supabase)
- [ ] User authentication
- [ ] Email delivery
- [ ] Recurring invoices
- [ ] Payment reminders
- [ ] Multi-currency support
- [ ] API for integrations

---

## 📐 UI/UX Design Guidelines

### Color Palette
```css
/* Primary Brand */
--primary: #137fec;        /* Bright blue - CTAs, active states */
--primary-hover: #0e6bc4;
--primary-light: #e8f4fd;  /* Light blue backgrounds */

/* Semantic Colors */
--success: #10b981;        /* Green - paid, success */
--warning: #f59e0b;        /* Amber - pending, draft */
--danger: #ef4444;         /* Red - overdue, errors */

/* Neutral Palette */
--slate-50: #f8fafc;
--slate-100: #f1f5f9;
--slate-200: #e2e8f0;
--slate-300: #cbd5e1;
--slate-400: #94a3b8;
--slate-500: #64748b;
--slate-600: #475569;
--slate-700: #334155;
--slate-800: #1e293b;
--slate-900: #0f172a;
```

### Typography
- **Font Family:** Inter (already configured)
- **Headings:** 600-700 weight
- **Body:** 400-500 weight
- **Small text:** 12px-14px
- **Base text:** 14px-16px

### Component Patterns
- **Border radius:** `rounded-lg` (8px) for cards, `rounded-md` (6px) for inputs
- **Shadows:** Subtle `shadow-sm` for elevation
- **Spacing:** Use 4px grid (p-1, p-2, p-4, p-6, p-8)
- **Transitions:** `transition-all duration-200` for smooth interactions

---

## 🎯 Completed Features

1. ~~**Add Revenue Chart**~~ ✅ - Added 7-day revenue chart to dashboard
2. ~~**Business Logo Upload**~~ ✅ - Logo upload in settings with preview
3. ~~**Date Range Filter**~~ ✅ - Added date range picker to ledger
4. ~~**Skeleton Loaders**~~ ✅ - Created reusable skeleton components
5. ~~**Dark Mode**~~ ✅ - Implemented light/dark/system theme toggle
6. ~~**Keyboard Shortcuts**~~ ✅ - Global navigation and action shortcuts
7. ~~**Invoice Numbering Format**~~ ✅ - Customizable document numbering with preview
8. ~~**Help Centre**~~ ✅ - Comprehensive usage guide with all features documented

## 📋 Remaining Backlog

1. **Undo/Redo in Marquee Editor** - History management for template editing
2. **Auto-save Drafts** - Automatic draft saving while editing
3. **Cloud Storage Integration** - Firebase/Supabase for data sync
4. **User Authentication** - Login and user management
5. **Email Delivery** - Send documents via email

---

## 📝 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

---

*Last Updated: January 5, 2026*
