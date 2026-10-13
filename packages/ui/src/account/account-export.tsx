"use client";
import { createContext, useContext, type ReactNode } from "react";

type ExportFile = (data: unknown) => Promise<void>;
const AccountExportContext = createContext<ExportFile>(async (data) => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "gym4me-account.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
export function AccountExportProvider({
  exportFile,
  children,
}: {
  exportFile?: ExportFile;
  children: ReactNode;
}) {
  const browserExport = useContext(AccountExportContext);
  return (
    <AccountExportContext.Provider value={exportFile ?? browserExport}>
      {children}
    </AccountExportContext.Provider>
  );
}
export const useAccountExportFile = () => useContext(AccountExportContext);
