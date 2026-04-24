import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agritrack')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.log('❌ MongoDB connection error:', err));

// Product Schema
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['vegetables', 'fruits', 'grains', 'dairy']
  },
  quantityKg: {
  type: Number,
  required: true,
  min: 0
},
quantityLiters: {
  type: Number,
  required: false,
  min: 0,
  default: 0
},
  price: {
    type: Number,
    required: true,
    min: 0
  },
  harvestDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'expired'],
    default: 'available'
  }
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);

// Sales Schema
const saleSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  totalPrice: {
    type: Number,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  saleDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Sale = mongoose.model('Sale', saleSchema);

// 📊 Routes

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available products only
app.get('/api/products/available', async (req, res) => {
  try {
    const products = await Product.find({
      status: 'available',
      $or: [
        { quantityKg: { $gt: 0 } },
        { quantityLiters: { $gt: 0 } }
      ]
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new product
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Record a sale
app.post('/api/sales', async (req, res) => {
  try {
    const { productId, quantity, customerName } = req.body;
    
    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Determine if product uses liters or kg
    let availableQuantity = product.quantityKg > 0 ? product.quantityKg : product.quantityLiters;
    // Check if enough quantity
    if (availableQuantity < quantity) {
      return res.status(400).json({ message: 'Not enough quantity available' });
    }
    // Update quantities
    if (product.quantityKg > 0) {
      product.quantityKg -= quantity;
    } else {
      product.quantityLiters -= quantity;
    }
    // Set status if empty
    if (product.quantityKg === 0 && product.quantityLiters === 0) {
      product.status = 'sold';
    }
    
    // Calculate total price
    const totalPrice = product.price * quantity;
    
    // Create sale record
    const sale = new Sale({
      product: productId,
      quantity,
      totalPrice,
      customerName
    });
    
    await Promise.all([sale.save(), product.save()]);
    
    // Populate product details in response
    await sale.populate('product');
    res.status(201).json(sale);
    
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all sales
app.get('/api/sales', async (req, res) => {
  try {
    const sales = await Sale.find().populate('product').sort({ saleDate: -1 });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const availableProducts = await Product.countDocuments({
      status: 'available',
      $or: [
        { quantityKg: { $gt: 0 } },
        { quantityLiters: { $gt: 0 } }
      ]
    });
    const totalSales = await Sale.countDocuments();
    
    const salesRevenue = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' }
        }
      }
    ]);
    
    const revenue = salesRevenue[0]?.totalRevenue || 0;
    
    res.json({
      totalProducts,
      availableProducts,
      totalSales,
      totalRevenue: revenue
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌱 AgriTrack Backend Ready!`);
});
