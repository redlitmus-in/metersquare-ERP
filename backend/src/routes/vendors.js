/**
 * Vendor Routes
 * Handles vendor-related API endpoints
 */

const express = require('express');
const router = express.Router();
const { AuthMiddleware } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// GET all vendors
router.get('/', async (req, res) => {
  try {
    // In development, return mock data if no Supabase
    if (process.env.NODE_ENV === 'development' && !process.env.SUPABASE_URL) {
      return res.json({
        vendors: [
          {
            id: '1',
            name: 'ABC Trading LLC',
            category: 'Electrical',
            email: 'contact@abctrading.ae',
            phone: '+971 4 123 4567',
            status: 'active'
          },
          {
            id: '2',
            name: 'XYZ Contractors',
            category: 'Civil Works',
            email: 'info@xyzcontractors.ae',
            phone: '+971 2 555 8899',
            status: 'active'
          }
        ]
      });
    }

    // Fetch from Supabase
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ vendors: data || [] });
  } catch (error) {
    console.error('Vendor fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// GET vendor by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Development mock
    if (process.env.NODE_ENV === 'development' && !process.env.SUPABASE_URL) {
      return res.json({
        vendor: {
          id,
          name: 'ABC Trading LLC',
          category: 'Electrical',
          email: 'contact@abctrading.ae',
          phone: '+971 4 123 4567',
          status: 'active'
        }
      });
    }

    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ vendor: data });
  } catch (error) {
    console.error('Vendor fetch error:', error);
    res.status(404).json({ error: 'Vendor not found' });
  }
});

// POST create vendor (Procurement only)
router.post('/', AuthMiddleware.requireRole('procurement'), async (req, res) => {
  try {
    const vendorData = req.body;

    // Validate required fields
    if (!vendorData.name || !vendorData.email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Development mock
    if (process.env.NODE_ENV === 'development' && !process.env.SUPABASE_URL) {
      return res.json({
        vendor: {
          id: Date.now().toString(),
          ...vendorData,
          created_at: new Date().toISOString()
        },
        message: 'Vendor created successfully'
      });
    }

    // Insert to Supabase
    const { data, error } = await supabase
      .from('vendors')
      .insert([{
        ...vendorData,
        created_by: req.user.id
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      vendor: data,
      message: 'Vendor created successfully'
    });
  } catch (error) {
    console.error('Vendor creation error:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// PUT update vendor (Procurement only)
router.put('/:id', AuthMiddleware.requireRole('procurement'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Development mock
    if (process.env.NODE_ENV === 'development' && !process.env.SUPABASE_URL) {
      return res.json({
        vendor: { id, ...updates },
        message: 'Vendor updated successfully'
      });
    }

    const { data, error } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      vendor: data,
      message: 'Vendor updated successfully'
    });
  } catch (error) {
    console.error('Vendor update error:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// DELETE vendor (Procurement only)
router.delete('/:id', AuthMiddleware.requireRole('procurement'), async (req, res) => {
  try {
    const { id } = req.params;

    // Development mock
    if (process.env.NODE_ENV === 'development' && !process.env.SUPABASE_URL) {
      return res.json({ message: 'Vendor deleted successfully' });
    }

    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Vendor deletion error:', error);
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

module.exports = router;