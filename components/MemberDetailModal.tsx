"use client";

import AdditionalDataRequestForm from "@/components/AdditionalDataRequestForm";
import MemberDetailContent from "@/components/MemberDetailContent";
import MemberForm from "@/components/MemberForm";
import { Person } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Edit2,
  ExternalLink,
  MessageSquarePlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "./DashboardContext";
import SyncFamilyButton from "./SyncFamilyButton";
import { useUser } from "./UserProvider";

export default function MemberDetailModal() {
  const {
    memberModalId: memberId,
    setMemberModalId,
    showCreateMember,
    setShowCreateMember,
    publishMemberMutation,
  } = useDashboard();
  const { isAdmin, isEditor: canEdit, profile, supabase } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRequestingUpdate, setIsRequestingUpdate] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [person, setPerson] = useState<Person | null>(null);
  const [privateData, setPrivateData] = useState<Record<string, unknown> | null>(
    null,
  );

  const closeModal = () => {
    setMemberModalId(null);
    setShowCreateMember(false);
    setIsEditing(false);
    setIsRequestingUpdate(false);
  };

  const fetchData = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const { data: personData, error: personError } = await supabase
          .from("persons")
          .select("*")
          .eq("id", id)
          .single();

        if (personError || !personData) {
          throw new Error("Không thể tải thông tin thành viên.");
        }
        setPerson(personData);

        if (isAdmin) {
          const { data: privData } = await supabase
            .from("person_details_private")
            .select("*")
            .eq("person_id", id)
            .single();
          setPrivateData(privData || {});
        } else {
          setPrivateData(null);
        }
      } catch (err) {
        console.error("Error fetching member details:", err);
        // @ts-expect-error err is unknown in catch
        setError(err?.message || "Đã xảy ra lỗi hệ thống.");
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, supabase],
  );

  useEffect(() => {
    if (memberId) {
      setIsOpen(true);
      setIsEditing(false);
      setIsRequestingUpdate(false);
      fetchData(memberId);
    } else if (showCreateMember) {
      setIsOpen(true);
      setIsEditing(false);
      setIsRequestingUpdate(false);
      setPerson(null);
      setPrivateData(null);
      setError(null);
    } else {
      setIsOpen(false);
      setTimeout(() => {
        setPerson(null);
        setPrivateData(null);
        setError(null);
        setIsEditing(false);
        setIsRequestingUpdate(false);
      }, 300);
    }
  }, [memberId, showCreateMember, fetchData]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleEditSuccess = (savedPersonId: string, savedPerson?: Person) => {
    setIsEditing(false);
    if (savedPerson) {
      setPerson(savedPerson);
      publishMemberMutation({
        kind: "upsert",
        source: "modal-edit",
        person: savedPerson,
      });
    }
    setPrivateData(null);
    void fetchData(savedPersonId);
  };

  const handleCreateSuccess = (savedPersonId: string, savedPerson?: Person) => {
    setShowCreateMember(false);
    setMemberModalId(savedPersonId);
    if (savedPerson) {
      setPerson(savedPerson);
      publishMemberMutation({
        kind: "upsert",
        source: "modal-create",
        person: savedPerson,
      });
    }
  };

  const formInitialData = person ? { ...person, ...(privateData ?? {}) } : undefined;
  const canOpenAdditionalDataRequest =
    !!person && !!profile && !isAdmin && !canEdit && !showCreateMember;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-sm"
        >
          {!isEditing && !showCreateMember && !isRequestingUpdate && (
            <div className="absolute inset-0 cursor-pointer" onClick={closeModal} />
          )}

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-stone-200"
          >
            <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 flex items-center gap-2">
              {(isEditing || isRequestingUpdate) && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setIsRequestingUpdate(false);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-stone-100/80 text-stone-700 rounded-full hover:bg-stone-200 font-semibold text-sm shadow-sm border border-stone-200/50 transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Quay lại</span>
                </button>
              )}

              {!isEditing && !isRequestingUpdate && canEdit && person && (
                <>
                  <Link
                    href={`/dashboard/members/${person.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-100/80 text-amber-800 rounded-full hover:bg-amber-200 font-semibold text-sm shadow-sm border border-amber-200/50 transition-colors"
                  >
                    <ExternalLink className="size-4" />
                    <span className="hidden sm:inline">Xem chi tiết</span>
                  </Link>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-100/80 text-amber-800 rounded-full hover:bg-amber-200 font-semibold text-sm shadow-sm border border-amber-200/50 transition-colors"
                  >
                    <Edit2 className="size-4" />
                    <span className="hidden sm:inline">Chỉnh sửa</span>
                  </button>
                  <SyncFamilyButton
                    personId={person.id}
                    personGeneration={person.generation}
                    personBranch={person.branch}
                    className="px-4 py-2 bg-emerald-100/80 text-emerald-800 rounded-full hover:bg-emerald-200 font-semibold shadow-sm border border-emerald-200/50"
                  />
                </>
              )}

              {!isEditing && !isRequestingUpdate && canOpenAdditionalDataRequest && (
                <button
                  onClick={() => setIsRequestingUpdate(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-sky-100/80 text-sky-800 rounded-full hover:bg-sky-200 font-semibold text-sm shadow-sm border border-sky-200/60 transition-colors"
                >
                  <MessageSquarePlus className="size-4" />
                  <span className="hidden sm:inline">Đề xuất bổ sung</span>
                </button>
              )}

              <button
                onClick={closeModal}
                className="size-10 flex items-center justify-center bg-stone-100/80 text-stone-600 rounded-full hover:bg-stone-200 hover:text-stone-900 shadow-sm border border-stone-200/50 transition-colors"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 min-h-[400px] flex items-center justify-center flex-col gap-4">
                <div className="size-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-stone-500 font-medium">Đang tải...</p>
              </div>
            ) : error ? (
              <div className="flex-1 min-h-[400px] flex items-center justify-center flex-col gap-4 p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 shadow-inner">
                  <AlertCircle className="size-8" />
                </div>
                <p className="text-red-600 font-medium text-lg">{error}</p>
                <button
                  onClick={closeModal}
                  className="mt-2 px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-full transition-colors"
                >
                  Đóng
                </button>
              </div>
            ) : isEditing && formInitialData ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8">
                <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">
                  Chỉnh sửa thành viên
                </h2>
                <MemberForm
                  initialData={
                    formInitialData as Parameters<typeof MemberForm>[0]["initialData"]
                  }
                  isEditing={true}
                  isAdmin={isAdmin}
                  onSuccess={handleEditSuccess}
                  onCancel={() => setIsEditing(false)}
                />
              </div>
            ) : isRequestingUpdate && person ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8">
                <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">
                  Gửi đề xuất bổ sung dữ liệu
                </h2>
                <AdditionalDataRequestForm
                  person={person}
                  onSuccess={() => {
                    setIsRequestingUpdate(false);
                  }}
                  onCancel={() => setIsRequestingUpdate(false)}
                />
              </div>
            ) : showCreateMember ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8">
                <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">
                  Thêm thành viên mới
                </h2>
                <MemberForm
                  isAdmin={isAdmin}
                  onSuccess={handleCreateSuccess}
                  onCancel={closeModal}
                />
              </div>
            ) : person ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <MemberDetailContent
                  person={person}
                  privateData={privateData}
                  isAdmin={isAdmin}
                  canEdit={canEdit}
                  currentUserRole={profile?.role}
                />
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
