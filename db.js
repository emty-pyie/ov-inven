const sqlite3 = require('sqlite3').verbose();

// Create database connection
const dbPath = process.env.DATABASE_URL || './otaku_valley.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Create tables
db.serialize(() => {
  // Items table
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      sku TEXT,
      name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER DEFAULT 0,
      reorder_level INTEGER DEFAULT 0,
      cost_price REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      description TEXT
    )
  `);

  // Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      date TEXT,
      customer TEXT,
      ticket_number TEXT,
      billing_address TEXT,
      phone_number TEXT,
      tags TEXT,
      total REAL DEFAULT 0,
      status TEXT DEFAULT 'Pending'
    )
  `);

  // Order items table (junction table)
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT,
      item_id TEXT,
      qty INTEGER,
      sale_price REAL,
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (item_id) REFERENCES items (id)
    )
  `);

  // Insert sample data if tables are empty
  db.get("SELECT COUNT(*) as count FROM items", (err, row) => {
    if (err) {
      console.error('Error checking items count:', err.message);
    } else if (row.count === 0) {
      // Insert sample items
      const sampleItems = [
        { id: 'id1', sku: 'OV-FG-001', name: 'Naruto Figure', category: 'Figure', quantity: 50, reorder_level: 10, cost_price: 500, sale_price: 800, description: 'Collectible Naruto action figure' },
        { id: 'id2', sku: 'OV-MG-002', name: 'One Piece Manga Vol. 1', category: 'Manga', quantity: 100, reorder_level: 20, cost_price: 200, sale_price: 350, description: 'First volume of One Piece manga' },
        { id: 'id3', sku: 'OV-AP-003', name: 'Attack on Titan T-Shirt', category: 'Apparel', quantity: 30, reorder_level: 5, cost_price: 300, sale_price: 600, description: 'Cotton T-shirt with AOT design' },
        { id: 'id4', sku: 'OV-FG-004', name: 'Dragon Ball Goku Figure', category: 'Figure', quantity: 40, reorder_level: 8, cost_price: 450, sale_price: 750, description: 'Super Saiyan Goku collectible' },
        { id: 'id5', sku: 'OV-MG-005', name: 'Death Note Manga Set', category: 'Manga', quantity: 25, reorder_level: 5, cost_price: 1500, sale_price: 2500, description: 'Complete Death Note manga series' }
      ];

      const stmt = db.prepare(`
        INSERT INTO items (id, sku, name, category, quantity, reorder_level, cost_price, sale_price, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      sampleItems.forEach(item => {
        stmt.run(item.id, item.sku, item.name, item.category, item.quantity, item.reorder_level, item.cost_price, item.sale_price, item.description);
      });

      stmt.finalize();
      console.log('Sample items inserted.');
    }
  });

  // Check and insert sample orders if empty
  db.get("SELECT COUNT(*) as count FROM orders", (err, row) => {
    if (err) {
      console.error('Error checking orders count:', err.message);
    } else if (row.count === 0) {
      // Insert sample orders
      const sampleOrders = [
        { id: 'ORDABC123', date: '2023-10-01', customer: 'John Doe', total: 1150, status: 'Delivered' },
        { id: 'ORDDEF456', date: '2023-10-02', customer: 'Jane Smith', total: 350, status: 'Pending' },
        { id: 'ORDGHI789', date: '2023-10-03', customer: 'Walk-in', total: 600, status: 'Delivered' }
      ];

      const orderStmt = db.prepare(`
        INSERT INTO orders (id, date, customer, total, status)
        VALUES (?, ?, ?, ?, ?)
      `);

      const orderItemStmt = db.prepare(`
        INSERT INTO order_items (order_id, item_id, qty, sale_price)
        VALUES (?, ?, ?, ?)
      `);

      sampleOrders.forEach(order => {
        orderStmt.run(order.id, order.date, order.customer, order.total, order.status);

        // Add sample order items
        if (order.id === 'ORDABC123') {
          orderItemStmt.run(order.id, 'id1', 1, 800);
          orderItemStmt.run(order.id, 'id2', 1, 350);
        } else if (order.id === 'ORDDEF456') {
          orderItemStmt.run(order.id, 'id2', 1, 350);
        } else if (order.id === 'ORDGHI789') {
          orderItemStmt.run(order.id, 'id3', 1, 600);
        }
      });

      orderStmt.finalize();
      orderItemStmt.finalize();
      console.log('Sample orders inserted.');
    }
  });
});

module.exports = db;
