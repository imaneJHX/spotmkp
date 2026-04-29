import React, { useState, useEffect } from 'react';
import api, { getApiErrorMessage } from '../lib/api';

const Admin = () => {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', category: '', brand: '', stock: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    api.get('/products')
      .then((res) => {
        if (isActive) {
          setProducts(res.data);
        }
      })
      .catch(() => {
        if (isActive) {
          setMessage('Impossible de charger les produits.');
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleAdd = async () => {
    try {
      const payload = {
        ...newProduct,
        price: Number(newProduct.price || 0),
        stock: Number(newProduct.stock || 0),
        currency: 'MAD',
      };
      const { data } = await api.post('/admin/products', payload);
      setProducts((current) => [...current, data]);
      setNewProduct({ name: '', description: '', price: '', category: '', brand: '', stock: '' });
      setMessage('Produit ajoute avec succes.');
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Impossible d'ajouter le produit."));
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Tableau de bord admin</h1>
      {message ? <p>{message}</p> : null}
      <div>
        <input placeholder="Nom" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
        <input placeholder="Description" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
        <input placeholder="Prix" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
        <input placeholder="Categorie" value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
        <input placeholder="Marque" value={newProduct.brand} onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })} />
        <input placeholder="Stock" value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })} />
        <button onClick={handleAdd}>Ajouter le produit</button>
      </div>
      <ul>
        {products.map(p => <li key={p._id}>{p.name}</li>)}
      </ul>
    </div>
  );
};

export default Admin;
