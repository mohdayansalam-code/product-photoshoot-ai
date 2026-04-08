import { create } from "zustand";

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  addedAt: string;
}

interface ProductStore {
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  setProducts: (products) => set({ products }),
  addProduct: (product) =>
    set((state) => ({
      products: [product, ...state.products],
    })),
  removeProduct: (id) =>
    set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
}));
