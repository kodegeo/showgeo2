import { useState } from "react";
import { Modal } from "@/components/creator/Modal";
import { useModalContext } from "@/state/creator/modalContext";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useAddProductWithImage } from "@/hooks/creator/useCreatorActions";

export function AddProductModal() {
  const { currentModal, closeModal, modalData } = useModalContext();
  const { currentEntity } = useEntityContext();
  const addProduct = useAddProductWithImage();

  const storeId = modalData?.storeId;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    productImage: null as File | null,
  });

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const isOpen = currentModal === "addProduct";

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, productImage: file });
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeId || !currentEntity) {
      return;
    }

    try {
      await addProduct.mutateAsync({
        storeId,
        entityId: currentEntity.id,
        name: formData.name,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        currency: "USD",
        imageFile: formData.productImage || undefined,
        isAvailable: parseInt(formData.quantity) > 0,
      });

      closeModal();
      setFormData({
        name: "",
        description: "",
        price: "",
        quantity: "",
        productImage: null,
      });
      setImageUrl(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Add Product"
      description="Add a new product to your store"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Product Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none"
            placeholder="Enter product name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none resize-none"
            rows={3}
            placeholder="Describe your product"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Price (USD) *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none"
            placeholder="0.00"
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Quantity *
          </label>
          <input
            type="number"
            required
            min="0"
            step="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white placeholder-[#9A9A9A] focus:border-[#CD000E] focus:outline-none"
            placeholder="0"
          />
        </div>

        {/* Product Image */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2 uppercase text-xs tracking-wider">
            Product Image
          </label>
          <input
            type="file"
            accept=".jpg,.png"
            onChange={handleImageChange}
            className="w-full px-4 py-2 bg-[#0B0B0B] border border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#CD000E] file:text-white hover:file:bg-[#860005] file:cursor-pointer"
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Product preview"
              className="mt-2 w-full h-32 object-cover rounded-lg border border-gray-700"
            />
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={closeModal}
            className="px-6 py-2 border border-gray-700 text-white rounded-lg hover:border-gray-600 transition-colors uppercase text-xs font-heading font-semibold tracking-wider"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={addProduct.isPending}
            className="px-6 py-2 bg-[#CD000E] text-white rounded-lg hover:bg-[#860005] transition-colors uppercase text-xs font-heading font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addProduct.isPending ? "Adding..." : "Add Product"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

