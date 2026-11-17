"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { AuthForm } from "@/features/auth/AuthView";
import { readToken, subscribe } from "@/features/auth/session";
import { CoachRequestForm } from "@/features/coach-requests/CoachRequestForm";
import { ApiProvider } from "@repo/api/react-query";

const CoachRegistrationPage = () => {
  const token = useSyncExternalStore(subscribe, readToken, () => null);
  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <header dir="rtl" lang="fa">
        <h1 className="text-2xl font-bold">درخواست ثبت‌نام مربی</h1>
        <Link href="/my-requests/" className="mt-2 inline-block underline">
          درخواست‌های من
        </Link>
        {!token && <p className="mt-2">برای ارسال درخواست، ابتدا با شماره موبایل وارد شوید.</p>}
      </header>
      <ApiProvider>
        {token ?
          <div dir="rtl" lang="fa">
            <CoachRequestForm key={token} token={token} />
          </div>
        : <div dir="rtl" lang="fa">
            <AuthForm locale="fa" />
          </div>
        }
      </ApiProvider>
    </main>
  );
};

export default CoachRegistrationPage;
