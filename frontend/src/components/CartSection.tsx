import React from "react";
import { ShoppingCart } from "lucide-react";

const CartSection: React.FC = () => {
  return (
    <section className="bg-gray-900 text-white py-16 text-center">
      <h2 className="text-3xl font-bold mb-4">Support Your Favorite Creators</h2>
      <p className="max-w-xl mx-auto mb-8 text-gray-300">
        Buy exclusive merch, tickets, and experiences from the artists you love.
      </p>
      <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md flex items-center gap-2 mx-auto">
        <ShoppingCart size={20} />
        View Cart
      </button>
    </section>
  );
};

export default CartSection;
