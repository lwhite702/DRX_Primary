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
  QuickPosCardFeePolicy,
  QuickPosCartItem,
  QuickPosDeliveryState,
  QuickPosPaymentMethod,
  QuickPosReceiptOption,
  QuickPosState,
} from "@/lib/quick-pos/types";
import { getSubtotal, getTax, getTotal } from "@/lib/quick-pos/selectors";
import { calculateFractionalLine } from "@/lib/quick-pos/commerce";

const initialState: QuickPosState = {
  cartItems: [],
  customer: {
    id: null,
    phone: "",
    alias: null,
    remainingCredit: 0,
  },
  previousCustomer: null,
  payment: {
    method: null,
    receipt: "none",
    creditConfirmed: false,
    cardFeeCents: 0,
    cardFeeWaived: false,
    cardFeeCustomCents: null,
    paymentRef: "",
    tenders: [],
  },
  delivery: {
    enabled: false,
    address: "",
    vendorFeeCents: 0,
    feeAllocation: "charge_customer",
    feeTaxable: false,
    dispatchType: "merchant_dispatch",
    feeSplitMode: "pass_full",
    customerFeeCents: 0,
    estimatedArrivalMinutes: undefined,
    uberTrackingUrl: "",
  },
  discount: {
    amountCents: 0,
    reason: undefined,
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
  cardFeePolicy: {
    enabled: false,
    feeType: "percent",
    feeBps: 350,
    feeFlatCents: 0,
  },
};

type Action =
  | { type: "hydrate"; payload: QuickPosState }
  | { type: "set_search"; payload: string }
  | { type: "set_credit_policy"; payload: boolean }
  | { type: "set_card_fee_policy"; payload: QuickPosCardFeePolicy }
  | { type: "add_item"; payload: QuickPosCartItem }
  | { type: "remove_item"; payload: { id: string } }
  | { type: "increment_item"; payload: { id: string } }
  | {
      type: "update_item_price";
      payload: { id: string; unitPrice: number; overrideReason: string };
    }
  | { type: "set_customer"; payload: QuickPosState["customer"] }
  | { type: "undo_customer" }
  | { type: "set_payment_method"; payload: QuickPosPaymentMethod | null }
  | { type: "set_payment_details"; payload: Partial<QuickPosState["payment"]> }
  | { type: "set_receipt"; payload: QuickPosReceiptOption }
  | { type: "set_credit_confirmed"; payload: boolean }
  | { type: "set_delivery"; payload: QuickPosDeliveryState }
  | { type: "set_delivery_fee_taxable"; payload: boolean }
  | { type: "set_discount"; payload: { amountCents: number; reason?: string } }
  | { type: "clear_discount" }
  | { type: "set_processing"; payload: boolean }
  | { type: "set_error"; payload: string | null }
  | { type: "set_success"; payload: string | null }
  | { type: "set_exit_open"; payload: boolean }
  | {
      type: "mark_completed";
      payload: {
        saleId: string;
        total: number;
        receipt: QuickPosReceiptOption;
        changeAmount?: number;
        isDelivery?: boolean;
      };
    }
  | { type: "set_idempotency_key"; payload: string }
  | { type: "clear_idempotency_key" }
  | { type: "reset_for_next_sale" };

function reducer(state: QuickPosState, action: Action): QuickPosState {
  switch (action.type) {
    case "hydrate":
      return {
        ...initialState,
        ...action.payload,
        customer: { ...initialState.customer, ...action.payload.customer },
        payment: { ...initialState.payment, ...action.payload.payment },
        delivery: { ...initialState.delivery, ...action.payload.delivery },
        discount: { ...initialState.discount, ...action.payload.discount },
        ui: { ...initialState.ui, ...action.payload.ui },
        session: { ...initialState.session, ...action.payload.session },
      };
    case "set_search":
      return { ...state, ui: { ...state.ui, search: action.payload } };
    case "set_credit_policy":
      return { ...state, creditPolicyEnabled: action.payload };
    case "set_card_fee_policy":
      return { ...state, cardFeePolicy: action.payload };
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
          item.id === action.payload.id
            ? (() => {
                if (item.commerceConfig && !item.commerceConfig.fractionalEnabled) {
                  const line = calculateFractionalLine(
                    item.qty + item.commerceConfig.quantityIncrement,
                    item.commerceConfig,
                  );
                  return {
                    ...item,
                    qty: line.quantity,
                    unitPrice: line.unitPrice,
                    bulkTierApplied: line.bulkTier?.label,
                  };
                }
                return { ...item, qty: item.qty + 1 };
              })()
            : item,
        ),
      };
    case "remove_item":
      return {
        ...state,
        cartItems: state.cartItems.filter((item) => item.id !== action.payload.id),
      };
    case "update_item_price":
      return {
        ...state,
        cartItems: state.cartItems.map((item) =>
          item.id === action.payload.id
            ? {
                ...item,
                originalPrice: item.originalPrice ?? item.unitPrice,
                unitPrice: action.payload.unitPrice,
                overrideReason: action.payload.overrideReason,
              }
            : item,
        ),
      };
    case "set_customer": {
      const hasCurrent = Boolean(state.customer.id);
      const isDifferent = state.customer.id !== action.payload.id;
      const previousCustomer = hasCurrent && isDifferent ? state.customer : state.previousCustomer ?? null;
      return {
        ...state,
        previousCustomer,
        customer: action.payload,
      };
    }
    case "undo_customer": {
      if (!state.previousCustomer) return state;
      const restored = state.previousCustomer;
      return {
        ...state,
        previousCustomer: state.customer.id ? state.customer : null,
        customer: restored,
      };
    }
    case "set_payment_method":
      return {
        ...state,
        payment: {
          ...state.payment,
          method: action.payload,
          creditConfirmed: action.payload === "credit" ? state.payment.creditConfirmed : false,
        },
      };
    case "set_payment_details":
      return {
        ...state,
        payment: {
          ...state.payment,
          ...action.payload,
        },
      };
    case "set_receipt":
      return { ...state, payment: { ...state.payment, receipt: action.payload } };
    case "set_credit_confirmed":
      return { ...state, payment: { ...state.payment, creditConfirmed: action.payload } };
    case "set_delivery":
      return { ...state, delivery: action.payload };
    case "set_delivery_fee_taxable":
      return {
        ...state,
        delivery: { ...state.delivery, feeTaxable: action.payload },
      };
    case "set_discount":
      return {
        ...state,
        discount: action.payload,
      };
    case "clear_discount":
      return {
        ...state,
        discount: { amountCents: 0, reason: undefined },
      };
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
          lastChange: action.payload.changeAmount ?? null,
          lastIsDelivery: action.payload.isDelivery ?? false,
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
        cardFeePolicy: state.cardFeePolicy,
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
  setCardFeePolicy: (policy: QuickPosCardFeePolicy) => void;
  addItem: (item: QuickPosCartItem) => void;
  incrementItem: (id: string) => void;
  removeItem: (id: string) => void;
  updateItemPrice: (id: string, unitPrice: number, overrideReason: string) => void;
  setCustomer: (customer: QuickPosState["customer"]) => void;
  undoCustomerChange: () => void;
  setPaymentMethod: (method: QuickPosPaymentMethod | null) => void;
  setPaymentDetails: (patch: Partial<QuickPosState["payment"]>) => void;
  setReceipt: (receipt: QuickPosReceiptOption) => void;
  setCreditConfirmed: (value: boolean) => void;
  setDelivery: (delivery: QuickPosDeliveryState) => void;
  setDeliveryFeeTaxable: (feeTaxable: boolean) => void;
  setDiscount: (amountCents: number, reason?: string) => void;
  clearDiscount: () => void;
  setProcessing: (value: boolean) => void;
  setError: (value: string | null) => void;
  setSuccess: (value: string | null) => void;
  setExitOpen: (value: boolean) => void;
  markCompleted: (payload: {
    saleId: string;
    total: number;
    receipt: QuickPosReceiptOption;
    changeAmount?: number;
    isDelivery?: boolean;
  }) => void;
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
  const setCardFeePolicy = useCallback((policy: QuickPosCardFeePolicy) => dispatch({ type: "set_card_fee_policy", payload: policy }), []);
  const addItem = useCallback((item: QuickPosCartItem) => dispatch({ type: "add_item", payload: item }), []);
  const incrementItem = useCallback((id: string) => dispatch({ type: "increment_item", payload: { id } }), []);
  const removeItem = useCallback((id: string) => dispatch({ type: "remove_item", payload: { id } }), []);
  const updateItemPrice = useCallback(
    (id: string, unitPrice: number, overrideReason: string) =>
      dispatch({ type: "update_item_price", payload: { id, unitPrice, overrideReason } }),
    [],
  );
  const setCustomer = useCallback((customer: QuickPosState["customer"]) => dispatch({ type: "set_customer", payload: customer }), []);
  const undoCustomerChange = useCallback(() => dispatch({ type: "undo_customer" }), []);
  const setPaymentMethod = useCallback((method: QuickPosPaymentMethod | null) => dispatch({ type: "set_payment_method", payload: method }), []);
  const setPaymentDetails = useCallback((patch: Partial<QuickPosState["payment"]>) => dispatch({ type: "set_payment_details", payload: patch }), []);
  const setReceipt = useCallback((receipt: QuickPosReceiptOption) => dispatch({ type: "set_receipt", payload: receipt }), []);
  const setCreditConfirmed = useCallback((value: boolean) => dispatch({ type: "set_credit_confirmed", payload: value }), []);
  const setDelivery = useCallback(
    (delivery: QuickPosDeliveryState) =>
      dispatch({ type: "set_delivery", payload: delivery }),
    [],
  );
  const setDeliveryFeeTaxable = useCallback(
    (feeTaxable: boolean) =>
      dispatch({ type: "set_delivery_fee_taxable", payload: feeTaxable }),
    [],
  );
  const setDiscount = useCallback(
    (amountCents: number, reason?: string) =>
      dispatch({ type: "set_discount", payload: { amountCents, reason } }),
    [],
  );
  const clearDiscount = useCallback(
    () => dispatch({ type: "clear_discount" }),
    [],
  );
  const setProcessing = useCallback((value: boolean) => dispatch({ type: "set_processing", payload: value }), []);
  const setError = useCallback((value: string | null) => dispatch({ type: "set_error", payload: value }), []);
  const setSuccess = useCallback((value: string | null) => dispatch({ type: "set_success", payload: value }), []);
  const setExitOpen = useCallback((value: boolean) => dispatch({ type: "set_exit_open", payload: value }), []);
  const markCompleted = useCallback(
    (payload: {
      saleId: string;
      total: number;
      receipt: QuickPosReceiptOption;
      changeAmount?: number;
      isDelivery?: boolean;
    }) => dispatch({ type: "mark_completed", payload }),
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
      setCardFeePolicy,
      addItem,
      incrementItem,
      removeItem,
      updateItemPrice,
      setCustomer,
      undoCustomerChange,
      setPaymentMethod,
      setPaymentDetails,
      setReceipt,
      setCreditConfirmed,
      setDelivery,
      setDeliveryFeeTaxable,
      setDiscount,
      clearDiscount,
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
      setCardFeePolicy,
      addItem,
      incrementItem,
      removeItem,
      updateItemPrice,
      setCustomer,
      undoCustomerChange,
      setPaymentMethod,
      setPaymentDetails,
      setReceipt,
      setCreditConfirmed,
      setDelivery,
      setDeliveryFeeTaxable,
      setDiscount,
      clearDiscount,
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
