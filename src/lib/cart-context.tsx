import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { MenuItem } from "@/lib/types";

export interface CartLine {
  item: MenuItem;
  qty: number;
}

interface CartState {
  lines: CartLine[];
}

type Action =
  | { type: "add"; item: MenuItem }
  | { type: "remove"; id: string }
  | { type: "decrement"; id: string }
  | { type: "clear" };

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "add": {
      const existing = state.lines.find((l) => l.item.id === action.item.id);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.item.id === action.item.id ? { ...l, qty: l.qty + 1 } : l,
          ),
        };
      }
      return { lines: [...state.lines, { item: action.item, qty: 1 }] };
    }
    case "decrement":
      return {
        lines: state.lines
          .map((l) => (l.item.id === action.id ? { ...l, qty: l.qty - 1 } : l))
          .filter((l) => l.qty > 0),
      };
    case "remove":
      return { lines: state.lines.filter((l) => l.item.id !== action.id) };
    case "clear":
      return { lines: [] };
  }
}

interface CartCtx extends CartState {
  add: (item: MenuItem) => void;
  decrement: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  total: number;
  count: number;
}

const Cart = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { lines: [] });

  const value = useMemo<CartCtx>(() => {
    const total = state.lines.reduce((s, l) => s + Number(l.item.price) * l.qty, 0);
    const count = state.lines.reduce((s, l) => s + l.qty, 0);
    return {
      ...state,
      add: (item) => dispatch({ type: "add", item }),
      decrement: (id) => dispatch({ type: "decrement", id }),
      remove: (id) => dispatch({ type: "remove", id }),
      clear: () => dispatch({ type: "clear" }),
      total,
      count,
    };
  }, [state]);

  return <Cart.Provider value={value}>{children}</Cart.Provider>;
}

export function useCart() {
  const ctx = useContext(Cart);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
