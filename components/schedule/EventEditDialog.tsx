"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { createEventSchema, type CreateEventInput } from "@/lib/schedule/schemas";
import { CATEGORY_LABEL, type EventCategory } from "@/lib/schedule/constants";
import type { ScheduleEvent } from "@/lib/schedule/types";
import { toDateKey } from "@/lib/schedule/types";

type Props = {
  event: ScheduleEvent | null;
  isAdmin: boolean;
  onClose: () => void;
  onSaved?: (event: ScheduleEvent) => void;
};

export default function EventEditDialog({
  event,
  isAdmin,
  onClose,
  onSaved,
}: Props) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
  });

  useEffect(() => {
    if (!event) return;
    reset({
      title: event.title,
      category: event.category,
      dept: event.dept,
      startDate: toDateKey(event.startDate),
      endDate: toDateKey(event.endDate),
      location: event.location ?? "",
      description: event.description ?? "",
    });
  }, [event, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CreateEventInput) => {
      if (!event) throw new Error("일정 없음");
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : JSON.stringify(body.error ?? "수정 실패")
        );
      }
      return body as ScheduleEvent;
    },
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      onSaved?.(updated);
      onClose();
    },
  });

  if (!event) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">일정 수정</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {event.status === "DRAFT" ? "부서 초안" : "전체일정"} · {event.dept}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {isAdmin && (
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">부서</label>
              <input
                {...register("dept")}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}
          {!isAdmin && <input type="hidden" {...register("dept")} />}

          <div>
            <label className="block text-sm font-semibold mb-1">카테고리</label>
            <select
              {...register("category")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              {(Object.keys(CATEGORY_LABEL) as EventCategory[]).map((k) => (
                <option key={k} value={k}>
                  {CATEGORY_LABEL[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">일정명 *</label>
            <input
              {...register("title")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">시작일 *</label>
            <input
              type="date"
              min="2026-09-01"
              max="2027-02-28"
              {...register("startDate")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            {errors.startDate && (
              <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">종료일 *</label>
            <input
              type="date"
              min="2026-09-01"
              max="2027-02-28"
              {...register("endDate")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            {errors.endDate && (
              <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">장소</label>
            <input
              {...register("location")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-1">상세 내용</label>
            <textarea
              rows={3}
              {...register("description")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {mutation.isError && (
            <p className="md:col-span-2 text-sm text-red-600">
              {(mutation.error as Error).message}
            </p>
          )}

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-5 py-2 text-sm rounded-lg bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50"
            >
              {mutation.isPending ? "저장 중..." : "수정 저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
