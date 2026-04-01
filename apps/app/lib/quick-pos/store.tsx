"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  QUICK_POS_STORAGE_KEY,
} from "@/lib/quick-pos/constants";
import type {
  QuickPosCartItem,
  QuickPosPaymentMethod,
  QuickPosReceiptOption,
  QuickPosState,
} from "@/lib/quick-pos/types";
import { getSubtotal, getTax, getTotal } from "@/lib/quick-pos/selectors";

const initialState: QuickPosState = {
  cartItems: [],
  customer: {
    id: null,
    phone: "",
    alias: null,
    remainingCredit: 0,
  },
  payment: {
    method: null,
    receipt: "none",
    creditConfirmed: false,
  },
  ui: {
    search: "",
    exitDialogOpen: false,
    processing: false,
    hardError: null,
    successMessage: null,
  },
  session: {
    lastSaleId: null,
    lastCompletedAt: null,
    pendingIdempotencyKey: null,
    lastSaleTotal: null,
    lastReceipt: null,
  },
  creditPolicyEnabled: false,
};

type Action =
  | { type: "hydrate"; payload: QuickPosState }
  | { type: "set_search"; payload: string }
  | { type: "set_credit_policy"; payload: boolean }
  | { type: "add_item"; payload: QuickPosCartItem }
  | { type: "remove_item"; payload: { id: string } }
  | { type: "increment_item"; payload: { id: string } }
  | { type: "set_customer"; payload: QuickPosState["customer"] }
  | { type: "set_payment_method"; payload: QuickPosPaymentMethod | null }
  | { type: "set_receipt"; payload: QuickPosReceiptOption }
  | { type: "set_credit_confirmed"; payload: boolean }
  | { type: "set_processing"; payload: boolean }
  | { type: "set_error"; payload: string | null }
  | { type: "set_success"; payload: string | null }
  | { type: "set_exit_open"; payload: boolean }
  | {
      type: "mark_completed";
      payload: { saleId: string; total: number; receipt: QuickPosReceiptOption };
    }
  | { type: "set_idempotency_key"; payload: string }
  | { type: "clear_idempotency_key" }
  | { type: "reset_for_next_sale" };

function reducer(state: QuickPosState, action: Action): QuickPosState {
  switch (action.type) {
    case "hydrate":
      return action.payload;
    case "set_search":
      return { ...state, ui: { ...state.ui, search: action.payload } };
    case "set_credit_policy":
      return { ...state, creditPolicyEnabled: action.payload };
    case "add_item": {
      const existing = state.cartItems.find((item) => item.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          cartItems: state.cartItems.map((item) =>
            item.id === action.payload.id ? { ...item, qty: item.qty + 1 } : item,
          ),
        };
      }
      return { ...state, cartItems: [...state.cartItems, action.payload] };
    }
    case "increment_item":
      return {
        ...state,
        cartItems: state.cartItems.map((item) =>
          item.id === action.payload.id ? { ...item, qty: item.qty + 1 } : item,
        ),
      };
    case "remove_item":
      return {
        ...state,
        cartItems: state.cartItems.filter((item) => item.id !== action.payload.id),
      };
    case "set_customer":
      return { ...state, customer: action.payload };
    case "set_payment_method":
      return {
        ...state,
        payment: {
          ...state.payment,
          method: action.payload,
          creditConfirmed: action.payload === "credit" ? state.payment.creditConfirmed : false,
        },
      };
    case "set_receipt":
      return { ...state, payment: { ...state.payment, receipt: action.payload } };
    case "set_credit_confirmed":
      return { ...state, payment: { ...state.payment, creditConfirmed: action.payload } };
    case "set_processing":
      return { ...state, ui: { ...state.ui, processing: action.payload } };
    case "set_error":
      return { ...state, ui: { ...state.ui, hardError: action.payload } };
    case "set_success":
      return { ...state, ui: { ...state.ui, successMessage: action.payload } };
    case "set_exit_open":
      return { ...state, ui: { ...state.ui, exitDialogOpen: action.payload } };
    case "mark_completed":
      return {
        ...state,
        session: {
          lastSaleId: action.payload.saleId,
          lastCompletedAt: Date.now(),
          pendingIdempotencyKey: null,
          lastSaleTotal: action.payload.total,
          lastReceipt: action.payload.receipt,
        },
        ui: { ...state.ui, successMessage: "Sale completed" },
      };
    case "set_idempotency_key":
      return {
        ...state,
        session: {
          ...state.session,
          pendingIdempotencyKey: action.payload,
        },
      };
    case "clear_idempotency_key":
      return {
        ...state,
        session: {
          ...state.session,
          pendingIdempotencyKey: null,
        },
      };
    case "reset_for_next_sale":
      return {
        ...initialState,
        creditPolicyEnabled: state.creditPolicyEnabled,
      };
    default:
      return state;
  }
}

interface QuickPosStore {
  state: QuickPosState;
  subtotal: number;
  tax: number;
  total: number;
  hydrate: (value: QuickPosState) => void;
  setSearch: (value: string) => void;
  setCreditPolicy: (enabled: boolean) => void;
  addItem: (item: QuickPosCartItem) => void;
  incrementItem: (id: string) => void;
  removeItem: (id: string) => void;
  setCustomer: (customer: QuickPosState["customer"]) => void;
  setPaymentMethod: (method: QuickPosPaymentMethod | null) => void;
  setReceipt: (receipt: QuickPosReceiptOption) => void;
  setCreditConfirmed: (value: boolean) => void;
  setProcessing: (value: boolean) => void;
  setError: (value: string | null) => void;
  setSuccess: (value: string | null) => void;
  setExitOpen: (value: boolean) => void;
  markCompleted: (payload: { saleId: string; total: number; receipt: QuickPosReceiptOption }) => void;
  setIdempotencyKey: (value: string) => void;
  clearIdempotencyKey: () => void;
  resetForNextSale: () => void;
}

const QuickPosContext = createContext<QuickPosStore | null>(null);

export function QuickPosProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(QUICK_POS_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as QuickPosState;
      dispatch({ type: "hydrate", payload: parsed });
    } catch {
      window.sessionStorage.removeItem(QUICK_POS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(QUICK_POS_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const hydrate = useCallback((value: QuickPosState) => dispatch({ type: "hydrate", payload: value }), []);
  const setSearch = useCallback((value: string) => dispatch({ type: "set_search", payload: value }), []);
  const setCreditPolicy = useCallback((enabled: boolean) => dispatch({ type: "set_credit_policy", payload: enabled }), []);
  const addItem = useCallback((item: QuickPosCartItem) => dispatch({ type: "add_item", payload: item }), []);
  const incrementItem = useCallback((id: string) => dispatch({ type: "increment_item", payload: { id } }), []);
  const removeItem = useCallback((id: string) => dispatch({ type: "remove_item", payload: { id } }), []);
  const setCustomer = useCallback((customer: QuickPosState["customer"]) => dispatch({ type: "set_customer", payload: customer }), []);
  const setPaymentMethod = useCallback((method: QuickPosPaymentMethod | null) => dispatch({ type: "set_payment_method", payload: method }), []);
  const setReceipt = useCallback((receipt: QuickPosReceiptOption) => dispatch({ type: "set_receipt", payload: receipt }), []);
  const setCreditConfirmed = useCallback((value: boolean) => dispatch({ type: "set_credit_confirmed", payload: value }), []);
  const setProcessing = useCallback((value: boolean) => dispatch({ type: "set_processing", payload: value }), []);
  const setError = useCallback((value: string | null) => dispatch({ type: "set_error", payload: value }), []);
  const setSuccess = useCallback((value: string | null) => dispatch({ type: "set_success", payload: value }), []);
  const setExitOpen = useCallback((value: boolean) => dispatch({ type: "set_exit_open", payload: value }), []);
  const markCompleted = useCallback(
    (payload: { saleId: string; total: number; receipt: QuickPosReceiptOption }) =>
      dispatch({ type: "mark_completed", payload }),
    [],
  );
  const setIdempotencyKey = useCallback(
    (value: string) => dispatch({ type: "set_idempotency_key", payload: value }),
    [],
  );
  const clearIdempotencyKey = useCallback(() => dispatch({ type: "clear_idempotency_key" }), []);
  const resetForNextSale = useCallback(() => dispatch({ type: "reset_for_next_sale" }), []);

  const subtotal = useMemo(() => getSubtotal(state), [state]);
  const tax = useMemo(() => getTax(state), [state]);
  const total = useMemo(() => getTotal(state), [state]);

  const value = useMemo(
    () => ({
      state,
      subtotal,
      tax,
      total,
      hydrate,
      setSearch,
      setCreditPolicy,
      addItem,
      incrementItem,
      removeItem,
      setCustomer,
      setPaymentMethod,
      setReceipt,
      setCreditConfirmed,
      setProcessing,
      setError,
      setSuccess,
      setExitOpen,
      markCompleted,
      setIdempotencyKey,
      clearIdempotencyKey,
      resetForNextSale,
    }),
    [
      state,
      subtotal,
      tax,
      total,
      hydrate,
      setSearch,
      setCreditPolicy,
      addItem,
      incrementItem,
      removeItem,
      setCustomer,
      setPaymentMethod,
      setReceipt,
      setCreditConfirmed,
      setProcessing,
      setError,
      setSuccess,
      setExitOpen,
      markCompleted,
      setIdempotencyKey,
      clearIdempotencyKey,
      resetForNextSale,
    ],
  );

  return <QuickPosContext.Provider value={value}>{children}</QuickPosContext.Provider>;
}

export function useQuickPosStore() {
  const context = useContext(QuickPosContext);
  if (!context) {
    throw new Error("useQuickPosStore must be used within QuickPosProvider");
  }
  return context;
}
