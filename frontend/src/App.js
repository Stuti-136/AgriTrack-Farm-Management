import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({});
  const [unit, setUnit] = useState('kg');
  const [newProduct, setNewProduct] = useState({
  name: '',
  category: 'vegetables',
  quantity: 0,
  price: 0,
  unit: 'kg'
});

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [productsRes, salesRes, statsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/products'),
        axios.get('http://localhost:5000/api/sales'),
        axios.get('http://localhost:5000/api/dashboard/stats')
      ]);
      
      setProducts(productsRes.data);
      setSales(salesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: newProduct.name,
        category: newProduct.category,
        price: newProduct.price,
        unit: newProduct.unit,
        quantityKg: newProduct.unit === 'kg' ? newProduct.quantity : 0,
        quantityLiters: newProduct.unit === 'liters' ? newProduct.quantity : 0
      };
      await axios.post("http://localhost:5000/api/products", payload);
      setNewProduct({ 
        name: '',
        category: 'vegetables',
        quantity: 0,
        price: 0,
        unit: 'kg' });
      fetchDashboardData();
      alert('Product added successfully!');
    } catch (error) {
      alert('Error adding product: ' + error.response?.data?.message);
    }
  };

  const recordSale = async (productId) => {
    const quantity = prompt('Enter quantity to sell:');
    const customerName = prompt('Enter customer name:');
    
    if (!quantity || !customerName) return;
    
    try {
      await axios.post('http://localhost:5000/api/sales', {
        productId,
        quantity: parseInt(quantity),
        customerName
      });
      fetchDashboardData();
      alert('Sale recorded successfully!');
    } catch (error) {
      alert('Error recording sale: ' + error.response?.data?.message);
    }
  };

  const deleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`http://localhost:5000/api/products/${productId}`);
        fetchDashboardData();
      } catch (error) {
        alert('Error deleting product');
      }
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>AgriTrack</h1>
        <p>Simple Farm Management System</p>
      </header>

      <nav className="tabs">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={activeTab === 'products' ? 'active' : ''}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
        <button 
          className={activeTab === 'sales' ? 'active' : ''}
          onClick={() => setActiveTab('sales')}
        >
          Sales
        </button>
        <button 
          className={activeTab === 'add' ? 'active' : ''}
          onClick={() => setActiveTab('add')}
        >
          Add Product
        </button>
      </nav>

      <main className="main-content">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <h2>Farm Overview</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Products</h3>
                <p className="stat-number">{stats.totalProducts || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Available Products</h3>
                <p className="stat-number">{stats.availableProducts || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Total Sales</h3>
                <p className="stat-number">{stats.totalSales || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Total Revenue</h3>
                <p className="stat-number">₹{stats.totalRevenue || 0}</p>
              </div>
            </div>

            <div className="recent-section">
              <h3>Recent Products</h3>
              <div className="products-grid">
                {products.slice(0, 4).map(product => (
                  <div key={product._id} className="product-card">
                    <h4>{product.name}</h4>
                    <p>Category: {product.category}</p>
                    <p>Quantity: {product.quantityKg > 0 ? `${product.quantityKg} kg` : `${product.quantityLiters} L`}</p>
                    <p>Price: ₹{product.price}/{product.quantityKg > 0 ? "kg" : "L"}</p>
                    <span className={`status ${product.status}`}>
                      {product.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="products">
            <h2>All Products</h2>
            <div className="products-list">
              {products.map(product => (
                <div key={product._id} className="product-item">
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <p><strong>Category:</strong> {product.category}</p>
                    <p><strong>Quantity:</strong> {product.quantityKg > 0 ? `${product.quantityKg} kg` : `${product.quantityLiters} L`}</p>
                    <p><strong>Price:</strong> ₹{product.price}/{product.quantityKg > 0 ? "kg" : "L"}</p>
                    <p><strong>Harvested:</strong> {new Date(product.harvestDate).toLocaleDateString()}</p>
                    <span className={`status ${product.status}`}>
                      {product.status}
                    </span>
                  </div>
                  <div className="product-actions">
                    {product.status === "available" && 
                    (product.quantityKg > 0 || product.quantityLiters > 0) && (
                    <button onClick={() => recordSale(product._id)} className="sell-btn">
                      Sell
                      </button>
                    )}

                    <button 
                      onClick={() => deleteProduct(product._id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <div className="sales">
            <h2>Sales History</h2>
            <div className="sales-list">
              {sales.map(sale => (
                <div key={sale._id} className="sale-item">
                  <h3>{sale.product?.name}</h3>
                  <p><strong>Customer:</strong> {sale.customerName}</p>
                  <p><strong>Quantity:</strong> {sale.product.quantityKg > 0 ? `${sale.quantity} kg` : `${sale.quantity} L`}</p>
                  <p><strong>Total:</strong> ₹{sale.totalPrice}</p>
                  <p><strong>Date:</strong> {new Date(sale.saleDate).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Product Tab */}
        {activeTab === 'add' && (
          <div className="add-product">
            <h2>Add New Product</h2>
            <form onSubmit={addProduct} className="product-form">
              <input
                type="text"
                placeholder="Product Name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                required
              />
              
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
              >
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="grains">Grains</option>
                <option value="dairy">Dairy</option>
              </select>
              
              <select
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                setNewProduct({ ...newProduct, unit: e.target.value });
              }}
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="liters">Liters (L)</option>
                </select>
                
                <input
                type="number"
                placeholder={`Quantity (${unit})`}
                value={newProduct.quantity}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, quantity: parseFloat(e.target.value) })
                }
                min="0"
                required
                />

              <input
              type="number"
              placeholder={`Price per ${unit} (₹)`}
              value={newProduct.price}
              onChange={(e) =>
                setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })
              }
              min="0"
              step="0.01"
              required
              />

              <button type="submit" className="submit-btn">
                Add Product
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
