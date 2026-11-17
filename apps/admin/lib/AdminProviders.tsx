"use client";

import { Toast } from "@base-ui/react/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import type { ReactNode } from "react";

const Notifications = () => {
  const { toasts } = Toast.useToastManager();
  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed inset-x-4 bottom-20 z-50 flex flex-col gap-2 sm:start-auto sm:w-80">
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            className="bg-neutral-850 rounded-xl border border-theme-border p-4 text-sm text-theme-foreground shadow-lg"
          >
            <Toast.Title dir="auto" />
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
};

export const AdminProviders = ({ children }: { children: ReactNode }) => {
  const [client] = useState(
    () =>
      new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { gcTime: 0 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <Toast.Provider>
        {children}
        <Notifications />
      </Toast.Provider>
    </QueryClientProvider>
  );
};
