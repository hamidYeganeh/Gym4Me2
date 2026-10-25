"use client";
import { createContext, useContext, type ReactNode } from "react";
type SharePdf = (bytes: Uint8Array) => Promise<void>;
const PdfContext = createContext<SharePdf>(async (bytes) => {
  const url = URL.createObjectURL(
    new Blob([Uint8Array.from(bytes).buffer], { type: "application/pdf" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "gym4me-plan.pdf";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
export function TrainingPdfProvider({
  sharePdf,
  children,
}: {
  sharePdf?: SharePdf;
  children: ReactNode;
}) {
  const fallback = useContext(PdfContext);
  return (
    <PdfContext.Provider value={sharePdf ?? fallback}>
      {children}
    </PdfContext.Provider>
  );
}
export const useShareTrainingPdf = () => useContext(PdfContext);
