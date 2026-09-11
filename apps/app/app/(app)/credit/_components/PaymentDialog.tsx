import React from "react";
import { CreditEntryDialog, type CreditEntryDialogProps } from "./CreditEntryDialog";
export function PaymentDialog(props: CreditEntryDialogProps) { return <CreditEntryDialog {...props} mode="payment" />; }
