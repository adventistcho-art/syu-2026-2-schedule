"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEventSchema, type CreateEventInput } from "@/lib/schedule/schemas";
import { CATEGORY_LABEL, type EventCategory } from "@/lib/schedule/constants";

type Props = {
  department: string;
  isAdmin: boolean;
};

const DEPT_OPTIONS = [
  "교무처",
  "교목처",
  "학생복지처",
  "입학처",
  "기획처",
  "산학협력단",
  "총학생회",
  "컴퓨터공학과",
  "간호학과",
  "기타 부서/학과",
];

export default function EventForm({ department, isAdmin }: Props) {
  const queryClient = useQueryClient();
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
  }, [department, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: CreateEventInput) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          dept: isAdmin ? data.dept : department,
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
          등록 시 부서 초안에만 저장됩니다. 전체 캘린더 반영은 아래「전체일정으로
          보내기」로 제출하세요.
        </p>
      </div>
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-sm font-semibold mb-1">작성 부서명 *</label>
          {isAdmin ? (
            <select
              {...register("dept")}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              {DEPT_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          ) : (
            <input
              {...register("dept")}
              readOnly
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
            />
          )}
          <p className="text-xs text-slate-500 mt-1">주부서 기준 (세션 연동)</p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">일정 카테고리 *</label>
          <select
            {...register("category")}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            {(Object.keys(CATEGORY_LABEL) as EventCategory[])
              .filter((c) => c !== "HOLIDAY")
              .map((k) => (
                <option key={k} value={k}>
                  {CATEGORY_LABEL[k]}
                </option>
              ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-1">일정/행사명 *</label>
          <input
            {...register("title")}
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
          <label className="block text-sm font-semibold mb-1">장소 / 진행 방식</label>
          <input
            {...register("location")}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="예: 대강당 / ZOOM"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold mb-1">상세 내용 및 비고</label>
          <textarea
            rows={3}
            {...register("description")}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="행사 대상, 신청 방법 등"
          />
        </div>

        {mutation.isError && (
          <p className="md:col-span-2 text-sm text-red-600">
            {(mutation.error as Error).message}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="md:col-span-2 text-sm text-green-600">
            부서 초안에 추가되었습니다. 아래에서 확인 후 전체일정으로 보내세요.
          </p>
        )}

        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <button
            type="button"
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
            className="px-4 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200"
          >
            초기화
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-5 py-2 text-sm rounded-lg bg-[#003366] text-white hover:bg-[#002244] disabled:opacity-50"
          >
            {mutation.isPending ? "저장 중..." : "부서 초안에 추가"}
          </button>
        </div>
      </form>
    </div>
  );
}
