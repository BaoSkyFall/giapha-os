"use client";

import {
  adminCreateUser,
  changeUserRole,
  deleteUser,
  resetUserPassword,
  toggleUserStatus,
} from "@/app/actions/user";
import config from "@/app/config";
import { AdminUserData, UserRole } from "@/types";
import {
  FALLBACK_BRANCH_OPTIONS,
  FALLBACK_GENERATION_OPTIONS,
} from "@/utils/auth/profile";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, Trash } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface AdminUserListProps {
  initialUsers: AdminUserData[];
  currentUserId: string;
}

interface Notification {
  message: string;
  type: "success" | "error" | "info";
}

type CreationMode = "basic" | "advanced";

const normalizeForSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export default function AdminUserList({
  initialUsers,
  currentUserId,
}: AdminUserListProps) {
  const [users, setUsers] = useState<AdminUserData[]>(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [createMode, setCreateMode] = useState<CreationMode>("basic");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDemo(window.location.hostname === config.demoDomain);
    }
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim();
    if (!query) return users;

    const normalizedQuery = normalizeForSearch(query);
    const queryDigits = query.replace(/\D/g, "");

    return users.filter((user) => {
      const fullName = normalizeForSearch(user.full_name ?? "");
      const phone = user.phone_number ?? "";
      const email = normalizeForSearch(user.email ?? "");
      const phoneDigits = phone.replace(/\D/g, "");

      if (fullName.includes(normalizedQuery)) return true;
      if (email.includes(normalizedQuery)) return true;
      if (phone.toLowerCase().includes(query.toLowerCase())) return true;
      if (queryDigits && phoneDigits.includes(queryDigits)) return true;
      return false;
    });
  }, [searchTerm, users]);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (isDemo) {
      showNotification(
        "Đây là tài khoản demo cho mọi người sử dụng, vui lòng không thay đổi thông tin này.",
        "info",
      );
      return;
    }
    try {
      setLoadingId(userId);
      const result = await changeUserRole(userId, newRole);

      if (result?.error) {
        showNotification(result.error, "error");
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      showNotification("Đã cập nhật vai trò người dùng thành công.", "success");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Lỗi không xác định khi đổi quyền.";
      showNotification(message, "error");
    } finally {
      setLoadingId(null);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: boolean) => {
    if (isDemo) {
      showNotification(
        "Đây là tài khoản demo cho mọi người sử dụng, vui lòng không thay đổi thông tin này.",
        "info",
      );
      return;
    }
    try {
      setLoadingId(userId);
      const result = await toggleUserStatus(userId, newStatus);

      if (result?.error) {
        showNotification(result.error, "error");
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: newStatus } : u)),
      );
      showNotification(
        `Đã ${newStatus ? "kích hoạt" : "vô hiệu hóa"} người dùng thành công.`,
        "success",
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Lỗi không xác định khi đổi trạng thái.";
      showNotification(message, "error");
    } finally {
      setLoadingId(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (isDemo) {
      showNotification(
        "Đây là tài khoản demo cho mọi người sử dụng, vui lòng không thay đổi thông tin này.",
        "info",
      );
      return;
    }

    if (
      !window.confirm(
        "Đặt lại mật khẩu tài khoản này về mặc định 000000?",
      )
    ) {
      return;
    }

    try {
      setLoadingId(userId);
      const result = await resetUserPassword(userId);

      if (result?.error) {
        showNotification(result.error, "error");
        return;
      }

      showNotification(
        "Đã đặt lại mật khẩu mặc định: 000000.",
        "success",
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Lỗi không xác định khi đặt lại mật khẩu.";
      showNotification(message, "error");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (isDemo) {
      showNotification(
        "Đây là tài khoản demo cho mọi người sử dụng, vui lòng không thay đổi thông tin này.",
        "info",
      );
      return;
    }

    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa người dùng này khỏi hệ thống vĩnh viễn không?",
      )
    ) {
      return;
    }

    try {
      setLoadingId(userId);
      const result = await deleteUser(userId);

      if (result?.error) {
        showNotification(result.error, "error");
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showNotification("Đã xóa người dùng thành công.", "success");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Lỗi không xác định khi xóa người dùng.";
      showNotification(message, "error");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDemo) {
      showNotification(
        "Đây là trang demo, chức năng tạo người dùng bị hạn chế.",
        "info",
      );
      setIsCreateModalOpen(false);
      return;
    }

    setIsCreating(true);
    const formData = new FormData(event.currentTarget);
    formData.set("creation_mode", createMode);

    try {
      const result = await adminCreateUser(formData);

      if (result?.error) {
        showNotification(result.error, "error");
        return;
      }

      showNotification(
        createMode === "advanced"
          ? "Tạo tài khoản thành công. Người dùng có thể đăng nhập ngay, không cần onboarding. Mật khẩu mặc định: 000000."
          : "Tạo tài khoản thành công. Mật khẩu mặc định: 000000.",
        "success",
      );
      setIsCreateModalOpen(false);
      setTimeout(() => window.location.reload(), 1200);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Lỗi không xác định khi tạo người dùng.";
      showNotification(message, "error");
    } finally {
      setIsCreating(false);
    }
  };

  const openCreateModal = () => {
    setCreateMode("basic");
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-1/2 left-1/2 z-100 px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 min-w-[320px] max-w-[90vw] ${
              notification.type === "success"
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-800"
                : notification.type === "error"
                  ? "bg-red-50/90 border-red-200 text-red-800"
                  : "bg-amber-50/90 border-amber-200 text-amber-800"
            }`}
          >
            <p className="text-sm font-medium">{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm theo tên hoặc số điện thoại..."
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Thêm người dùng
        </button>
      </div>

      <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b border-stone-200/60 bg-stone-50/50">
              <tr>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">
                  Tên
                </th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">
                  Số điện thoại
                </th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">
                  Vai trò
                </th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">
                  Ngày tạo
                </th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs text-right">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-stone-50/80 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-stone-900">
                      {user.full_name?.trim() || "Chưa cập nhật"}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">{user.email}</p>
                  </td>
                  <td className="px-6 py-4 text-stone-700">
                    {user.phone_number?.trim() || "Chưa cập nhật"}
                  </td>
                  <td className="px-6 py-4">
                    {user.id === currentUserId ? (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : user.role === "editor"
                              ? "bg-sky-100 text-sky-800 border border-sky-200"
                              : "bg-stone-100 text-stone-600 border border-stone-200"
                        }`}
                      >
                        {user.role}
                      </span>
                    ) : (
                      <select
                        value={user.role}
                        onChange={(event) =>
                          handleRoleChange(user.id, event.target.value as UserRole)
                        }
                        disabled={loadingId === user.id}
                        className="bg-stone-50 text-stone-700 border border-stone-200 text-xs rounded-md focus:ring-amber-500 focus:border-amber-500 px-2 py-1 hover:border-stone-300 transition-colors disabled:opacity-50 outline-none"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="member">Member</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        user.is_active
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-stone-100 text-stone-800 border border-stone-200"
                      }`}
                    >
                      {user.is_active ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-stone-500">
                    {new Date(user.created_at).toLocaleDateString("vi-VN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.id !== currentUserId ? (
                      <div className="flex justify-end items-center gap-2">
                        <button
                          type="button"
                          disabled={loadingId === user.id}
                          onClick={() =>
                            handleStatusChange(user.id, !user.is_active)
                          }
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors disabled:opacity-50 ${
                            user.is_active
                              ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          }`}
                          title={
                            user.is_active
                              ? "Ban / Deactive tài khoản"
                              : "Kích hoạt lại tài khoản"
                          }
                        >
                          {user.is_active ? "Ban / Deactive" : "Kích hoạt"}
                        </button>
                        <button
                          type="button"
                          title="Đặt lại mật khẩu về 000000"
                          disabled={loadingId === user.id}
                          onClick={() => handleResetPassword(user.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                        >
                          <KeyRound className="size-3.5" />
                          Reset 000000
                        </button>
                        <button
                          type="button"
                          title="Xóa người dùng"
                          disabled={loadingId === user.id}
                          onClick={() => handleDelete(user.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        >
                          <Trash className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-stone-400 italic text-xs">Bạn</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-stone-500"
                  >
                    {searchTerm.trim()
                      ? "Không tìm thấy người dùng phù hợp."
                      : "Không có người dùng nào."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-stone-200/60 w-full max-w-xl overflow-hidden transform transition-all">
            <div className="px-6 py-5 border-b border-stone-100/80 flex justify-between items-center bg-stone-50/50">
              <h3 className="text-xl font-serif font-bold text-stone-800">
                Tạo người dùng mới
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors size-8 flex items-center justify-center hover:bg-stone-100 rounded-full"
              >
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6">
              <input type="hidden" name="creation_mode" value={createMode} />

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800 mb-4">
                Mật khẩu mặc định cho tài khoản mới: <strong>000000</strong>
              </div>

              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCreateMode("basic")}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    createMode === "basic"
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  Basic
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode("advanced")}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    createMode === "advanced"
                      ? "border-amber-500 bg-amber-500 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  Advanced
                </button>
              </div>

              <p className="mb-4 text-xs text-stone-500">
                {createMode === "basic"
                  ? "Basic: chỉ nhập số điện thoại. Người dùng sẽ hoàn thiện hồ sơ ở màn onboarding."
                  : "Advanced: nhập đầy đủ thông tin để bỏ qua màn onboarding."}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    required
                    className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="Ví dụ: 0912345678 hoặc +84912345678"
                  />
                </div>

                {createMode === "advanced" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        required={createMode === "advanced"}
                        className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                        placeholder="Nhập họ và tên"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          Năm sinh <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="birth_year"
                          required={createMode === "advanced"}
                          min={1900}
                          max={2100}
                          className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                          placeholder="1990"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          Tháng sinh
                        </label>
                        <input
                          type="number"
                          name="birth_month"
                          min={1}
                          max={12}
                          className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                          placeholder="1-12"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          Ngày sinh
                        </label>
                        <input
                          type="number"
                          name="birth_day"
                          min={1}
                          max={31}
                          className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                          placeholder="1-31"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          Nhánh <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="branch"
                          required={createMode === "advanced"}
                          className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Chọn nhánh
                          </option>
                          {FALLBACK_BRANCH_OPTIONS.map((branch) => (
                            <option key={branch} value={branch}>
                              {branch}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          Đời thứ <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="generation"
                          required={createMode === "advanced"}
                          className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Chọn đời
                          </option>
                          {FALLBACK_GENERATION_OPTIONS.map((generation) => (
                            <option key={generation} value={generation}>
                              Đời thứ {generation}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Địa chỉ
                      </label>
                      <input
                        type="text"
                        name="address"
                        className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                        placeholder="Địa chỉ hiện tại (không bắt buộc)"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Vai trò
                  </label>
                  <select
                    name="role"
                    className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    defaultValue="member"
                  >
                    <option value="member">Thành viên (Member)</option>
                    <option value="editor">Biên tập (Editor)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    name="is_active"
                    className="w-full px-3 py-2 sm:py-2.5 bg-white text-stone-900 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    defaultValue="true"
                  >
                    <option value="true">Đã duyệt (Active)</option>
                    <option value="false">Chờ duyệt (Pending)</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn-primary"
                >
                  {isCreating ? "Đang tạo..." : "Tạo người dùng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
