import { useEntityContext } from "@/hooks/useEntityContext";
import { useStoreByEntity, useCreateStore } from "@/hooks/useStore";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";
import { ShoppingBag, Plus, Package } from "lucide-react";
import { useState } from "react";

export function CreatorStorePage() {
  const { currentEntity } = useEntityContext();
  const { data: store, isLoading } = useStoreByEntity(currentEntity?.id || "");
  const createStore = useCreateStore();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateStore = async () => {
    if (!currentEntity) return;
    setIsCreating(true);
    try {
      // Generate slug from entity name
      const slug = `${currentEntity.name.toLowerCase().replace(/\s+/g, "-")}-store`;
      await createStore.mutateAsync({
        name: `${currentEntity.name} Store`,
        slug: slug,
        description: `Official store for ${currentEntity.name}`,
      });
    } catch (error) {
      console.error("Failed to create store:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-2 uppercase tracking-tighter">
              My Store
            </h1>
            <p className="text-[#9A9A9A] font-body">
              Manage your merchandise and digital products
            </p>
          </div>
          {store && (
            <button className="px-6 py-3 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-[#CD000E]/50 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          )}
        </div>

        {/* Store Content */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CD000E] mx-auto mb-4"></div>
            <p className="text-[#9A9A9A] font-body">Loading store...</p>
          </div>
        ) : !store ? (
          <div className="text-center py-12 bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-8">
            <ShoppingBag className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-heading font-semibold text-white mb-2 uppercase tracking-tight">
              No Store Yet
            </h3>
            <p className="text-[#9A9A9A] font-body mb-6">
              Create a store to start selling products and tickets
            </p>
            <button
              onClick={handleCreateStore}
              disabled={isCreating || createStore.isPending}
              className="inline-block px-6 py-3 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-[#CD000E]/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating || createStore.isPending ? "Creating..." : "Create Store"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Store Info */}
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-heading font-semibold text-white mb-2 uppercase tracking-tight">
                    {store.name}
                  </h2>
                  <p className="text-[#9A9A9A] font-body">{store.description}</p>
                </div>
                <span
                  className={`
                    px-3 py-1 rounded text-xs font-heading font-semibold uppercase tracking-wider
                    ${
                      store.status === "ACTIVE"
                        ? "bg-green-900/30 text-green-300"
                        : "bg-gray-800 text-gray-400"
                    }
                  `}
                >
                  {store.status}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-800">
                <div>
                  <div className="text-sm text-[#9A9A9A] font-body uppercase tracking-wider mb-1">
                    Products
                  </div>
                  <div className="text-2xl font-heading font-bold text-white">
                    {store.products?.length || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#9A9A9A] font-body uppercase tracking-wider mb-1">
                    Currency
                  </div>
                  <div className="text-2xl font-heading font-bold text-white">
                    {store.currency || "USD"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#9A9A9A] font-body uppercase tracking-wider mb-1">
                    Visibility
                  </div>
                  <div className="text-2xl font-heading font-bold text-white capitalize">
                    {store.visibility}
                  </div>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-heading font-semibold text-white uppercase tracking-tight">
                  Products
                </h2>
                <button className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
              </div>

              {store.products && store.products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {store.products.map((product) => (
                    <div
                      key={product.id}
                      className="border border-gray-800 rounded-lg p-4 hover:border-[#CD000E]/50 transition-colors"
                    >
                      <div className="mb-3">
                        <h3 className="text-lg font-heading font-semibold text-white mb-1 uppercase tracking-tight">
                          {product.name}
                        </h3>
                        <p className="text-sm text-[#9A9A9A] font-body line-clamp-2">
                          {product.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                        <div className="text-lg font-heading font-bold text-white">
                          ${product.price.toFixed(2)}
                        </div>
                        <span
                          className={`
                            px-2 py-1 rounded text-xs font-heading font-semibold uppercase tracking-wider
                            ${
                              product.isAvailable
                                ? "bg-green-900/30 text-green-300"
                                : "bg-gray-800 text-gray-400"
                            }
                          `}
                        >
                          {product.isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-[#9A9A9A] font-body mb-4">No products yet</p>
                  <button className="px-4 py-2 bg-[#CD000E] hover:bg-[#860005] text-white font-heading font-semibold rounded-lg uppercase tracking-wider transition-all duration-300 text-sm">
                    Add Product
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </CreatorDashboardLayout>
  );
}

