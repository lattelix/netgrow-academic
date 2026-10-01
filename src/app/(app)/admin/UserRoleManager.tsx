"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Field";
import { ROLE_LABELS } from "@/lib/format";
import type { RoleCode } from "@/lib/db/types";

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  roleCode: RoleCode;
}

const ROLES: RoleCode[] = ["participant", "organizer", "admin"];

export function UserRoleManager({ users, currentUserId }: { users: UserItem[]; currentUserId: string }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function changeRole(id: string, roleCode: RoleCode) {
    setPendingId(id);
    try {
      await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleCode }),
      });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
            <th scope="col" className="py-2 pr-3 font-medium">
              Пользователь
            </th>
            <th scope="col" className="py-2 font-medium">
              Роль
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-[var(--color-border)] last:border-0">
              <td className="py-2 pr-3">
                <p className="font-medium">{u.fullName}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{u.email}</p>
              </td>
              <td className="py-2">
                <Select
                  aria-label={`Роль пользователя ${u.fullName}`}
                  value={u.roleCode}
                  disabled={pendingId === u.id || u.id === currentUserId}
                  onChange={(e) => changeRole(u.id, e.target.value as RoleCode)}
                  className="w-auto"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
