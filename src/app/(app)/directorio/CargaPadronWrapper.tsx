"use client";

import { useRouter } from "next/navigation";
import CargaPadron from "@/components/CargaPadron";

export default function CargaPadronWrapper() {
  const router = useRouter();

  return (
    <CargaPadron onRefresh={() => router.refresh()} />
  );
}
