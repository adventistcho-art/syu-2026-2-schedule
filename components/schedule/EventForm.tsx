"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEventSchema, type CreateEventInput } from "@/lib/schedule/schemas";
import { useWriteAccess } from "@/lib/schedule/useWriteAccess";

type Props = {
  department: string;
};

export default function EventForm({ department }: Props) {
  const queryClient = useQueryClient();
  const { data: writeAccess, isLoading: writeLoading } = useWriteAccess();
  const canWrite = Boolean(writeAccess?.allowed);
  const {

    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      dept: department,
      category: "DEPT",
      title: "",
      startDate: "",
      endDate: "",
      location: "",
      description: "",
    },
  });

  useEffect(() => {
    setValue("dept", department);
    setValue("category", "DEPT");
  }, [department, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: CreateEventInput) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          category: "DEPT",
          dept: department,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ? JSON.stringify(err.error) : "등록 실패");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      reset({
        dept: department,
        category: "DEPT",
        title: "",
        startDate: "",
        endDate: "",
        location: "",
        description: "",
      });
    },
  });

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="px-5 py-4 bg-[#003366] text-white rounded-t-xl">
        <p className="font-bold">부서별 일정 및 행사 데이터 등록</p>
        <p className="text-xs text-white/70 mt-1">
          등록하면 즉시 전체 캘린더에 반영됩니다.
        </p>
      </div>
      {writeAccess && !writeAccess.allowed && (
        <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          일정 입력은 교내망(
          {writeAccess.range || "210.94.224.1 ~ 210.94.255.254"})에서만
          가능합니다.
          {writeAccess.ip ? (
            <span className="block text-xs text-amber-800/80 mt-1">
              현재 접속 IP: {writeAccess.ip}
            </span>
          ) : null}
        </div>
      )}
      <form
        onSubmit={handleSubmit((data) => {
          if (!canWrite) return;
          mutation.mutate(data);
        })}
        className={`p-6 grid grid-cols-1 md:grid-cols-2 gap-4 ${
          !canWrite && !writeLoading ? "opacity-60" : ""
        }`}
      >
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-1">작성 부서명 *</label>
          <input
            {...register("dept")}
            readOnly
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
          />
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            현재 로그인한 부서로만 작성할 수 있습니다. 다른 부서 일정을
            등록하려면 로그아웃 후 해당 부서로 다시 로그인해 주세요.
          </p>
        </div>
        <input type="hidden" {...register("category")} value="DEPT" />

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-1">일정/행사명 *</label>
          <input
            {...register("title")}
            disabled={!canWrite}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="예: Capstone Design 경진대회"
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
            disabled={!canWrite}
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
            disabled={!canWrite}
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
            disabled={!canWrite}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="예: 대강당"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-1">사업개요</label>
          <textarea
            rows={3}
            {...register("description")}
            disabled={!canWrite}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="사업 목적, 대상, 주요 내용 등"
          />
        </div>

        {mutation.isError && (
          <p className="md:col-span-2 text-sm text-red-600">
            {(mutation.error as Error).message}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="md:col-span-2 text-sm text-green-600">
            전체 캘린더에 등록되었습니다.
          </p>
        )}

        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={!canWrite}
            onClick={() =>
              reset({
                dept: department,
                category: "DEPT",
                title: "",
                startDate: "",
                endDate: "",
                location: "",
                description: "",
              })
            }
            className="px-4 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
          >
            초기화
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !canWrite || writeLoading}
            className="px-5 py-2 text-sm rounded-lg bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50"
          >
            {mutation.isPending ? "저장 중..." : "일정 등록"}
          </button>
        </div>
      </form>
    </div>
  );
}
