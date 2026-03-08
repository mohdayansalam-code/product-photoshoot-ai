import { create } from "zustand";

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  addedAt: string;
}

interface ProductStore {
  products: Product[];
  addProduct: (product: Omit<Product, "id" | "addedAt">) => void;
  removeProduct: (id: string) => void;
}

// Seed with mock data
const INITIAL_PRODUCTS: Product[] = [
  { id: "p1", name: "Luxury Serum Bottle", imageUrl: "/placeholder.svg", addedAt: "2026-03-07T10:00:00Z" },
  { id: "p2", name: "Rose Gold Watch", imageUrl: "/placeholder.svg", addedAt: "2026-03-06T14:30:00Z" },
  { id: "p3", name: "Leather Handbag", imageUrl: "/placeholder.svg", addedAt: "2026-03-05T09:15:00Z" },
  { id: "p4", name: "Wireless Earbuds", imageUrl: "/placeholder.svg", addedAt: "2026-03-04T16:45:00Z" },
];

export const useProductStore = create<ProductStore>((set) => ({
  products: INITIAL_PRODUCTS,
  addProduct: (product) =>
    set((state) => ({
      products: [
        { ...product, id: `p_${Date.now()}`, addedAt: new Date().toISOString() },
        ...state.products,
      ],
    })),
  removeProduct: (id) =>
    set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
}));
