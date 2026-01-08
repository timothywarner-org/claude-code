import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * ProductCatalog - Displays filterable product grid with cart functionality
 * This component demonstrates mixed patterns for context analysis exercises
 */
const ProductCatalog = ({ categoryId, onAddToCart, apiBaseUrl }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    minPrice: 0,
    maxPrice: 1000,
    inStock: false,
    sortBy: 'name'
  });

  // Good: useCallback for memoized fetch function
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        category: categoryId,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        inStock: filters.inStock,
        sort: filters.sortBy
      });

      const response = await fetch(`${apiBaseUrl}/products?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setProducts(data.products);
    } catch (err) {
      setError(err.message);
      // Issue: Console.log in production code
      console.log('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryId, filters, apiBaseUrl]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Issue: Inline function in render - creates new reference each render
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  // Good: Proper event handler pattern
  const handleAddToCart = useCallback((product) => {
    onAddToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    });
  }, [onAddToCart]);

  if (loading) {
    return <div className="loading-spinner" aria-label="Loading products" />;
  }

  if (error) {
    return (
      <div className="error-message" role="alert">
        <p>Failed to load products: {error}</p>
        <button onClick={fetchProducts}>Retry</button>
      </div>
    );
  }

  return (
    <div className="product-catalog">
      <aside className="filters">
        <h3>Filters</h3>
        <label>
          Min Price: ${filters.minPrice}
          <input
            type="range"
            min="0"
            max="1000"
            value={filters.minPrice}
            onChange={(e) => handleFilterChange('minPrice', Number(e.target.value))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(e) => handleFilterChange('inStock', e.target.checked)}
          />
          In Stock Only
        </label>
      </aside>

      <main className="product-grid">
        {products.length === 0 ? (
          <p>No products found matching your criteria.</p>
        ) : (
          products.map((product) => (
            // Issue: Index as key would be problematic if list reorders
            <article key={product.id} className="product-card">
              <img src={product.imageUrl} alt={product.name} />
              <h4>{product.name}</h4>
              <p className="price">${product.price.toFixed(2)}</p>
              <p className="stock">
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </p>
              <button
                onClick={() => handleAddToCart(product)}
                disabled={product.stock === 0}
              >
                Add to Cart
              </button>
            </article>
          ))
        )}
      </main>
    </div>
  );
};

ProductCatalog.propTypes = {
  categoryId: PropTypes.string.isRequired,
  onAddToCart: PropTypes.func.isRequired,
  apiBaseUrl: PropTypes.string
};

ProductCatalog.defaultProps = {
  apiBaseUrl: '/api'
};

export default ProductCatalog;
