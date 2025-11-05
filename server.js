const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// For production hosting, use a persistent database path
if (process.env.NODE_ENV === 'production') {
  // Use /tmp for Render's writable directory
  const dbPath = process.env.RENDER_DISK_PATH || '/tmp/otaku_valley.db';
  process.env.DATABASE_URL = dbPath;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// API Routes

// Login endpoint (simple authentication)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin') {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Items CRUD
app.get('/api/items', (req, res) => {
  db.all('SELECT * FROM items', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/items', (req, res) => {
  const { id, sku, name, category, quantity, reorder_level, cost_price, sale_price, description } = req.body;
  db.run(`
    INSERT INTO items (id, sku, name, category, quantity, reorder_level, cost_price, sale_price, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, sku, name, category, quantity, reorder_level, cost_price, sale_price, description], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: id, message: 'Item added successfully' });
  });
});

app.put('/api/items/:id', (req, res) => {
  const { sku, name, category, quantity, reorder_level, cost_price, sale_price, description } = req.body;
  db.run(`
    UPDATE items SET sku = ?, name = ?, category = ?, quantity = ?, reorder_level = ?, cost_price = ?, sale_price = ?, description = ?
    WHERE id = ?
  `, [sku, name, category, quantity, reorder_level, cost_price, sale_price, description, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Item updated successfully' });
  });
});

app.delete('/api/items/:id', (req, res) => {
  db.run('DELETE FROM items WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Item deleted successfully' });
  });
});

// Orders CRUD
app.get('/api/orders', (req, res) => {
  db.all(`
    SELECT o.*, GROUP_CONCAT(oi.item_id || ':' || oi.qty || ':' || oi.sale_price, ';') as items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Parse items string back to array
    const orders = rows.map(row => ({
      ...row,
      items: row.items ? row.items.split(';').map(item => {
        const [item_id, qty, sale_price] = item.split(':');
        return { item_id, qty: parseInt(qty), sale_price: parseFloat(sale_price) };
      }) : []
    }));
    res.json(orders);
  });
});

app.post('/api/orders', (req, res) => {
  const { id, date, customer, ticket_number, billing_address, phone_number, tags, items, total, status } = req.body;

  // Check stock for all items first
  let stockChecks = [];
  let hasInsufficientStock = false;

  items.forEach(item => {
    db.get('SELECT quantity FROM items WHERE id = ?', [item.item_id], (err, row) => {
      if (err) {
        console.error('Error checking stock:', err);
        hasInsufficientStock = true;
        return;
      }
      if (!row || row.quantity < item.qty) {
        hasInsufficientStock = true;
        console.error('Insufficient stock for item:', item.item_id);
      }
      stockChecks.push(item.item_id);
      if (stockChecks.length === items.length) {
        if (hasInsufficientStock) {
          res.status(400).json({ error: 'Insufficient stock for one or more items' });
          return;
        }

        // Proceed with order creation
        db.run(`
          INSERT INTO orders (id, date, customer, ticket_number, billing_address, phone_number, tags, total, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, date, customer, ticket_number, billing_address, phone_number, tags, total, status], function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          // Insert order items
          const stmt = db.prepare(`
            INSERT INTO order_items (order_id, item_id, qty, sale_price)
            VALUES (?, ?, ?, ?)
          `);

          items.forEach(item => {
            stmt.run(id, item.item_id, item.qty, item.sale_price);
            // Update item quantity
            db.run('UPDATE items SET quantity = quantity - ? WHERE id = ?', [item.qty, item.item_id]);
          });

          stmt.finalize();

          res.json({ id: id, message: 'Order created successfully' });
        });
      }
    });
  });
});

app.put('/api/orders/:id', (req, res) => {
  const { date, customer, ticket_number, billing_address, phone_number, tags, total, status } = req.body;
  const updates = [];
  const values = [];
  if (date !== undefined) {
    updates.push('date = ?');
    values.push(date);
  }
  if (customer !== undefined) {
    updates.push('customer = ?');
    values.push(customer);
  }
  if (ticket_number !== undefined) {
    updates.push('ticket_number = ?');
    values.push(ticket_number);
  }
  if (billing_address !== undefined) {
    updates.push('billing_address = ?');
    values.push(billing_address);
  }
  if (phone_number !== undefined) {
    updates.push('phone_number = ?');
    values.push(phone_number);
  }
  if (tags !== undefined) {
    updates.push('tags = ?');
    values.push(tags);
  }
  if (total !== undefined) {
    updates.push('total = ?');
    values.push(total);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    values.push(status);
  }
  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }
  values.push(req.params.id);
  db.run(`
    UPDATE orders SET ${updates.join(', ')}
    WHERE id = ?
  `, values, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Order updated successfully' });
  });
});

app.delete('/api/orders/:id', (req, res) => {
  // Delete order items first
  db.run('DELETE FROM order_items WHERE order_id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Then delete order
    db.run('DELETE FROM orders WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Order deleted successfully' });
    });
  });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'OTAKU.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
