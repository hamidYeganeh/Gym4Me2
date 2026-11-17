"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import type { ReactNode } from "react";

export { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const ApiProvider = (props: { children: ReactNode }) => {
  const { children } = props;
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};
