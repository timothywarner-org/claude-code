/**
 * Legacy API Handlers - E-commerce Order System
 * WARNING: This code uses deprecated patterns and needs refactoring
 * - Callback hell throughout
 * - No async/await
 * - Mixed concerns (validation, DB, response formatting)
 * - No middleware separation
 * - Inconsistent error handling
 */

const express = require('express');
const mysql = require('mysql');
const router = express.Router();

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password123',
  database: 'ecommerce'
});

// GET /api/orders/:id - Fetch order with customer and items
router.get('/orders/:id', function(req, res) {
  var orderId = req.params.id;

  // Manual validation - should be middleware
  if (!orderId || isNaN(orderId)) {
    res.status(400).json({ error: 'Invalid order ID' });
    return;
  }

  db.query('SELECT * FROM orders WHERE id = ?', [orderId], function(err, orders) {
    if (err) {
      console.log('Database error: ' + err.message);
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (orders.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    var order = orders[0];

    db.query('SELECT * FROM customers WHERE id = ?', [order.customer_id], function(err, customers) {
      if (err) {
        console.log('Database error: ' + err.message);
        res.status(500).json({ error: 'Database error' });
        return;
      }

      var customer = customers[0] || null;

      db.query('SELECT * FROM order_items WHERE order_id = ?', [orderId], function(err, items) {
        if (err) {
          console.log('Database error: ' + err.message);
          res.status(500).json({ error: 'Database error' });
          return;
        }

        var productIds = items.map(function(item) { return item.product_id; });

        if (productIds.length === 0) {
          res.json({
            order: order,
            customer: customer,
            items: []
          });
          return;
        }

        db.query('SELECT * FROM products WHERE id IN (?)', [productIds], function(err, products) {
          if (err) {
            console.log('Database error: ' + err.message);
            res.status(500).json({ error: 'Database error' });
            return;
          }

          var productMap = {};
          products.forEach(function(p) {
            productMap[p.id] = p;
          });

          var enrichedItems = items.map(function(item) {
            return {
              id: item.id,
              quantity: item.quantity,
              price: item.price,
              product: productMap[item.product_id] || null
            };
          });

          res.json({
            order: order,
            customer: customer,
            items: enrichedItems
          });
        });
      });
    });
  });
});

// POST /api/orders - Create new order
router.post('/orders', function(req, res) {
  var body = req.body;

  // Inline validation - should be separate
  if (!body.customer_id) {
    res.status(400).json({ error: 'customer_id is required' });
    return;
  }
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    res.status(400).json({ error: 'items array is required' });
    return;
  }

  // Check customer exists
  db.query('SELECT * FROM customers WHERE id = ?', [body.customer_id], function(err, customers) {
    if (err) {
      console.log('Database error: ' + err.message);
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (customers.length === 0) {
      res.status(400).json({ error: 'Customer not found' });
      return;
    }

    // Calculate total - business logic mixed with handler
    var total = 0;
    var validatedItems = [];
    var itemIndex = 0;

    function validateNextItem() {
      if (itemIndex >= body.items.length) {
        createOrder();
        return;
      }

      var item = body.items[itemIndex];

      db.query('SELECT * FROM products WHERE id = ?', [item.product_id], function(err, products) {
        if (err) {
          console.log('Database error: ' + err.message);
          res.status(500).json({ error: 'Database error' });
          return;
        }

        if (products.length === 0) {
          res.status(400).json({ error: 'Product ' + item.product_id + ' not found' });
          return;
        }

        var product = products[0];
        var itemTotal = product.price * (item.quantity || 1);
        total += itemTotal;

        validatedItems.push({
          product_id: item.product_id,
          quantity: item.quantity || 1,
          price: product.price
        });

        itemIndex++;
        validateNextItem();
      });
    }

    function createOrder() {
      var orderData = {
        customer_id: body.customer_id,
        total: total,
        status: 'pending',
        created_at: new Date()
      };

      db.query('INSERT INTO orders SET ?', orderData, function(err, result) {
        if (err) {
          console.log('Database error: ' + err.message);
          res.status(500).json({ error: 'Database error' });
          return;
        }

        var newOrderId = result.insertId;
        var insertedCount = 0;

        validatedItems.forEach(function(item) {
          item.order_id = newOrderId;

          db.query('INSERT INTO order_items SET ?', item, function(err) {
            if (err) {
              console.log('Error inserting item: ' + err.message);
            }

            insertedCount++;

            if (insertedCount === validatedItems.length) {
              res.status(201).json({
                message: 'Order created',
                order_id: newOrderId,
                total: total
              });
            }
          });
        });
      });
    }

    validateNextItem();
  });
});

module.exports = router;
