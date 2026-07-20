# Northwind Database — Complete Schema Reference

This document is the single source of truth for the AI SQL generation engine.
**The AI must ONLY use tables and columns listed here. Inventing columns or tables is strictly forbidden.**

> **CRITICAL**: The table `Order Details` contains a space. Always wrap it in double quotes: `"Order Details"`.

---

## Tables

### Categories
| Column | Type | Constraint |
|--------|------|------------|
| CategoryID | INTEGER | PRIMARY KEY |
| CategoryName | TEXT | |
| Description | TEXT | |

### Customers
| Column | Type | Constraint |
|--------|------|------------|
| CustomerID | TEXT | PRIMARY KEY |
| CompanyName | TEXT | |
| ContactName | TEXT | |
| ContactTitle | TEXT | |
| Address | TEXT | |
| City | TEXT | |
| Region | TEXT | |
| PostalCode | TEXT | |
| Country | TEXT | |
| Phone | TEXT | |
| Fax | TEXT | |

### Employees
| Column | Type | Constraint |
|--------|------|------------|
| EmployeeID | INTEGER | PRIMARY KEY |
| LastName | TEXT | |
| FirstName | TEXT | |
| Title | TEXT | |
| TitleOfCourtesy | TEXT | |
| BirthDate | DATE | |
| HireDate | DATE | |
| Address | TEXT | |
| City | TEXT | |
| Region | TEXT | |
| PostalCode | TEXT | |
| Country | TEXT | |
| HomePhone | TEXT | |
| Extension | TEXT | |
| Notes | TEXT | |
| ReportsTo | INTEGER | FK → Employees.EmployeeID |

### Suppliers
| Column | Type | Constraint |
|--------|------|------------|
| SupplierID | INTEGER | PRIMARY KEY |
| CompanyName | TEXT | |
| ContactName | TEXT | |
| ContactTitle | TEXT | |
| Address | TEXT | |
| City | TEXT | |
| Region | TEXT | |
| PostalCode | TEXT | |
| Country | TEXT | |
| Phone | TEXT | |
| Fax | TEXT | |
| HomePage | TEXT | |

### Shippers
| Column | Type | Constraint |
|--------|------|------------|
| ShipperID | INTEGER | PRIMARY KEY |
| CompanyName | TEXT | |
| Phone | TEXT | |

### Products
| Column | Type | Constraint |
|--------|------|------------|
| ProductID | INTEGER | PRIMARY KEY |
| ProductName | TEXT | |
| SupplierID | INTEGER | FK → Suppliers.SupplierID |
| CategoryID | INTEGER | FK → Categories.CategoryID |
| QuantityPerUnit | TEXT | |
| UnitPrice | NUMERIC | |
| UnitsInStock | INTEGER | |
| UnitsOnOrder | INTEGER | |
| ReorderLevel | INTEGER | |
| Discontinued | TEXT | "0" or "1" |

### Orders
| Column | Type | Constraint |
|--------|------|------------|
| OrderID | INTEGER | PRIMARY KEY |
| CustomerID | TEXT | FK → Customers.CustomerID |
| EmployeeID | INTEGER | FK → Employees.EmployeeID |
| OrderDate | DATETIME | |
| RequiredDate | DATETIME | |
| ShippedDate | DATETIME | |
| ShipVia | INTEGER | FK → Shippers.ShipperID |
| Freight | NUMERIC | |
| ShipName | TEXT | |
| ShipAddress | TEXT | |
| ShipCity | TEXT | |
| ShipRegion | TEXT | |
| ShipPostalCode | TEXT | |
| ShipCountry | TEXT | |

### "Order Details"
> ⚠️ This table name contains a space. Always use `"Order Details"` in SQL.

| Column | Type | Constraint |
|--------|------|------------|
| OrderID | INTEGER | PK, FK → Orders.OrderID |
| ProductID | INTEGER | PK, FK → Products.ProductID |
| UnitPrice | NUMERIC | |
| Quantity | INTEGER | |
| Discount | REAL | |

---

## Key Relationships
- `Orders.CustomerID` → `Customers.CustomerID`
- `Orders.EmployeeID` → `Employees.EmployeeID`
- `Orders.ShipVia` → `Shippers.ShipperID`
- `"Order Details".OrderID` → `Orders.OrderID`
- `"Order Details".ProductID` → `Products.ProductID`
- `Products.CategoryID` → `Categories.CategoryID`
- `Products.SupplierID` → `Suppliers.SupplierID`
- `Employees.ReportsTo` → `Employees.EmployeeID`

---

## Revenue Calculation
Revenue is calculated from `"Order Details"`:
```sql
SUM("Order Details".UnitPrice * "Order Details".Quantity * (1.0 - "Order Details".Discount))
```

---

## Frontend Response Contract

Your output is consumed by a React frontend with 4 visualization components. You MUST produce output that matches the contract below exactly.

### UI Directives (choose exactly one)
| Directive | When to Use | Required Config |
|-----------|-------------|-----------------|
| `TEMPORAL_SERIES` | Time-based trends: revenue over months, orders over time, growth trends | `xAxis` (time field), `yAxis` (numeric metric field) |
| `CATEGORICAL_ASSERTION` | Grouped/ranked comparisons: sales by category, top customers, revenue by country | `xAxis` (category field), `yAxis` (numeric metric field) |
| `RELATIONAL_TABLE` | Granular record lookups: list of orders, customer details, product inventory | No required config (columns derived from data keys) |
| `METRIC_CARD` | Single aggregate values: total revenue, count of customers, average order value | `metricLabel` (human name for the KPI) |

### Response Fields
You must produce ALL of the following fields:

- **`sql_query`** (string): A valid, read-only SQLite SELECT statement. No markdown, no backticks, just raw SQL.
- **`ui_directive`** (string): Exactly one of `TEMPORAL_SERIES`, `CATEGORICAL_ASSERTION`, `RELATIONAL_TABLE`, `METRIC_CARD`.
- **`config`** (object): Axis configuration for the frontend chart renderer.
  - `xAxis` (string | null): The key name in each data row to use as the horizontal/category axis.
  - `yAxis` (string | null): The key name in each data row to use as the value/metric axis.
  - `title` (string): A short, human-readable title for the visualization.
  - `metricLabel` (string | null): A human-readable label for KPI/metric cards.
- **`message`** (string): A conversational, plain-English summary of what the data shows — written for a non-technical person.

### Critical Config Rules
1. `config.xAxis` and `config.yAxis` MUST exactly match column alias names in your SQL query's SELECT clause.
2. For `TEMPORAL_SERIES` and `CATEGORICAL_ASSERTION`, both `xAxis` and `yAxis` are REQUIRED or the chart will not render.
3. For `METRIC_CARD`, set `metricLabel` to a human-readable name and use `yAxis` pointing to the value key.
4. For `RELATIONAL_TABLE`, `xAxis` and `yAxis` are optional. The table auto-derives columns from data keys.
5. Always use lowercase_snake_case for SQL column aliases so they match the config keys.

---

## Few-Shot Examples

### TEMPORAL_SERIES Example
**User**: "Show me revenue by month"
```json
{
  "sql_query": "SELECT strftime('%Y-%m', o.OrderDate) AS month, ROUND(SUM(od.UnitPrice * od.Quantity * (1.0 - od.Discount)), 2) AS revenue FROM Orders o JOIN \"Order Details\" od ON o.OrderID = od.OrderID GROUP BY month ORDER BY month",
  "ui_directive": "TEMPORAL_SERIES",
  "config": { "xAxis": "month", "yAxis": "revenue", "title": "Monthly Revenue Trend", "metricLabel": null },
  "message": "Here is the revenue broken down by month. The data shows how your sales have trended over time."
}
```

### CATEGORICAL_ASSERTION Example
**User**: "Which categories generate the most revenue?"
```json
{
  "sql_query": "SELECT c.CategoryName AS category, ROUND(SUM(od.UnitPrice * od.Quantity * (1.0 - od.Discount)), 2) AS revenue FROM \"Order Details\" od JOIN Products p ON od.ProductID = p.ProductID JOIN Categories c ON p.CategoryID = c.CategoryID GROUP BY c.CategoryName ORDER BY revenue DESC",
  "ui_directive": "CATEGORICAL_ASSERTION",
  "config": { "xAxis": "category", "yAxis": "revenue", "title": "Revenue by Product Category", "metricLabel": null },
  "message": "Here's a breakdown of revenue by product category, ranked from highest to lowest."
}
```

### RELATIONAL_TABLE Example
**User**: "List all customers in Germany"
```json
{
  "sql_query": "SELECT CompanyName AS company_name, ContactName AS contact_name, City AS city, Phone AS phone FROM Customers WHERE Country = 'Germany' ORDER BY CompanyName",
  "ui_directive": "RELATIONAL_TABLE",
  "config": { "xAxis": null, "yAxis": null, "title": "Customers in Germany", "metricLabel": null },
  "message": "Here are all customers located in Germany, sorted alphabetically by company name."
}
```

### METRIC_CARD Example
**User**: "What is the total revenue?"
```json
{
  "sql_query": "SELECT ROUND(SUM(UnitPrice * Quantity * (1.0 - Discount)), 2) AS total_revenue FROM \"Order Details\"",
  "ui_directive": "METRIC_CARD",
  "config": { "xAxis": null, "yAxis": "total_revenue", "title": "Total Revenue", "metricLabel": "Total Revenue" },
  "message": "The total revenue across all orders is shown below."
}
```
