import generatedProducts from './products.generated';

const productOverrides = {
  // Example:
  // 'clinique-moisture-set': {
  //   name: 'Clinique Moisture Set',
  //   price: 499,
  //   category: 'skincare',
  //   featured: true,
  //   badge: 'Best Seller',
  // },
};

const products = generatedProducts.map((product) => {
  const override = productOverrides[product.slug] || {};

  return {
    ...product,
    ...override,
    image: override.image || product.image,
    images: override.images || product.images || [override.image || product.image],
  };
});

export default products;
