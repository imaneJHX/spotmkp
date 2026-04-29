const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/beautyspot');

const products = [
  {
    name: 'Lipstick Red',
    description: 'Long-lasting red lipstick',
    price: 150,
    category: 'Makeup',
    brand: 'Beauty Spot',
    images: ['https://via.placeholder.com/300'],
    stock: 50,
  },
  {
    name: 'Foundation Light',
    description: 'Natural foundation for light skin',
    price: 200,
    category: 'Makeup',
    brand: 'Beauty Spot',
    images: ['https://via.placeholder.com/300'],
    stock: 30,
  },
  {
    name: 'Moisturizing Cream',
    description: 'Hydrating skincare cream',
    price: 100,
    category: 'Skincare',
    brand: 'Beauty Spot',
    images: ['https://via.placeholder.com/300'],
    stock: 40,
  },
];

Product.insertMany(products).then(() => {
  console.log('Products added');
  mongoose.connection.close();
});