"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { BookingModal } from "./BookingModal";

const BookingContext = createContext(null);

/**
 * Mounted once in the root layout so both the header's "Book a visit"
 * button and each service card's "Book" button can open the same modal,
 * regardless of where they sit in the component tree.
 */
export function BookingProvider({ children }) {
  const [serviceId, setServiceId] = useState(null);
  const [open, setOpen] = useState(false);

  const openBooking = useCallback((preselectedServiceId = null) => {
    setServiceId(preselectedServiceId);
    setOpen(true);
  }, []);

  const closeBooking = useCallback(() => {
    setOpen(false);
    setServiceId(null);
  }, []);

  return (
    <BookingContext.Provider value={{ openBooking }}>
      {children}
      {open && <BookingModal serviceId={serviceId} onClose={closeBooking} />}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return ctx;
}
